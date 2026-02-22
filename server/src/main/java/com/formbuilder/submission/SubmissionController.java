package com.formbuilder.submission;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/forms/{formId}/submissions")
@RequiredArgsConstructor
@Tag(name = "Submissions", description = "Form submission endpoints")
public class SubmissionController {

    private final SubmissionService submissionService;

    @GetMapping
    @Operation(summary = "Get submissions for a form")
    public ResponseEntity<SubmissionDTO.PageResponse> getSubmissions(
            @PathVariable UUID formId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(submissionService.getSubmissions(formId, page, size));
    }

    @GetMapping("/{submissionId}")
    @Operation(summary = "Get a single submission")
    public ResponseEntity<SubmissionDTO.Response> getSubmission(
            @PathVariable UUID formId,
            @PathVariable UUID submissionId) {
        return ResponseEntity.ok(submissionService.getSubmission(formId, submissionId));
    }

    @PutMapping("/{submissionId}")
    @Operation(summary = "Update a submission")
    public ResponseEntity<SubmissionDTO.Response> updateSubmission(
            @PathVariable UUID formId,
            @PathVariable UUID submissionId,
            @Valid @RequestBody SubmissionDTO.UpdateRequest request) {
        return ResponseEntity.ok(submissionService.updateSubmission(formId, submissionId, request));
    }

    @GetMapping("/export")
    @Operation(summary = "Export submissions as CSV")
    public ResponseEntity<String> exportSubmissions(@PathVariable UUID formId) {
        String csv = submissionService.exportSubmissionsCsv(formId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=submissions.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }
}
