package com.formbuilder.element;

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
@RequestMapping("/api/forms/{formId}/elements")
@RequiredArgsConstructor
@Tag(name = "Form Elements", description = "Form element management endpoints")
public class FormElementController {

    private final FormElementService elementService;

    @GetMapping
    @Operation(summary = "Get all elements for a form")
    public ResponseEntity<List<FormElementDTO.Response>> getElements(@PathVariable UUID formId) {
        return ResponseEntity.ok(elementService.getElements(formId));
    }

    @PostMapping
    @Operation(summary = "Add element to form")
    public ResponseEntity<FormElementDTO.Response> createElement(
            @PathVariable UUID formId,
            @Valid @RequestBody FormElementDTO.CreateRequest request) {
        FormElementDTO.Response response = elementService.createElement(formId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{elementId}")
    @Operation(summary = "Update an element")
    public ResponseEntity<FormElementDTO.Response> updateElement(
            @PathVariable UUID formId,
            @PathVariable UUID elementId,
            @Valid @RequestBody FormElementDTO.UpdateRequest request) {
        return ResponseEntity.ok(elementService.updateElement(formId, elementId, request));
    }

    @DeleteMapping("/{elementId}")
    @Operation(summary = "Delete an element")
    public ResponseEntity<Void> deleteElement(
            @PathVariable UUID formId,
            @PathVariable UUID elementId) {
        elementService.deleteElement(formId, elementId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/reorder")
    @Operation(summary = "Reorder elements")
    public ResponseEntity<List<FormElementDTO.Response>> reorderElements(
            @PathVariable UUID formId,
            @Valid @RequestBody FormElementDTO.ReorderRequest request) {
        return ResponseEntity.ok(elementService.reorderElements(formId, request));
    }
}
