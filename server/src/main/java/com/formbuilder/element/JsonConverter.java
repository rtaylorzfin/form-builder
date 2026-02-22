package com.formbuilder.element;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;

@Converter
@Slf4j
public class JsonConverter implements AttributeConverter<ElementConfiguration, String> {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(ElementConfiguration attribute) {
        if (attribute == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(attribute);
        } catch (JsonProcessingException e) {
            log.error("Error converting ElementConfiguration to JSON", e);
            throw new IllegalArgumentException("Error converting ElementConfiguration to JSON", e);
        }
    }

    @Override
    public ElementConfiguration convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return new ElementConfiguration();
        }
        try {
            return objectMapper.readValue(dbData, ElementConfiguration.class);
        } catch (JsonProcessingException e) {
            log.error("Error converting JSON to ElementConfiguration", e);
            throw new IllegalArgumentException("Error converting JSON to ElementConfiguration", e);
        }
    }
}
