package com.formbuilder.form;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/forms")
@RequiredArgsConstructor
@Tag(name = "Forms", description = "Form management endpoints")
public class FormController {

    private final FormService formService;

    @GetMapping
    @Operation(summary = "Get all forms")
    public ResponseEntity<List<FormDTO.ListResponse>> getAllForms() {
        return ResponseEntity.ok(formService.getAllForms());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get form by ID")
    public ResponseEntity<FormDTO.Response> getForm(@PathVariable UUID id) {
        return ResponseEntity.ok(formService.getForm(id));
    }

    @PostMapping
    @Operation(summary = "Create a new form")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<FormDTO.Response> createForm(@Valid @RequestBody FormDTO.CreateRequest request) {
        FormDTO.Response response = formService.createForm(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a form")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<FormDTO.Response> updateForm(
            @PathVariable UUID id,
            @Valid @RequestBody FormDTO.UpdateRequest request) {
        return ResponseEntity.ok(formService.updateForm(id, request));
    }

    @PostMapping("/{id}/publish")
    @Operation(summary = "Publish a form")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<FormDTO.Response> publishForm(@PathVariable UUID id) {
        return ResponseEntity.ok(formService.publishForm(id));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a form")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteForm(@PathVariable UUID id) {
        formService.deleteForm(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/export")
    @Operation(summary = "Export form definition as JSON")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<FormDTO.ExportResponse> exportForm(@PathVariable UUID id) {
        return ResponseEntity.ok(formService.exportForm(id));
    }

    @PostMapping("/import")
    @Operation(summary = "Import form definition from JSON")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<FormDTO.Response> importForm(@Valid @RequestBody FormDTO.ImportRequest request) {
        FormDTO.Response response = formService.importForm(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
