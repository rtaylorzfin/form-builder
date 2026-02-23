package com.formbuilder.form;

import com.formbuilder.auth.AuthService;
import com.formbuilder.auth.User;
import com.formbuilder.auth.UserRole;
import com.formbuilder.element.FormElement;
import com.formbuilder.element.FormElementDTO;
import com.formbuilder.element.FormElementRepository;
import com.formbuilder.exception.ResourceNotFoundException;
import com.formbuilder.page.FormPage;
import com.formbuilder.page.FormPageDTO;
import com.formbuilder.page.FormPageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FormService {

    private final FormRepository formRepository;
    private final FormPageRepository pageRepository;
    private final FormElementRepository elementRepository;
    private final AuthService authService;

    @Transactional(readOnly = true)
    public List<FormDTO.ListResponse> getAllForms() {
        User user = authService.getAuthenticatedUser();
        List<Form> forms;
        if (user != null && user.getRole() == UserRole.ADMIN) {
            forms = formRepository.findByUserIdOrderByUpdatedAtDesc(user.getId());
        } else if (user != null) {
            forms = formRepository.findByStatusOrderByUpdatedAtDesc(FormStatus.PUBLISHED);
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

        FormPage defaultPage = FormPage.builder()
                .form(saved).pageNumber(0).title("Page 1").build();
        pageRepository.save(defaultPage);
        saved.getPages().add(defaultPage);

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

    @Transactional(readOnly = true)
    public FormDTO.ExportResponse exportForm(UUID id) {
        Form form = formRepository.findByIdWithElements(id)
                .orElseThrow(() -> new ResourceNotFoundException("Form not found: " + id));
        verifyOwnership(form);

        List<FormPage> pages = form.getPages() != null ? form.getPages() : List.of();
        List<FormDTO.ExportPage> exportPages = pages.stream()
                .map(p -> FormDTO.ExportPage.builder()
                        .pageNumber(p.getPageNumber())
                        .title(p.getTitle())
                        .description(p.getDescription())
                        .build())
                .collect(Collectors.toList());

        List<FormElement> rootElements = form.getElements() != null
                ? form.getElements().stream()
                    .filter(e -> e.getParentElement() == null)
                    .sorted((a, b) -> Integer.compare(a.getSortOrder(), b.getSortOrder()))
                    .collect(Collectors.toList())
                : List.of();

        List<FormDTO.ExportElement> exportElements = rootElements.stream()
                .map(e -> toExportElement(e, pages))
                .collect(Collectors.toList());

        return FormDTO.ExportResponse.builder()
                .name(form.getName())
                .description(form.getDescription())
                .pages(exportPages)
                .elements(exportElements)
                .build();
    }

    @Transactional
    public FormDTO.Response importForm(FormDTO.ImportRequest request) {
        User user = authService.getAuthenticatedUser();

        Form form = Form.builder()
                .name(request.getName())
                .description(request.getDescription())
                .status(FormStatus.DRAFT)
                .user(user)
                .build();
        Form savedForm = formRepository.save(form);

        // Create pages
        List<FormPage> savedPages = new ArrayList<>();
        if (request.getPages() != null) {
            for (FormDTO.ExportPage exportPage : request.getPages()) {
                FormPage page = FormPage.builder()
                        .form(savedForm)
                        .pageNumber(exportPage.getPageNumber())
                        .title(exportPage.getTitle())
                        .description(exportPage.getDescription())
                        .build();
                savedPages.add(pageRepository.save(page));
            }
        }

        // Ensure at least one page exists
        if (savedPages.isEmpty()) {
            FormPage defaultPage = FormPage.builder()
                    .form(savedForm).pageNumber(0).title("Page 1").build();
            savedPages.add(pageRepository.save(defaultPage));
        }

        // Create elements recursively
        if (request.getElements() != null) {
            for (FormDTO.ExportElement exportElement : request.getElements()) {
                createElementFromExport(exportElement, savedForm, null, savedPages);
            }
        }

        return toResponse(formRepository.findByIdWithElements(savedForm.getId()).orElse(savedForm));
    }

    private void createElementFromExport(FormDTO.ExportElement exportElement, Form form, FormElement parent, List<FormPage> pages) {
        FormPage page;
        if (exportElement.getPageIndex() != null && exportElement.getPageIndex() < pages.size()) {
            page = pages.get(exportElement.getPageIndex());
        } else {
            page = pages.get(0);
        }

        FormElement element = FormElement.builder()
                .form(form)
                .type(exportElement.getType())
                .label(exportElement.getLabel())
                .fieldName(exportElement.getFieldName())
                .sortOrder(exportElement.getSortOrder())
                .configuration(exportElement.getConfiguration())
                .parentElement(parent)
                .page(page)
                .build();
        FormElement saved = elementRepository.save(element);

        if (exportElement.getChildren() != null) {
            for (FormDTO.ExportElement child : exportElement.getChildren()) {
                createElementFromExport(child, form, saved, pages);
            }
        }
    }

    private FormDTO.ExportElement toExportElement(FormElement element, List<FormPage> pages) {
        Integer pageIndex = null;
        if (element.getPage() != null) {
            for (int i = 0; i < pages.size(); i++) {
                if (pages.get(i).getId().equals(element.getPage().getId())) {
                    pageIndex = i;
                    break;
                }
            }
        }

        List<FormDTO.ExportElement> children = null;
        if (element.getChildren() != null && !element.getChildren().isEmpty()) {
            children = element.getChildren().stream()
                    .sorted((a, b) -> Integer.compare(a.getSortOrder(), b.getSortOrder()))
                    .map(c -> toExportElement(c, pages))
                    .collect(Collectors.toList());
        }

        return FormDTO.ExportElement.builder()
                .type(element.getType())
                .label(element.getLabel())
                .fieldName(element.getFieldName())
                .sortOrder(element.getSortOrder())
                .configuration(element.getConfiguration())
                .pageIndex(pageIndex)
                .children(children)
                .build();
    }

    private void verifyOwnership(Form form) {
        User user = authService.getAuthenticatedUser();
        if (user != null && user.getRole() == UserRole.ADMIN) {
            return;
        }
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
