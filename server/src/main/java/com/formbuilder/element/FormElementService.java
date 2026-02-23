package com.formbuilder.element;

import com.formbuilder.exception.ResourceNotFoundException;
import com.formbuilder.exception.ValidationException;
import com.formbuilder.form.Form;
import com.formbuilder.form.FormRepository;
import com.formbuilder.page.FormPage;
import com.formbuilder.page.FormPageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FormElementService {

    private final FormElementRepository elementRepository;
    private final FormRepository formRepository;
    private final FormPageRepository pageRepository;

    @Transactional(readOnly = true)
    public List<FormElementDTO.Response> getElements(UUID formId) {
        validateFormExists(formId);
        return elementRepository.findByFormIdAndParentElementIsNullOrderBySortOrderAsc(formId).stream()
                .map(FormElementDTO::toTreeResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public FormElementDTO.Response createElement(UUID formId, FormElementDTO.CreateRequest request) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new ResourceNotFoundException("Form not found: " + formId));

        FormElement parentElement = null;
        if (request.getParentElementId() != null) {
            parentElement = elementRepository.findByIdAndFormId(request.getParentElementId(), formId)
                    .orElseThrow(() -> new ResourceNotFoundException("Parent element not found: " + request.getParentElementId()));

            if (parentElement.getType() != ElementType.ELEMENT_GROUP) {
                throw new ValidationException("Only ELEMENT_GROUP elements can have children");
            }
            if (request.getType() == ElementType.ELEMENT_GROUP) {
                int depth = 0;
                FormElement ancestor = parentElement;
                while (ancestor != null) { depth++; ancestor = ancestor.getParentElement(); }
                if (depth >= 5) {
                    throw new ValidationException("Maximum nesting depth exceeded");
                }
            }
        }

        Integer sortOrder = request.getSortOrder();
        if (sortOrder == null) {
            if (parentElement != null) {
                sortOrder = elementRepository.findMaxSortOrderByParent(parentElement.getId()) + 1;
            } else {
                sortOrder = elementRepository.findMaxSortOrder(formId) + 1;
            }
        }

        ElementConfiguration config = request.getConfiguration() != null ? request.getConfiguration() : new ElementConfiguration();
        validateRepeatableConfig(request.getType(), config);

        FormPage page;
        if (request.getPageId() != null) {
            page = pageRepository.findByIdAndFormId(request.getPageId(), formId)
                    .orElseThrow(() -> new ResourceNotFoundException("Page not found: " + request.getPageId()));
        } else {
            page = pageRepository.findFirstByFormIdOrderByPageNumberAsc(formId)
                    .orElseThrow(() -> new IllegalStateException("Form has no pages"));
        }

        FormElement element = FormElement.builder()
                .form(form)
                .type(request.getType())
                .label(request.getLabel())
                .fieldName(request.getFieldName())
                .sortOrder(sortOrder)
                .configuration(config)
                .parentElement(parentElement)
                .page(page)
                .build();

        FormElement saved = elementRepository.save(element);
        return FormElementDTO.toResponse(saved);
    }

    @Transactional
    public FormElementDTO.Response updateElement(UUID formId, UUID elementId, FormElementDTO.UpdateRequest request) {
        validateFormExists(formId);

        FormElement element = elementRepository.findByIdAndFormId(elementId, formId)
                .orElseThrow(() -> new ResourceNotFoundException("Element not found: " + elementId));

        if (request.getType() != null) {
            element.setType(request.getType());
        }
        if (request.getLabel() != null) {
            element.setLabel(request.getLabel());
        }
        if (request.getFieldName() != null) {
            element.setFieldName(request.getFieldName());
        }
        if (request.getSortOrder() != null) {
            element.setSortOrder(request.getSortOrder());
        }
        if (request.getConfiguration() != null) {
            element.setConfiguration(request.getConfiguration());
        }
        if (request.getParentElementId() != null) {
            FormElement parentElement = elementRepository.findByIdAndFormId(request.getParentElementId(), formId)
                    .orElseThrow(() -> new ResourceNotFoundException("Parent element not found: " + request.getParentElementId()));
            if (parentElement.getType() != ElementType.ELEMENT_GROUP) {
                throw new ValidationException("Only ELEMENT_GROUP elements can have children");
            }
            element.setParentElement(parentElement);
        }

        FormElement saved = elementRepository.save(element);
        return FormElementDTO.toResponse(saved);
    }

    @Transactional
    public void deleteElement(UUID formId, UUID elementId) {
        validateFormExists(formId);

        FormElement element = elementRepository.findByIdAndFormId(elementId, formId)
                .orElseThrow(() -> new ResourceNotFoundException("Element not found: " + elementId));

        elementRepository.delete(element);
    }

    @Transactional
    public List<FormElementDTO.Response> reorderElements(UUID formId, FormElementDTO.ReorderRequest request) {
        validateFormExists(formId);

        List<UUID> elementIds = request.getElementIds();
        List<FormElement> elements = elementRepository.findByFormIdOrderBySortOrderAsc(formId);

        for (int i = 0; i < elementIds.size(); i++) {
            UUID elementId = elementIds.get(i);
            final int sortOrder = i;
            elements.stream()
                    .filter(e -> e.getId().equals(elementId))
                    .findFirst()
                    .ifPresent(e -> e.setSortOrder(sortOrder));
        }

        elementRepository.saveAll(elements);

        return elementRepository.findByFormIdAndParentElementIsNullOrderBySortOrderAsc(formId).stream()
                .map(FormElementDTO::toTreeResponse)
                .collect(Collectors.toList());
    }

    private void validateRepeatableConfig(ElementType type, ElementConfiguration config) {
        if (config == null) return;
        if (Boolean.TRUE.equals(config.getRepeatable())) {
            if (config.getMinInstances() != null && config.getMinInstances() < 0) {
                throw new ValidationException("minInstances must be at least 0");
            }
            if (config.getMaxInstances() != null && config.getMinInstances() != null
                    && config.getMaxInstances() < config.getMinInstances()) {
                throw new ValidationException("maxInstances must be >= minInstances");
            }
        }
    }

    private void validateFormExists(UUID formId) {
        if (!formRepository.existsById(formId)) {
            throw new ResourceNotFoundException("Form not found: " + formId);
        }
    }
}
