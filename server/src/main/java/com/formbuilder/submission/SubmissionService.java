package com.formbuilder.submission;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.formbuilder.element.ElementConfiguration;
import com.formbuilder.element.FormElement;
import com.formbuilder.exception.ResourceNotFoundException;
import com.formbuilder.exception.ValidationException;
import com.formbuilder.form.Form;
import com.formbuilder.form.FormRepository;
import com.formbuilder.form.FormStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SubmissionService {

    private final SubmissionRepository submissionRepository;
    private final FormRepository formRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public SubmissionDTO.PageResponse getSubmissions(UUID formId, int page, int size) {
        validateFormExists(formId);

        Page<Submission> submissionPage = submissionRepository.findByFormIdOrderBySubmittedAtDesc(
                formId, PageRequest.of(page, size));

        List<SubmissionDTO.Response> submissions = submissionPage.getContent().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return SubmissionDTO.PageResponse.builder()
                .submissions(submissions)
                .page(page)
                .size(size)
                .totalElements(submissionPage.getTotalElements())
                .totalPages(submissionPage.getTotalPages())
                .build();
    }

    @Transactional
    public SubmissionDTO.Response createSubmission(UUID formId, SubmissionDTO.CreateRequest request,
                                                    String ipAddress, String userAgent) {
        Form form = formRepository.findByIdWithElements(formId)
                .orElseThrow(() -> new ResourceNotFoundException("Form not found: " + formId));

        if (form.getStatus() != FormStatus.PUBLISHED) {
            throw new ValidationException("Form is not published");
        }

        validateSubmission(form, request.getData());

        String dataJson;
        try {
            dataJson = objectMapper.writeValueAsString(request.getData());
        } catch (JsonProcessingException e) {
            throw new ValidationException("Invalid submission data format");
        }

        Submission submission = Submission.builder()
                .form(form)
                .data(dataJson)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .build();

        Submission saved = submissionRepository.save(submission);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public String exportSubmissionsCsv(UUID formId) {
        Form form = formRepository.findByIdWithElements(formId)
                .orElseThrow(() -> new ResourceNotFoundException("Form not found: " + formId));

        List<Submission> submissions = submissionRepository.findByFormIdOrderBySubmittedAtDesc(formId);

        if (submissions.isEmpty()) {
            return "";
        }

        List<FormElement> elements = form.getElements();
        List<String> headers = new ArrayList<>();
        headers.add("Submission ID");
        headers.add("Submitted At");
        for (FormElement element : elements) {
            headers.add(element.getLabel());
        }

        StringBuilder csv = new StringBuilder();
        csv.append(headers.stream().map(this::escapeCsv).collect(Collectors.joining(","))).append("\n");

        for (Submission submission : submissions) {
            List<String> row = new ArrayList<>();
            row.add(submission.getId().toString());
            row.add(submission.getSubmittedAt().toString());

            Map<String, Object> data = parseSubmissionData(submission.getData());
            for (FormElement element : elements) {
                Object value = data.get(element.getFieldName());
                row.add(value != null ? value.toString() : "");
            }

            csv.append(row.stream().map(this::escapeCsv).collect(Collectors.joining(","))).append("\n");
        }

        return csv.toString();
    }

    private void validateSubmission(Form form, Map<String, Object> data) {
        List<String> errors = new ArrayList<>();

        for (FormElement element : form.getElements()) {
            String fieldName = element.getFieldName();
            Object value = data.get(fieldName);
            ElementConfiguration config = element.getConfiguration();

            if (config != null && Boolean.TRUE.equals(config.getRequired())) {
                if (value == null || (value instanceof String && ((String) value).isBlank())) {
                    errors.add(element.getLabel() + " is required");
                }
            }

            if (value != null && value instanceof String strValue && !strValue.isEmpty()) {
                if (config != null) {
                    if (config.getMinLength() != null && strValue.length() < config.getMinLength()) {
                        errors.add(element.getLabel() + " must be at least " + config.getMinLength() + " characters");
                    }
                    if (config.getMaxLength() != null && strValue.length() > config.getMaxLength()) {
                        errors.add(element.getLabel() + " must not exceed " + config.getMaxLength() + " characters");
                    }
                    if (config.getPattern() != null && !strValue.matches(config.getPattern())) {
                        String message = config.getPatternMessage() != null
                                ? config.getPatternMessage()
                                : element.getLabel() + " has invalid format";
                        errors.add(message);
                    }
                }
            }
        }

        if (!errors.isEmpty()) {
            throw new ValidationException(String.join("; ", errors));
        }
    }

    private SubmissionDTO.Response toResponse(Submission submission) {
        Map<String, Object> data = parseSubmissionData(submission.getData());

        return SubmissionDTO.Response.builder()
                .id(submission.getId())
                .formId(submission.getForm().getId())
                .data(data)
                .submittedAt(submission.getSubmittedAt())
                .ipAddress(submission.getIpAddress())
                .build();
    }

    private Map<String, Object> parseSubmissionData(String dataJson) {
        try {
            return objectMapper.readValue(dataJson, new TypeReference<Map<String, Object>>() {});
        } catch (JsonProcessingException e) {
            return Map.of();
        }
    }

    private String escapeCsv(String value) {
        if (value == null) {
            return "";
        }
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private void validateFormExists(UUID formId) {
        if (!formRepository.existsById(formId)) {
            throw new ResourceNotFoundException("Form not found: " + formId);
        }
    }
}
