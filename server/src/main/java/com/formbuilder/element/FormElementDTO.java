package com.formbuilder.element;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.List;
import java.util.UUID;

public class FormElementDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private UUID id;
        private ElementType type;
        private String label;
        private String fieldName;
        private Integer sortOrder;
        private ElementConfiguration configuration;
        private UUID parentElementId;
        private UUID pageId;
        private List<Response> children;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        @NotNull(message = "Element type is required")
        private ElementType type;

        @NotBlank(message = "Label is required")
        @Size(max = 255, message = "Label must not exceed 255 characters")
        private String label;

        @NotBlank(message = "Field name is required")
        @Size(max = 100, message = "Field name must not exceed 100 characters")
        private String fieldName;

        private Integer sortOrder;
        private ElementConfiguration configuration;
        private UUID parentElementId;
        private UUID pageId;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        private ElementType type;

        @Size(max = 255, message = "Label must not exceed 255 characters")
        private String label;

        @Size(max = 100, message = "Field name must not exceed 100 characters")
        private String fieldName;

        private Integer sortOrder;
        private ElementConfiguration configuration;
        private UUID parentElementId;
        private UUID pageId;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReorderRequest {
        @NotNull(message = "Element IDs are required")
        private List<UUID> elementIds;
    }

    public static Response toResponse(FormElement element) {
        return Response.builder()
                .id(element.getId())
                .type(element.getType())
                .label(element.getLabel())
                .fieldName(element.getFieldName())
                .sortOrder(element.getSortOrder())
                .configuration(element.getConfiguration())
                .parentElementId(element.getParentElement() != null ? element.getParentElement().getId() : null)
                .pageId(element.getPage() != null ? element.getPage().getId() : null)
                .children(null)
                .build();
    }

    public static Response toTreeResponse(FormElement element) {
        List<Response> childResponses = null;
        if (element.getChildren() != null && !element.getChildren().isEmpty()) {
            childResponses = element.getChildren().stream()
                    .map(FormElementDTO::toTreeResponse)
                    .toList();
        }

        return Response.builder()
                .id(element.getId())
                .type(element.getType())
                .label(element.getLabel())
                .fieldName(element.getFieldName())
                .sortOrder(element.getSortOrder())
                .configuration(element.getConfiguration())
                .parentElementId(element.getParentElement() != null ? element.getParentElement().getId() : null)
                .pageId(element.getPage() != null ? element.getPage().getId() : null)
                .children(childResponses)
                .build();
    }
}
