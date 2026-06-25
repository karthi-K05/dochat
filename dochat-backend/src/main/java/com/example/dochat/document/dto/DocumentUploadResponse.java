package com.example.dochat.document.dto;


import com.example.dochat.document.entity.Document;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class DocumentUploadResponse {
    private UUID id;
    private String originalName;
    private Long fileSize;
    private String status;
    private LocalDateTime createdAt;

    public static DocumentUploadResponse from(Document doc) {
        return DocumentUploadResponse.builder()
                .id(doc.getId())
                .originalName(doc.getOriginalName())
                .fileSize(doc.getFileSize())
                .status(doc.getStatus().name())
                .createdAt(doc.getCreatedAt())
                .build();
    }
}