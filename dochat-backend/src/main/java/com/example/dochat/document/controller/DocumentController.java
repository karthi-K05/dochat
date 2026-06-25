package com.example.dochat.document.controller;

import com.example.dochat.document.dto.DocumentListResponse;
import com.example.dochat.document.dto.DocumentUploadResponse;
import com.example.dochat.document.entity.Document;
import com.example.dochat.document.service.DocumentIngestionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentIngestionService ingestionService;

    /**
     * POST /api/v1/documents/upload
     * Upload a PDF — returns immediately, ingestion happens async in background
     */
    @PostMapping("/upload")
    public ResponseEntity<DocumentUploadResponse> upload(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails userDetails) throws IOException {

        Document document = ingestionService.initiateUpload(file, userDetails.getUsername());
        return ResponseEntity.accepted()
                .body(DocumentUploadResponse.from(document));
    }

    /**
     * GET /api/v1/documents
     * List all documents for the current authenticated user
     */
    @GetMapping
    public ResponseEntity<List<DocumentListResponse>> listDocuments(
            @AuthenticationPrincipal UserDetails userDetails) {

        List<DocumentListResponse> docs = ingestionService
                .getDocumentsByUser(userDetails.getUsername())
                .stream()
                .map(DocumentListResponse::from)
                .toList();
        return ResponseEntity.ok(docs);
    }

    /**
     * GET /api/v1/documents/{id}
     * Get status of a specific document
     */
    @GetMapping("/{id}")
    public ResponseEntity<DocumentListResponse> getDocument(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {

        Document doc = ingestionService.getDocumentById(id);
        return ResponseEntity.ok(DocumentListResponse.from(doc));
    }

    /**
     * DELETE /api/v1/documents/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDocument(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {

        ingestionService.deleteDocument(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}