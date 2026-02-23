package com.formbuilder;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.formbuilder.element.ElementType;
import com.formbuilder.form.FormDTO;
import com.formbuilder.element.FormElementDTO;
import com.formbuilder.element.ElementConfiguration;
import com.formbuilder.auth.AuthDTO;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestFlywayConfig.class)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class FormBuilderApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String adminToken;

    @BeforeAll
    void setup() throws Exception {
        // First registered user becomes ADMIN
        adminToken = registerAndGetToken("admin@example.com");
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
    @Order(1)
    void contextLoads() {
    }

    @Test
    @Order(2)
    void createFormAndElements() throws Exception {
        // Create a form (as ADMIN)
        FormDTO.CreateRequest createRequest = new FormDTO.CreateRequest();
        createRequest.setName("Test Contact Form");
        createRequest.setDescription("A test form for collecting contact information");

        MvcResult createResult = mockMvc.perform(post("/api/forms")
                .header("Authorization", "Bearer " + adminToken)
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
                .header("Authorization", "Bearer " + adminToken)
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
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(emailElement)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("EMAIL"));

        // Get the form with elements
        mockMvc.perform(get("/api/forms/{id}", formId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.elements.length()").value(2));

        // Publish the form
        mockMvc.perform(post("/api/forms/{id}/publish", formId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));

        // Get public form (no auth needed)
        mockMvc.perform(get("/api/public/forms/{id}", formId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Test Contact Form"));

        // Clean up
        mockMvc.perform(delete("/api/forms/{id}", formId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());
    }

    @Test
    @Order(3)
    void formValidation() throws Exception {
        // Try to create form without name (as ADMIN - tests validation, not auth)
        FormDTO.CreateRequest invalidRequest = new FormDTO.CreateRequest();
        invalidRequest.setName("");

        mockMvc.perform(post("/api/forms")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(4)
    void formNotFound() throws Exception {
        mockMvc.perform(get("/api/forms/00000000-0000-0000-0000-000000000000")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(5)
    void unauthenticatedAccessDenied() throws Exception {
        mockMvc.perform(get("/api/forms"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(6)
    void publicEndpointsAccessible() throws Exception {
        mockMvc.perform(get("/api/public/forms/00000000-0000-0000-0000-000000000000"))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(7)
    void userCannotCreateForm() throws Exception {
        // Register a second user (becomes USER, not ADMIN)
        String userToken = registerAndGetToken("user@example.com");

        FormDTO.CreateRequest request = new FormDTO.CreateRequest();
        request.setName("Should Fail");

        mockMvc.perform(post("/api/forms")
                .header("Authorization", "Bearer " + userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }
}
