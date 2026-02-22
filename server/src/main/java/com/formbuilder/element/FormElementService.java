package com.formbuilder.element;

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
public class FormElementService {

    private final FormElementRepository elementRepository;
    private final FormRepository formRepository;

    @Transactional(readOnly = true)
    public List<FormElementDTO.Response> getElements(UUID formId) {
        validateFormExists(formId);
        return elementRepository.findByFormIdOrderBySortOrderAsc(formId).stream()
                .map(FormElementDTO::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public FormElementDTO.Response createElement(UUID formId, FormElementDTO.CreateRequest request) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new ResourceNotFoundException("Form not found: " + formId));

        Integer sortOrder = request.getSortOrder();
        if (sortOrder == null) {
            sortOrder = elementRepository.findMaxSortOrder(formId) + 1;
        }

        FormElement element = FormElement.builder()
                .form(form)
                .type(request.getType())
                .label(request.getLabel())
                .fieldName(request.getFieldName())
                .sortOrder(sortOrder)
                .configuration(request.getConfiguration() != null ? request.getConfiguration() : new ElementConfiguration())
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

        return elementRepository.findByFormIdOrderBySortOrderAsc(formId).stream()
                .map(FormElementDTO::toResponse)
                .collect(Collectors.toList());
    }

    private void validateFormExists(UUID formId) {
        if (!formRepository.existsById(formId)) {
            throw new ResourceNotFoundException("Form not found: " + formId);
        }
    }
}
