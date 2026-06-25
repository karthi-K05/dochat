package com.example.dochat.document.service;

import com.example.dochat.document.entity.Document;
import com.example.dochat.document.repository.DocumentRepository;
import com.example.dochat.exception.DochatException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.DocumentReader;
import org.springframework.ai.reader.ExtractedTextFormatter;
import org.springframework.ai.reader.pdf.PagePdfDocumentReader;
import org.springframework.ai.reader.pdf.config.PdfDocumentReaderConfig;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentIngestionService {

    private final DocumentRepository documentRepository;
    private final VectorStore vectorStore;
    private final OcrService ocrService;

    @Value("${app.document.chunk-size:1000}")
    private int chunkSize;

    @Value("${app.document.chunk-overlap:200}")
    private int chunkOverlap;

    private static final List<String> ALLOWED_TYPES = List.of(
            "application/pdf"
    );

    /**
     * Step 1 — Validate and save document metadata, then trigger async ingestion.
     */
    @Transactional
    public Document initiateUpload(MultipartFile file, String uploadedBy) throws IOException {

        // Validate file type
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw DochatException.badRequest("Only PDF files are supported. Got: " + contentType);
        }

        // Validate file size (50MB)
        if (file.getSize() > 50 * 1024 * 1024) {
            throw DochatException.badRequest("File size exceeds 50MB limit");
        }

        // Save document record in PENDING state
        Document document = Document.builder()
                .fileName(UUID.randomUUID() + "_" + file.getOriginalFilename())
                .originalName(file.getOriginalFilename())
                .fileSize(file.getSize())
                .mimeType(contentType)
                .uploadedBy(uploadedBy)
                .status(Document.DocumentStatus.PENDING)
                .build();

        document = documentRepository.save(document);
        log.info("Document record created: {} for user: {}", document.getId(), uploadedBy);

        // Trigger async ingestion with file bytes (read before async so stream doesn't close)
        byte[] fileBytes = file.getBytes();
        ingestAsync(document.getId(), fileBytes, file.getOriginalFilename());

        return document;
    }

    /**
     * Step 2 — Async: parse PDF → chunk → embed locally → store in pgvector
     */
    @Async
    @Transactional
    public void ingestAsync(UUID documentId, byte[] fileBytes, String fileName) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> DochatException.notFound("Document not found: " + documentId));

        try {
            document.setStatus(Document.DocumentStatus.PROCESSING);
            documentRepository.save(document);

            // Step 1 — Try normal text extraction first
            ByteArrayResource resource = new ByteArrayResource(fileBytes) {
                @Override public String getFilename() { return fileName; }
            };

            PagePdfDocumentReader reader = new PagePdfDocumentReader(
                    resource,
                    PdfDocumentReaderConfig.builder()
                            .withPageTopMargin(0)
                            .withPageBottomMargin(0)
                            .withPageExtractedTextFormatter(
                                    ExtractedTextFormatter.builder()
                                            .withNumberOfBottomTextLinesToDelete(0)
                                            .withNumberOfTopPagesToSkipBeforeDelete(0)
                                            .build()
                            )
                            .withPagesPerDocument(1)
                            .build()
            );

            List<org.springframework.ai.document.Document> rawDocs = reader.get();

            // Step 2 — Auto-detect if scanned and run OCR if needed
            if (ocrService.isScannedPdf(rawDocs)) {
                log.info("Scanned PDF detected for: {} — switching to OCR", fileName);
                rawDocs = extractWithOcr(fileBytes, fileName, document);
            } else {
                // Filter out blank pages from normal extraction
                rawDocs = rawDocs.stream()
                        .filter(d -> d.getText() != null && !d.getText().isBlank())
                        .toList();
            }

            log.info("Extracted {} pages from: {}", rawDocs.size(), fileName);

            if (rawDocs.isEmpty()) {
                throw new RuntimeException("Could not extract any text from PDF");
            }

            // Step 3 — Chunk
            TokenTextSplitter splitter = new TokenTextSplitter(chunkSize, chunkOverlap, 5, 10000, true);
            List<org.springframework.ai.document.Document> chunks = splitter.apply(rawDocs);
            log.info("Split into {} chunks", chunks.size());

            // Step 4 — Tag metadata
            chunks.forEach(chunk -> chunk.getMetadata().putAll(Map.of(
                    "document_id", documentId.toString(),
                    "uploaded_by", document.getUploadedBy(),   // ← this must be the user's email
                    "file_name", document.getOriginalName()
            )));

            // Step 5 — Store in pgvector
            vectorStore.add(chunks);

            document.setStatus(Document.DocumentStatus.COMPLETED);
            document.setChunkCount(chunks.size());
            documentRepository.save(document);

        } catch (Exception e) {
            log.error("Failed to ingest document: {}", documentId, e);
            document.setStatus(Document.DocumentStatus.FAILED);
            document.setErrorMessage(e.getMessage());
            documentRepository.save(document);
        }
    }

    /**
     * OCR fallback — converts PDF pages to images and runs Tesseract
     */
    private List<org.springframework.ai.document.Document> extractWithOcr(
            byte[] fileBytes, String fileName, Document document) throws IOException {

        List<String> pageTexts = ocrService.extractTextFromScannedPdf(
                new ByteArrayInputStream(fileBytes));

        List<org.springframework.ai.document.Document> docs = new ArrayList<>();
        for (int i = 0; i < pageTexts.size(); i++) {
            String text = pageTexts.get(i);
            if (text != null && !text.isBlank()) {
                org.springframework.ai.document.Document doc =
                        new org.springframework.ai.document.Document(text);
                doc.getMetadata().put("page_number", String.valueOf(i + 1));
                doc.getMetadata().put("source", fileName);
                doc.getMetadata().put("file_name", fileName);
                doc.getMetadata().put("uploaded_by", document.getUploadedBy()); // ← critical
                doc.getMetadata().put("document_id", document.getId().toString());
                doc.getMetadata().put("ocr", "true");
                docs.add(doc);
            }
        }
        return docs;
    }

    public List<Document> getDocumentsByUser(String uploadedBy) {
        return documentRepository.findByUploadedByOrderByCreatedAtDesc(uploadedBy);
    }

    public Document getDocumentById(UUID id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> DochatException.notFound("Document not found: " + id));
    }

    @Transactional
    public void deleteDocument(UUID id, String requestedBy) {
        Document document = getDocumentById(id);
        if (!document.getUploadedBy().equals(requestedBy)) {
            throw DochatException.badRequest("You can only delete your own documents");
        }
        documentRepository.delete(document);
        log.info("Deleted document: {} by user: {}", id, requestedBy);
    }
}