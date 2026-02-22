package com.formbuilder.form;

import com.formbuilder.element.ElementConfiguration;
import com.formbuilder.element.ElementType;
import com.formbuilder.element.FormElementDTO;
import com.formbuilder.page.FormPageDTO;
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
        private List<FormPageDTO.Response> pages;
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

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ExportResponse {
        private String name;
        private String description;
        private List<ExportPage> pages;
        private List<ExportElement> elements;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ExportPage {
        private Integer pageNumber;
        private String title;
        private String description;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ExportElement {
        private ElementType type;
        private String label;
        private String fieldName;
        private Integer sortOrder;
        private ElementConfiguration configuration;
        private Integer pageIndex;
        private List<ExportElement> children;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImportRequest {
        @jakarta.validation.constraints.NotBlank(message = "Form name is required")
        private String name;
        private String description;
        private List<ExportPage> pages;
        private List<ExportElement> elements;
    }
}
