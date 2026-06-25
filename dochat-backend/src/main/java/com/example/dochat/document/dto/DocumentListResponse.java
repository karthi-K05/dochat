package com.example.dochat.document.dto;

import com.example.dochat.document.entity.Document;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class DocumentListResponse {
    private UUID id;
    private String originalName;
    private Long fileSize;
    private String mimeType;
    private String status;
    private Integer chunkCount;
    private LocalDateTime createdAt;

    public static DocumentListResponse from(Document doc) {
        return DocumentListResponse.builder()
                .id(doc.getId())
                .originalName(doc.getOriginalName())
                .fileSize(doc.getFileSize())
                .mimeType(doc.getMimeType())
                .status(doc.getStatus().name())
                .chunkCount(doc.getChunkCount())
                .createdAt(doc.getCreatedAt())
                .build();
    }
}