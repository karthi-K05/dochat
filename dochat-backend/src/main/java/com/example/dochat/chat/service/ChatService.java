package com.example.dochat.chat.service;

import com.example.dochat.auth.entity.User;
import com.example.dochat.chat.dto.ChatRequest;
import com.example.dochat.chat.dto.ChatResponse;
import com.example.dochat.chat.dto.SessionResponse;
import com.example.dochat.chat.entity.ChatMessage;
import com.example.dochat.chat.entity.ChatSession;
import com.example.dochat.chat.repository.ChatMessageRepository;
import com.example.dochat.chat.repository.ChatSessionRepository;
import com.example.dochat.exception.DochatException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private final VectorStore vectorStore;
    private final ChatModel chatModel; // Spring Boot automatically binds OllamaChatModel here
    private final ChatSessionRepository sessionRepository;
    private final ChatMessageRepository messageRepository;


    private static final String SYSTEM_PROMPT = """
        You are DoChat, an expert document analyst and intelligent assistant.
        
        Your job is to provide insightful, well-structured answers about uploaded documents.
        You combine what is explicitly stated in the documents with intelligent reasoning
        and domain knowledge to give complete, useful responses.
        
        GUIDELINES:
        1. Always ground your answer in the document content first.
        2. When the document doesn't explicitly cover something (like future scope,
           recommendations, or implications), use intelligent reasoning based on
           what IS in the document to provide a thoughtful, substantive answer.
        3. Clearly distinguish between what the document states directly vs what
           you are inferring or recommending based on it.
        4. Structure your responses clearly with headers or numbered points
           when the question benefits from it.
        5. Be comprehensive but concise — give real value, not filler.
        6. Never say "I don't know" when you can reason from available context.
        7. If the document has absolutely zero relevance to the question,
           say so clearly and briefly.
        
        TONE: Professional, knowledgeable, and helpful — like a senior consultant
        who has read the document thoroughly and is briefing a stakeholder.
        """;

    /**
     * Create a new chat session for the user
     */
    @Transactional
    public SessionResponse createSession(User user, String title) {
        ChatSession session = ChatSession.builder()
                .userId(user.getId())
                .title(title != null ? title : "New Chat")
                .build();
        session = sessionRepository.save(session);
        log.info("Created chat session: {} for user: {}", session.getId(), user.getEmail());
        return SessionResponse.from(session);
    }

    /**
     * Get all sessions for a user
     */
    public List<SessionResponse> getSessions(User user) {
        return sessionRepository.findByUserIdOrderByUpdatedAtDesc(user.getId())
                .stream()
                .map(SessionResponse::from)
                .toList();
    }

    /**
     * Get all messages in a session
     */
    public List<ChatMessage> getMessages(UUID sessionId, User user) {
        sessionRepository.findByIdAndUserId(sessionId, user.getId())
                .orElseThrow(() -> DochatException.notFound("Session not found: " + sessionId));
        return messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
    }

    /**
     * Core RAG chat method
     * 1. Retrieve relevant chunks from pgvector
     * 2. Build prompt with context
     * 3. Call local Ollama LLM
     * 4. Save conversation history
     */
    @Transactional
    public ChatResponse chat(UUID sessionId, ChatRequest request, User user) {

        // Validate session belongs to user
        ChatSession session = sessionRepository.findByIdAndUserId(sessionId, user.getId())
                .orElseThrow(() -> DochatException.notFound("Session not found: " + sessionId));

        String question = request.getQuestion();

        // Step 1 — Similarity search in pgvector
        // Filter by user's documents only and optimize prompt size for local generation
        // Step 1 — Direct SQL search (bypasses Spring AI embedding mismatch)
        // Step 1 — Get more results than needed to account for filtering
        FilterExpressionBuilder b = new FilterExpressionBuilder();

        String userEmail = user.getEmail();

        List<Document> relevantDocs = vectorStore.similaritySearch(
                SearchRequest.builder()
                        .query(question)
                        .topK(5)
                        .similarityThreshold(0.0)
                        .filterExpression(b.eq("uploaded_by", userEmail).build())
                        .build()
        );

        log.info("Vector search: user_filtered={}, user={}",
                relevantDocs.size(), userEmail);

        if (relevantDocs.isEmpty()) {
            log.warn("No user-scoped chunks found for user: {}", userEmail);
            return ChatResponse.builder()
                    .sessionId(sessionId)
                    .question(question)
                    .answer("I couldn't find any relevant information in your uploaded documents. " +
                            "Please make sure you have uploaded documents related to your question.")
                    .sourcesUsed(0)
                    .timestamp(LocalDateTime.now())
                    .build();
        }
        // Step 3 — Build context
        String context = relevantDocs.stream()
                .map(Document::getText)
                .collect(Collectors.joining("\n\n---\n\n"));

        // Step 3 — Build prompt with context
        String prompt = """
        %s
        
        --- DOCUMENT CONTEXT ---
        %s
        --- END CONTEXT ---
        
        User Question: %s
        
        Provide a thorough, well-structured answer. Where the document provides
        explicit information, cite it. Where reasoning or inference is needed
        to fully answer the question, apply your expertise while staying grounded
        in the document's themes and content.
        
        Answer:
        """.formatted(SYSTEM_PROMPT, context, question);

        // Step 4 — Call Local Ollama Model
        String answer = ChatClient.create(chatModel)
                .prompt()
                .user(prompt)
                .call()
                .content();

        log.info("Generated answer for session: {}", sessionId);

        // Step 5 — Save user message
        messageRepository.save(ChatMessage.builder()
                .session(session)
                .role("user")
                .content(question)
                .build());

        // Step 6 — Save assistant message
        messageRepository.save(ChatMessage.builder()
                .session(session)
                .role("assistant")
                .content(answer)
                .build());

        // Update session title from first question if default
        if ("New Chat".equals(session.getTitle()) && question.length() > 0) {
            session.setTitle(question.length() > 50
                    ? question.substring(0, 50) + "..."
                    : question);
            sessionRepository.save(session);
        }

        return ChatResponse.builder()
                .sessionId(sessionId)
                .question(question)
                .answer(answer)
                .sourcesUsed(relevantDocs.size())
                .timestamp(LocalDateTime.now())
                .build();
    }

    @Transactional
    public void deleteSession(UUID sessionId, User user) {
        ChatSession session = sessionRepository.findByIdAndUserId(sessionId, user.getId())
                .orElseThrow(() -> DochatException.notFound("Session not found: " + sessionId));
        sessionRepository.delete(session);
        log.info("Deleted session: {} for user: {}", sessionId, user.getEmail());
    }
}