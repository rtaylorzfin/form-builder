package com.formbuilder.submission;

import com.formbuilder.form.FormDTO;
import com.formbuilder.form.FormService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/public/forms")
@RequiredArgsConstructor
@Tag(name = "Public Forms", description = "Public form endpoints (no auth required)")
public class PublicFormController {

    private final FormService formService;
    private final SubmissionService submissionService;

    @GetMapping("/{id}")
    @Operation(summary = "Get published form for public viewing")
    public ResponseEntity<FormDTO.Response> getPublishedForm(@PathVariable UUID id) {
        return ResponseEntity.ok(formService.getPublishedForm(id));
    }

    @PostMapping("/{id}/submit")
    @Operation(summary = "Submit a form response")
    public ResponseEntity<SubmissionDTO.Response> submitForm(
            @PathVariable UUID id,
            @Valid @RequestBody SubmissionDTO.CreateRequest request,
            HttpServletRequest httpRequest) {

        String ipAddress = getClientIpAddress(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");

        SubmissionDTO.Response response = submissionService.createSubmission(id, request, ipAddress, userAgent);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
