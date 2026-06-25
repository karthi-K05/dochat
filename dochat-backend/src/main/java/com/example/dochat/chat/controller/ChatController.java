package com.example.dochat.chat.controller;

import com.example.dochat.auth.entity.User;
import com.example.dochat.chat.dto.ChatRequest;
import com.example.dochat.chat.dto.ChatResponse;
import com.example.dochat.chat.dto.SessionResponse;
import com.example.dochat.chat.entity.ChatMessage;
import com.example.dochat.chat.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    // POST /api/v1/chat/sessions — create new session
    @PostMapping("/sessions")
    public ResponseEntity<SessionResponse> createSession(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String title) {
        return ResponseEntity.ok(chatService.createSession(user, title));
    }

    // GET /api/v1/chat/sessions — list all sessions
    @GetMapping("/sessions")
    public ResponseEntity<List<SessionResponse>> getSessions(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(chatService.getSessions(user));
    }

    // GET /api/v1/chat/sessions/{sessionId}/messages
    @GetMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<List<ChatMessage>> getMessages(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(chatService.getMessages(sessionId, user));
    }

    // POST /api/v1/chat/sessions/{sessionId}/message — ask a question
    @PostMapping("/sessions/{sessionId}/message")
    public ResponseEntity<ChatResponse> chat(
            @PathVariable UUID sessionId,
            @Valid @RequestBody ChatRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(chatService.chat(sessionId, request, user));
    }

    // DELETE /api/v1/chat/sessions/{sessionId}
    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<Void> deleteSession(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal User user) {
        chatService.deleteSession(sessionId, user);
        return ResponseEntity.noContent().build();
    }
}