package com.formbuilder.page;

import com.formbuilder.exception.ResourceNotFoundException;
import com.formbuilder.form.Form;
import com.formbuilder.form.FormRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FormPageService {

    private final FormPageRepository pageRepository;
    private final FormRepository formRepository;

    @Transactional(readOnly = true)
    public List<FormPageDTO.Response> getPages(UUID formId) {
        validateFormExists(formId);
        return pageRepository.findByFormIdOrderByPageNumberAsc(formId).stream()
                .map(FormPageDTO::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public FormPageDTO.Response createPage(UUID formId, FormPageDTO.CreateRequest request) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new ResourceNotFoundException("Form not found: " + formId));

        Integer pageNumber = pageRepository.findMaxPageNumber(formId) + 1;

        FormPage page = FormPage.builder()
                .form(form)
                .pageNumber(pageNumber)
                .title(request.getTitle() != null ? request.getTitle() : "Page " + (pageNumber + 1))
                .description(request.getDescription())
                .build();

        FormPage saved = pageRepository.save(page);
        return FormPageDTO.toResponse(saved);
    }

    @Transactional
    public FormPageDTO.Response updatePage(UUID formId, UUID pageId, FormPageDTO.UpdateRequest request) {
        validateFormExists(formId);

        FormPage page = pageRepository.findByIdAndFormId(pageId, formId)
                .orElseThrow(() -> new ResourceNotFoundException("Page not found: " + pageId));

        if (request.getTitle() != null) {
            page.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            page.setDescription(request.getDescription());
        }

        FormPage saved = pageRepository.save(page);
        return FormPageDTO.toResponse(saved);
    }

    @Transactional
    public void deletePage(UUID formId, UUID pageId) {
        validateFormExists(formId);

        FormPage page = pageRepository.findByIdAndFormId(pageId, formId)
                .orElseThrow(() -> new ResourceNotFoundException("Page not found: " + pageId));

        if (pageRepository.countByFormId(formId) <= 1) {
            throw new IllegalStateException("Cannot delete the last page");
        }

        pageRepository.delete(page);

        // Re-number remaining pages
        List<FormPage> remainingPages = pageRepository.findByFormIdOrderByPageNumberAsc(formId);
        for (int i = 0; i < remainingPages.size(); i++) {
            remainingPages.get(i).setPageNumber(i);
        }
        pageRepository.saveAll(remainingPages);
    }

    @Transactional
    public List<FormPageDTO.Response> reorderPages(UUID formId, FormPageDTO.ReorderRequest request) {
        validateFormExists(formId);

        List<UUID> pageIds = request.getPageIds();
        List<FormPage> pages = pageRepository.findByFormIdOrderByPageNumberAsc(formId);

        for (int i = 0; i < pageIds.size(); i++) {
            UUID pageId = pageIds.get(i);
            final int pageNumber = i;
            pages.stream()
                    .filter(p -> p.getId().equals(pageId))
                    .findFirst()
                    .ifPresent(p -> p.setPageNumber(pageNumber));
        }

        pageRepository.saveAll(pages);

        return pageRepository.findByFormIdOrderByPageNumberAsc(formId).stream()
                .map(FormPageDTO::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public FormPage getOrCreateDefaultPage(UUID formId) {
        return pageRepository.findFirstByFormIdOrderByPageNumberAsc(formId)
                .orElseGet(() -> {
                    Form form = formRepository.findById(formId)
                            .orElseThrow(() -> new ResourceNotFoundException("Form not found: " + formId));
                    FormPage page = FormPage.builder()
                            .form(form)
                            .pageNumber(0)
                            .title("Page 1")
                            .build();
                    return pageRepository.save(page);
                });
    }

    private void validateFormExists(UUID formId) {
        if (!formRepository.existsById(formId)) {
            throw new ResourceNotFoundException("Form not found: " + formId);
        }
    }
}
