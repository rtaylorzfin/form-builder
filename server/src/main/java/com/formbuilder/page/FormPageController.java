package com.formbuilder.page;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/forms/{formId}/pages")
@RequiredArgsConstructor
@Tag(name = "Form Pages", description = "Form page management endpoints")
public class FormPageController {

    private final FormPageService pageService;

    @GetMapping
    @Operation(summary = "Get all pages for a form")
    public ResponseEntity<List<FormPageDTO.Response>> getPages(@PathVariable UUID formId) {
        return ResponseEntity.ok(pageService.getPages(formId));
    }

    @PostMapping
    @Operation(summary = "Add page to form")
    public ResponseEntity<FormPageDTO.Response> createPage(
            @PathVariable UUID formId,
            @Valid @RequestBody FormPageDTO.CreateRequest request) {
        FormPageDTO.Response response = pageService.createPage(formId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{pageId}")
    @Operation(summary = "Update a page")
    public ResponseEntity<FormPageDTO.Response> updatePage(
            @PathVariable UUID formId,
            @PathVariable UUID pageId,
            @Valid @RequestBody FormPageDTO.UpdateRequest request) {
        return ResponseEntity.ok(pageService.updatePage(formId, pageId, request));
    }

    @DeleteMapping("/{pageId}")
    @Operation(summary = "Delete a page")
    public ResponseEntity<Void> deletePage(
            @PathVariable UUID formId,
            @PathVariable UUID pageId) {
        pageService.deletePage(formId, pageId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/reorder")
    @Operation(summary = "Reorder pages")
    public ResponseEntity<List<FormPageDTO.Response>> reorderPages(
            @PathVariable UUID formId,
            @Valid @RequestBody FormPageDTO.ReorderRequest request) {
        return ResponseEntity.ok(pageService.reorderPages(formId, request));
    }
}
