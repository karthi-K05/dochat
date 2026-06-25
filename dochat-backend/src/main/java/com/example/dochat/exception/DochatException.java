package com.example.dochat.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class DochatException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;

    public DochatException(String message, HttpStatus status, String errorCode) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
    }

    // Common factory methods
    public static DochatException notFound(String message) {
        return new DochatException(message, HttpStatus.NOT_FOUND, "NOT_FOUND");
    }

    public static DochatException badRequest(String message) {
        return new DochatException(message, HttpStatus.BAD_REQUEST, "BAD_REQUEST");
    }

    public static DochatException internal(String message) {
        return new DochatException(message, HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR");
    }
}