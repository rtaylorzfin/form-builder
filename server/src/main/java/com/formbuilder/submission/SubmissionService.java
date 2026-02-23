package com.formbuilder.submission;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.formbuilder.auth.AuthService;
import com.formbuilder.auth.User;
import com.formbuilder.auth.UserRole;
import com.formbuilder.element.ElementConfiguration;
import com.formbuilder.element.ElementType;
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
    private final AuthService authService;

    @Transactional(readOnly = true)
    public SubmissionDTO.PageResponse getSubmissions(UUID formId, int page, int size) {
        validateFormExists(formId);

        User user = authService.getAuthenticatedUser();
        Page<Submission> submissionPage;
        if (user != null && user.getRole() == UserRole.ADMIN) {
            submissionPage = submissionRepository.findByFormIdOrderBySubmittedAtDesc(
                    formId, PageRequest.of(page, size));
        } else if (user != null) {
            submissionPage = submissionRepository.findByFormIdAndUserIdOrderBySubmittedAtDesc(
                    formId, user.getId(), PageRequest.of(page, size));
        } else {
            submissionPage = submissionRepository.findByFormIdOrderBySubmittedAtDesc(
                    formId, PageRequest.of(page, size));
        }

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

    @Transactional(readOnly = true)
    public SubmissionDTO.Response getSubmission(UUID formId, UUID submissionId) {
        validateFormExists(formId);
        Submission submission = submissionRepository.findByIdAndFormId(submissionId, formId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));
        return toResponse(submission);
    }

    @Transactional
    public SubmissionDTO.Response createSubmission(UUID formId, SubmissionDTO.CreateRequest request,
                                                    String ipAddress, String userAgent) {
        Form form = formRepository.findByIdWithElements(formId)
                .orElseThrow(() -> new ResourceNotFoundException("Form not found: " + formId));

        if (form.getStatus() != FormStatus.PUBLISHED) {
            throw new ValidationException("Form is not published");
        }

        SubmissionStatus status = request.getStatus() != null ? request.getStatus() : SubmissionStatus.SUBMITTED;

        // Skip validation for drafts
        if (status != SubmissionStatus.DRAFT) {
            validateSubmission(form, request.getData());
        }

        String dataJson;
        try {
            dataJson = objectMapper.writeValueAsString(request.getData());
        } catch (JsonProcessingException e) {
            throw new ValidationException("Invalid submission data format");
        }

        Submission submission = Submission.builder()
                .form(form)
                .data(dataJson)
                .status(status)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .user(authService.getAuthenticatedUser())
                .build();

        Submission saved = submissionRepository.save(submission);
        return toResponse(saved);
    }

    @Transactional
    public SubmissionDTO.Response updateSubmission(UUID formId, UUID submissionId, SubmissionDTO.UpdateRequest request) {
        Form form = formRepository.findByIdWithElements(formId)
                .orElseThrow(() -> new ResourceNotFoundException("Form not found: " + formId));

        Submission submission = submissionRepository.findByIdAndFormId(submissionId, formId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));

        SubmissionStatus status = request.getStatus() != null ? request.getStatus() : submission.getStatus();

        // Skip validation for drafts
        if (status != SubmissionStatus.DRAFT) {
            validateSubmission(form, request.getData());
        }

        String dataJson;
        try {
            dataJson = objectMapper.writeValueAsString(request.getData());
        } catch (JsonProcessingException e) {
            throw new ValidationException("Invalid submission data format");
        }

        submission.setData(dataJson);
        submission.setStatus(status);

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
            // Skip child elements — they are validated via their parent group
            if (element.getParentElement() != null) {
                continue;
            }
            if (element.getType() == ElementType.STATIC_TEXT) {
                continue;
            }
            if (element.getType() == ElementType.ELEMENT_GROUP) {
                validateGroupElement(element, data, errors, "");
                continue;
            }

            // Non-group repeatable elements: expect array of primitive values
            ElementConfiguration elConfig = element.getConfiguration();
            if (elConfig != null && Boolean.TRUE.equals(elConfig.getRepeatable())) {
                validateRepeatableField(element, data, errors);
                continue;
            }

            validateField(element, data.get(element.getFieldName()), errors);
        }

        if (!errors.isEmpty()) {
            throw new ValidationException(String.join("; ", errors));
        }
    }

    @SuppressWarnings("unchecked")
    private void validateRepeatableField(FormElement element, Map<String, Object> data, List<String> errors) {
        Object value = data.get(element.getFieldName());
        ElementConfiguration config = element.getConfiguration();
        int minInstances = config.getMinInstances() != null ? config.getMinInstances() : 0;
        int maxInstances = config.getMaxInstances() != null ? config.getMaxInstances() : Integer.MAX_VALUE;

        if (!(value instanceof List)) {
            errors.add(element.getLabel() + " must be an array");
            return;
        }

        List<Object> values = (List<Object>) value;
        if (values.size() < minInstances) {
            errors.add(element.getLabel() + " requires at least " + minInstances + " value(s)");
        }
        if (values.size() > maxInstances) {
            errors.add(element.getLabel() + " allows at most " + maxInstances + " value(s)");
        }

        for (int i = 0; i < values.size(); i++) {
            validateField(element, values.get(i), errors, element.getLabel() + "[" + (i + 1) + "].");
        }
    }

    @SuppressWarnings("unchecked")
    private void validateRepeatableGroup(FormElement group, Map<String, Object> data, List<String> errors) {
        validateRepeatableGroup(group, data, errors, "");
    }

    @SuppressWarnings("unchecked")
    private void validateRepeatableGroup(FormElement group, Map<String, Object> data, List<String> errors, String pathPrefix) {
        Object value = data.get(group.getFieldName());
        ElementConfiguration config = group.getConfiguration();
        int minInstances = config.getMinInstances() != null ? config.getMinInstances() : 0;
        int maxInstances = config.getMaxInstances() != null ? config.getMaxInstances() : Integer.MAX_VALUE;
        String groupLabel = pathPrefix + group.getLabel();

        if (!(value instanceof List)) {
            errors.add(groupLabel + " must be an array");
            return;
        }

        List<Object> instances = (List<Object>) value;
        if (instances.size() < minInstances) {
            errors.add(groupLabel + " requires at least " + minInstances + " instance(s)");
        }
        if (instances.size() > maxInstances) {
            errors.add(groupLabel + " allows at most " + maxInstances + " instance(s)");
        }

        List<FormElement> children = group.getChildren() != null ? group.getChildren() : List.of();
        for (int i = 0; i < instances.size(); i++) {
            Object instance = instances.get(i);
            if (!(instance instanceof Map)) {
                errors.add(groupLabel + " instance " + (i + 1) + " is invalid");
                continue;
            }
            Map<String, Object> instanceData = (Map<String, Object>) instance;
            String instancePrefix = groupLabel + "[" + (i + 1) + "].";
            for (FormElement child : children) {
                if (child.getType() == ElementType.ELEMENT_GROUP) {
                    validateGroupElement(child, instanceData, errors, instancePrefix);
                } else {
                    validateField(child, instanceData.get(child.getFieldName()), errors, instancePrefix);
                }
            }
        }
    }

    @SuppressWarnings("unchecked")
    private void validateGroupElement(FormElement group, Map<String, Object> data, List<String> errors, String pathPrefix) {
        ElementConfiguration groupConfig = group.getConfiguration();
        if (groupConfig != null && Boolean.TRUE.equals(groupConfig.getRepeatable())) {
            validateRepeatableGroup(group, data, errors, pathPrefix);
        } else {
            // Non-repeatable nested group: validate children directly
            List<FormElement> children = group.getChildren() != null ? group.getChildren() : List.of();
            for (FormElement child : children) {
                if (child.getType() == ElementType.ELEMENT_GROUP) {
                    validateGroupElement(child, data, errors, pathPrefix);
                } else {
                    validateField(child, data.get(child.getFieldName()), errors, pathPrefix);
                }
            }
        }
    }

    private void validateField(FormElement element, Object value, List<String> errors) {
        validateField(element, value, errors, "");
    }

    private void validateField(FormElement element, Object value, List<String> errors, String prefix) {
        if (element.getType() == ElementType.ELEMENT_GROUP) return;
        if (element.getType() == ElementType.STATIC_TEXT) return;

        ElementConfiguration config = element.getConfiguration();
        String label = prefix + element.getLabel();

        if (config != null && Boolean.TRUE.equals(config.getRequired())) {
            if (value == null || (value instanceof String && ((String) value).isBlank())) {
                errors.add(label + " is required");
            }
        }

        if (value != null && value instanceof String strValue && !strValue.isEmpty()) {
            if (config != null) {
                if (config.getMinLength() != null && strValue.length() < config.getMinLength()) {
                    errors.add(label + " must be at least " + config.getMinLength() + " characters");
                }
                if (config.getMaxLength() != null && strValue.length() > config.getMaxLength()) {
                    errors.add(label + " must not exceed " + config.getMaxLength() + " characters");
                }
                if (config.getPattern() != null && !strValue.matches(config.getPattern())) {
                    String message = config.getPatternMessage() != null
                            ? config.getPatternMessage()
                            : label + " has invalid format";
                    errors.add(message);
                }
            }
        }
    }

    private List<FormElement> flattenElements(List<FormElement> elements) {
        List<FormElement> flat = new ArrayList<>();
        for (FormElement element : elements) {
            flat.add(element);
            if (element.getChildren() != null && !element.getChildren().isEmpty()) {
                flat.addAll(flattenElements(element.getChildren()));
            }
        }
        return flat;
    }

    private SubmissionDTO.Response toResponse(Submission submission) {
        Map<String, Object> data = parseSubmissionData(submission.getData());

        return SubmissionDTO.Response.builder()
                .id(submission.getId())
                .formId(submission.getForm().getId())
                .data(data)
                .submittedAt(submission.getSubmittedAt())
                .updatedAt(submission.getUpdatedAt())
                .status(submission.getStatus())
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
