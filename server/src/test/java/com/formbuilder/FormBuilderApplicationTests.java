package com.formbuilder;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.formbuilder.element.ElementType;
import com.formbuilder.form.FormDTO;
import com.formbuilder.element.FormElementDTO;
import com.formbuilder.element.ElementConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class FormBuilderApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void contextLoads() {
    }

    @Test
    void createFormAndElements() throws Exception {
        // Create a form
        FormDTO.CreateRequest createRequest = new FormDTO.CreateRequest();
        createRequest.setName("Test Contact Form");
        createRequest.setDescription("A test form for collecting contact information");

        MvcResult createResult = mockMvc.perform(post("/api/forms")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Test Contact Form"))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andReturn();

        FormDTO.Response form = objectMapper.readValue(
                createResult.getResponse().getContentAsString(),
                FormDTO.Response.class);

        String formId = form.getId().toString();

        // Add a text input element
        FormElementDTO.CreateRequest textElement = new FormElementDTO.CreateRequest();
        textElement.setType(ElementType.TEXT_INPUT);
        textElement.setLabel("Full Name");
        textElement.setFieldName("full_name");
        ElementConfiguration config = new ElementConfiguration();
        config.setRequired(true);
        config.setPlaceholder("Enter your name");
        textElement.setConfiguration(config);

        mockMvc.perform(post("/api/forms/{formId}/elements", formId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(textElement)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.label").value("Full Name"))
                .andExpect(jsonPath("$.type").value("TEXT_INPUT"));

        // Add an email element
        FormElementDTO.CreateRequest emailElement = new FormElementDTO.CreateRequest();
        emailElement.setType(ElementType.EMAIL);
        emailElement.setLabel("Email Address");
        emailElement.setFieldName("email");
        ElementConfiguration emailConfig = new ElementConfiguration();
        emailConfig.setRequired(true);
        emailElement.setConfiguration(emailConfig);

        mockMvc.perform(post("/api/forms/{formId}/elements", formId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(emailElement)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("EMAIL"));

        // Get the form with elements
        mockMvc.perform(get("/api/forms/{id}", formId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.elements.length()").value(2));

        // Publish the form
        mockMvc.perform(post("/api/forms/{id}/publish", formId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));

        // Get public form
        mockMvc.perform(get("/api/public/forms/{id}", formId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Test Contact Form"));

        // Clean up
        mockMvc.perform(delete("/api/forms/{id}", formId))
                .andExpect(status().isNoContent());
    }

    @Test
    void formValidation() throws Exception {
        // Try to create form without name
        FormDTO.CreateRequest invalidRequest = new FormDTO.CreateRequest();
        invalidRequest.setName("");

        mockMvc.perform(post("/api/forms")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void formNotFound() throws Exception {
        mockMvc.perform(get("/api/forms/00000000-0000-0000-0000-000000000000"))
                .andExpect(status().isNotFound());
    }
}
