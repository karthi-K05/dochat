package com.example.dochat.chat.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ChatResponse {
    private UUID sessionId;
    private String question;
    private String answer;
    private int sourcesUsed;
    private LocalDateTime timestamp;
}