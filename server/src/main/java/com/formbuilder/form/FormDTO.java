package com.formbuilder.form;

import com.formbuilder.element.FormElementDTO;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class FormDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private UUID id;
        private String name;
        private String description;
        private FormStatus status;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private LocalDateTime publishedAt;
        private List<FormElementDTO.Response> elements;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ListResponse {
        private UUID id;
        private String name;
        private String description;
        private FormStatus status;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private int elementCount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        @jakarta.validation.constraints.NotBlank(message = "Form name is required")
        @jakarta.validation.constraints.Size(max = 255, message = "Form name must not exceed 255 characters")
        private String name;

        @jakarta.validation.constraints.Size(max = 2000, message = "Description must not exceed 2000 characters")
        private String description;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        @jakarta.validation.constraints.Size(max = 255, message = "Form name must not exceed 255 characters")
        private String name;

        @jakarta.validation.constraints.Size(max = 2000, message = "Description must not exceed 2000 characters")
        private String description;

        private FormStatus status;
    }
}
