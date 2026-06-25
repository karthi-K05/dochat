//package com.example.dochat.config;
//
//import org.springframework.ai.embedding.EmbeddingModel;
//import org.springframework.ai.google.genai.;
//import org.springframework.ai.google.genai.embedding.GoogleGenAiTextEmbeddingModel;
//import org.springframework.ai.google.genai.GoogleGenAiTextEmbeddingOptions;
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.context.annotation.Bean;
//import org.springframework.context.annotation.Configuration;
//
//@Configuration
//public class EmbeddingConfig {
//
//    @Value("${spring.ai.google.genai.api-key}")
//    private String apiKey;
//
//    @Bean
//    public EmbeddingModel embeddingModel() {
//        // Correct API client for Gemini API Key usage
//        var googleGenAiApi = new GoogleGenAiApi(apiKey);
//
//        return new GoogleGenAiTextEmbeddingModel(
//                googleGenAiApi,
//                GoogleGenAiTextEmbeddingOptions.builder()
//                        .model("text-embedding-004")
//                        .build()
//        );
//    }
//}