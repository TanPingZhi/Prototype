package com.esmanager.controller;

import com.esmanager.model.ApiErrorResponse;
import com.esmanager.model.WorkflowApiException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(WorkflowApiException.class)
    public ResponseEntity<ApiErrorResponse> handleWorkflowException(WorkflowApiException exception) {
        ApiErrorResponse response = new ApiErrorResponse(exception.getMessage(),
                exception.getWorkflowId(),
                exception.getOperation(),
                exception.getStatus(),
                exception.getBody());
        return ResponseEntity.status(exception.getStatus()).body(response);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorResponse> handleIllegalArgument(IllegalArgumentException exception) {
        ApiErrorResponse response = new ApiErrorResponse(exception.getMessage(), null, null, HttpStatus.NOT_FOUND.value(), null);
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleGeneric(Exception exception) {
        ApiErrorResponse response = new ApiErrorResponse(exception.getMessage(), null, null, HttpStatus.INTERNAL_SERVER_ERROR.value(), null);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
