package com.formbuilder.form;

import com.formbuilder.element.FormElementDTO;
import com.formbuilder.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FormService {

    private final FormRepository formRepository;

    @Transactional(readOnly = true)
    public List<FormDTO.ListResponse> getAllForms() {
        return formRepository.findAllByOrderByUpdatedAtDesc().stream()
                .map(this::toListResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public FormDTO.Response getForm(UUID id) {
        Form form = formRepository.findByIdWithElements(id)
                .orElseThrow(() -> new ResourceNotFoundException("Form not found: " + id));
        return toResponse(form);
    }

    @Transactional(readOnly = true)
    public FormDTO.Response getPublishedForm(UUID id) {
        Form form = formRepository.findPublishedByIdWithElements(id)
                .orElseThrow(() -> new ResourceNotFoundException("Published form not found: " + id));
        return toResponse(form);
    }

    @Transactional
    public FormDTO.Response createForm(FormDTO.CreateRequest request) {
        Form form = Form.builder()
                .name(request.getName())
                .description(request.getDescription())
                .status(FormStatus.DRAFT)
                .build();
        Form saved = formRepository.save(form);
        return toResponse(saved);
    }

    @Transactional
    public FormDTO.Response updateForm(UUID id, FormDTO.UpdateRequest request) {
        Form form = formRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Form not found: " + id));

        if (request.getName() != null) {
            form.setName(request.getName());
        }
        if (request.getDescription() != null) {
            form.setDescription(request.getDescription());
        }
        if (request.getStatus() != null) {
            form.setStatus(request.getStatus());
        }

        Form saved = formRepository.save(form);
        return toResponse(saved);
    }

    @Transactional
    public FormDTO.Response publishForm(UUID id) {
        Form form = formRepository.findByIdWithElements(id)
                .orElseThrow(() -> new ResourceNotFoundException("Form not found: " + id));

        if (form.getElements().isEmpty()) {
            throw new IllegalStateException("Cannot publish a form without elements");
        }

        form.setStatus(FormStatus.PUBLISHED);
        form.setPublishedAt(LocalDateTime.now());

        Form saved = formRepository.save(form);
        return toResponse(saved);
    }

    @Transactional
    public void deleteForm(UUID id) {
        if (!formRepository.existsById(id)) {
            throw new ResourceNotFoundException("Form not found: " + id);
        }
        formRepository.deleteById(id);
    }

    private FormDTO.Response toResponse(Form form) {
        List<FormElementDTO.Response> elements = form.getElements() != null
                ? form.getElements().stream()
                    .map(FormElementDTO::toResponse)
                    .collect(Collectors.toList())
                : List.of();

        return FormDTO.Response.builder()
                .id(form.getId())
                .name(form.getName())
                .description(form.getDescription())
                .status(form.getStatus())
                .createdAt(form.getCreatedAt())
                .updatedAt(form.getUpdatedAt())
                .publishedAt(form.getPublishedAt())
                .elements(elements)
                .build();
    }

    private FormDTO.ListResponse toListResponse(Form form) {
        return FormDTO.ListResponse.builder()
                .id(form.getId())
                .name(form.getName())
                .description(form.getDescription())
                .status(form.getStatus())
                .createdAt(form.getCreatedAt())
                .updatedAt(form.getUpdatedAt())
                .elementCount(form.getElements() != null ? form.getElements().size() : 0)
                .build();
    }
}
