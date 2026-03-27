package com.formbuilder.form;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.fasterxml.jackson.dataformat.yaml.YAMLGenerator;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
    @Operation(summary = "Export form definition as JSON or YAML (use ?format=yaml)")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> exportForm(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "json") String format) {
        FormDTO.ExportResponse export = formService.exportForm(id);

        if ("yaml".equalsIgnoreCase(format) || "yml".equalsIgnoreCase(format)) {
            try {
                ObjectMapper yamlMapper = new ObjectMapper(
                        new YAMLFactory()
                                .disable(YAMLGenerator.Feature.WRITE_DOC_START_MARKER)
                                .enable(YAMLGenerator.Feature.MINIMIZE_QUOTES)
                                .enable(YAMLGenerator.Feature.LITERAL_BLOCK_STYLE));
                yamlMapper.findAndRegisterModules();
                yamlMapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);
                String yaml = yamlMapper.writeValueAsString(export);
                return ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_TYPE, "text/yaml; charset=UTF-8")
                        .body(yaml);
            } catch (Exception e) {
                throw new RuntimeException("Failed to serialize to YAML", e);
            }
        }

        return ResponseEntity.ok(export);
    }

    @PostMapping(value = "/import", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Import form definition from JSON")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<FormDTO.Response> importForm(@Valid @RequestBody FormDTO.ImportRequest request) {
        FormDTO.Response response = formService.importForm(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping(value = "/import/yaml", consumes = MediaType.ALL_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Import form definition from YAML")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<FormDTO.Response> importFormYaml(jakarta.servlet.http.HttpServletRequest httpRequest) {
        try {
            String yamlContent = new String(httpRequest.getInputStream().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
            ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());
            yamlMapper.findAndRegisterModules();
            FormDTO.ImportRequest request = yamlMapper.readValue(yamlContent, FormDTO.ImportRequest.class);
            FormDTO.Response response = formService.importForm(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse YAML: " + e.getMessage(), e);
        }
    }
}
