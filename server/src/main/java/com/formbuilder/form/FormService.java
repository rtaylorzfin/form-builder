package com.formbuilder.form;

import com.formbuilder.auth.AuthService;
import com.formbuilder.auth.User;
import com.formbuilder.element.FormElementDTO;
import com.formbuilder.exception.ResourceNotFoundException;
import com.formbuilder.page.FormPageDTO;
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
    private final AuthService authService;

    @Transactional(readOnly = true)
    public List<FormDTO.ListResponse> getAllForms() {
        User user = authService.getAuthenticatedUser();
        List<Form> forms;
        if (user != null) {
            forms = formRepository.findByUserIdOrderByUpdatedAtDesc(user.getId());
        } else {
            forms = formRepository.findAllByOrderByUpdatedAtDesc();
        }
        return forms.stream()
                .map(this::toListResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public FormDTO.Response getForm(UUID id) {
        Form form = formRepository.findByIdWithElements(id)
                .orElseThrow(() -> new ResourceNotFoundException("Form not found: " + id));
        verifyOwnership(form);
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
        User user = authService.getAuthenticatedUser();

        Form form = Form.builder()
                .name(request.getName())
                .description(request.getDescription())
                .status(FormStatus.DRAFT)
                .user(user)
                .build();
        Form saved = formRepository.save(form);
        return toResponse(saved);
    }

    @Transactional
    public FormDTO.Response updateForm(UUID id, FormDTO.UpdateRequest request) {
        Form form = formRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Form not found: " + id));
        verifyOwnership(form);

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
        verifyOwnership(form);

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
        Form form = formRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Form not found: " + id));
        verifyOwnership(form);
        formRepository.deleteById(id);
    }

    private void verifyOwnership(Form form) {
        User user = authService.getAuthenticatedUser();
        if (user != null && form.getUser() != null && !form.getUser().getId().equals(user.getId())) {
            throw new ResourceNotFoundException("Form not found: " + form.getId());
        }
    }

    private FormDTO.Response toResponse(Form form) {
        List<FormElementDTO.Response> elements = form.getElements() != null
                ? form.getElements().stream()
                    .filter(e -> e.getParentElement() == null)
                    .map(FormElementDTO::toTreeResponse)
                    .collect(Collectors.toList())
                : List.of();

        List<FormPageDTO.Response> pages = form.getPages() != null
                ? form.getPages().stream()
                    .map(FormPageDTO::toResponse)
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
                .pages(pages)
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
