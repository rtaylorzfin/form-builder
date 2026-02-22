package com.formbuilder.page;

import com.formbuilder.element.FormElementDTO;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class FormPageDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private UUID id;
        private Integer pageNumber;
        private String title;
        private String description;
        private List<FormElementDTO.Response> elements;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        @Size(max = 255, message = "Title must not exceed 255 characters")
        private String title;

        private String description;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        @Size(max = 255, message = "Title must not exceed 255 characters")
        private String title;

        private String description;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReorderRequest {
        @NotNull(message = "Page IDs are required")
        private List<UUID> pageIds;
    }

    public static Response toResponse(FormPage page) {
        List<FormElementDTO.Response> elements = page.getElements() != null
                ? page.getElements().stream()
                    .filter(e -> e.getParentElement() == null)
                    .map(FormElementDTO::toTreeResponse)
                    .toList()
                : List.of();

        return Response.builder()
                .id(page.getId())
                .pageNumber(page.getPageNumber())
                .title(page.getTitle())
                .description(page.getDescription())
                .elements(elements)
                .createdAt(page.getCreatedAt())
                .updatedAt(page.getUpdatedAt())
                .build();
    }
}
