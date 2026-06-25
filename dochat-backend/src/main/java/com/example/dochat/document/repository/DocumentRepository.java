package com.example.dochat.document.repository;

import com.example.dochat.document.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DocumentRepository extends JpaRepository<Document, UUID> {

    List<Document> findByUploadedByOrderByCreatedAtDesc(String uploadedBy);

    List<Document> findByStatus(Document.DocumentStatus status);

    long countByUploadedByAndStatus(String uploadedBy, Document.DocumentStatus status);
}