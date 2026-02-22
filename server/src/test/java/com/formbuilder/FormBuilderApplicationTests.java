package com.formbuilder;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.formbuilder.element.ElementType;
import com.formbuilder.form.FormDTO;
import com.formbuilder.element.FormElementDTO;
import com.formbuilder.element.ElementConfiguration;
import com.formbuilder.auth.AuthDTO;
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

    private String registerAndGetToken(String email) throws Exception {
        AuthDTO.RegisterRequest registerRequest = new AuthDTO.RegisterRequest();
        registerRequest.setName("Test User");
        registerRequest.setEmail(email);
        registerRequest.setPassword("password123");

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        AuthDTO.AuthResponse authResponse = objectMapper.readValue(
                result.getResponse().getContentAsString(),
                AuthDTO.AuthResponse.class);
        return authResponse.getToken();
    }

    @Test
    void createFormAndElements() throws Exception {
        String token = registerAndGetToken("test-create@example.com");

        // Create a form
        FormDTO.CreateRequest createRequest = new FormDTO.CreateRequest();
        createRequest.setName("Test Contact Form");
        createRequest.setDescription("A test form for collecting contact information");

        MvcResult createResult = mockMvc.perform(post("/api/forms")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Test Contact Form"))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.pages.length()").value(1))
                .andExpect(jsonPath("$.pages[0].title").value("Page 1"))
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
                .header("Authorization", "Bearer " + token)
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
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(emailElement)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("EMAIL"));

        // Get the form with elements
        mockMvc.perform(get("/api/forms/{id}", formId)
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.elements.length()").value(2));

        // Publish the form
        mockMvc.perform(post("/api/forms/{id}/publish", formId)
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));

        // Get public form (no auth needed)
        mockMvc.perform(get("/api/public/forms/{id}", formId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Test Contact Form"));

        // Clean up
        mockMvc.perform(delete("/api/forms/{id}", formId)
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
    }

    @Test
    void formValidation() throws Exception {
        String token = registerAndGetToken("test-validate@example.com");

        // Try to create form without name
        FormDTO.CreateRequest invalidRequest = new FormDTO.CreateRequest();
        invalidRequest.setName("");

        mockMvc.perform(post("/api/forms")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void formNotFound() throws Exception {
        String token = registerAndGetToken("test-notfound@example.com");

        mockMvc.perform(get("/api/forms/00000000-0000-0000-0000-000000000000")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void unauthenticatedAccessDenied() throws Exception {
        mockMvc.perform(get("/api/forms"))
                .andExpect(status().isForbidden());
    }

    @Test
    void publicEndpointsAccessible() throws Exception {
        mockMvc.perform(get("/api/public/forms/00000000-0000-0000-0000-000000000000"))
                .andExpect(status().isNotFound());
    }
}
