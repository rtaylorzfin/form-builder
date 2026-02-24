package com.formbuilder;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.formbuilder.auth.AuthDTO;
import com.formbuilder.element.ElementConfiguration;
import com.formbuilder.element.ElementType;
import com.formbuilder.element.FormElementDTO;
import com.formbuilder.form.FormDTO;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests for draft auto-save: GET /draft, PUT /draft, and draft-to-submit conversion.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestFlywayConfig.class)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class DraftSubmissionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String adminToken;
    private String userToken;
    private String formId;

    @BeforeAll
    void setup() throws Exception {
        adminToken = loginOrRegister("admin@example.com", "password123", "Admin User");
        userToken = loginOrRegister("draftuser@example.com", "password123", "Draft User");

        // Create and publish a simple form
        FormDTO.CreateRequest createRequest = new FormDTO.CreateRequest();
        createRequest.setName("Draft Test Form");
        createRequest.setDescription("A form for testing draft auto-save");

        MvcResult createResult = mockMvc.perform(post("/api/forms")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        FormDTO.Response form = objectMapper.readValue(
                createResult.getResponse().getContentAsString(),
                FormDTO.Response.class);
        formId = form.getId().toString();

        // Add a required text field
        FormElementDTO.CreateRequest nameEl = new FormElementDTO.CreateRequest();
        nameEl.setType(ElementType.TEXT_INPUT);
        nameEl.setLabel("Full Name");
        nameEl.setFieldName("full_name");
        ElementConfiguration nameConfig = new ElementConfiguration();
        nameConfig.setRequired(true);
        nameEl.setConfiguration(nameConfig);

        mockMvc.perform(post("/api/forms/{formId}/elements", formId)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(nameEl)))
                .andExpect(status().isCreated());

        // Add an optional email field
        FormElementDTO.CreateRequest emailEl = new FormElementDTO.CreateRequest();
        emailEl.setType(ElementType.EMAIL);
        emailEl.setLabel("Email");
        emailEl.setFieldName("email");
        emailEl.setConfiguration(new ElementConfiguration());

        mockMvc.perform(post("/api/forms/{formId}/elements", formId)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(emailEl)))
                .andExpect(status().isCreated());

        // Publish the form
        mockMvc.perform(post("/api/forms/{id}/publish", formId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));
    }

    private String loginOrRegister(String email, String password, String name) throws Exception {
        AuthDTO.LoginRequest loginRequest = new AuthDTO.LoginRequest();
        loginRequest.setEmail(email);
        loginRequest.setPassword(password);

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andReturn();

        if (loginResult.getResponse().getStatus() == 200) {
            return objectMapper.readValue(
                    loginResult.getResponse().getContentAsString(),
                    AuthDTO.AuthResponse.class).getToken();
        }

        AuthDTO.RegisterRequest registerRequest = new AuthDTO.RegisterRequest();
        registerRequest.setName(name);
        registerRequest.setEmail(email);
        registerRequest.setPassword(password);

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readValue(
                result.getResponse().getContentAsString(),
                AuthDTO.AuthResponse.class).getToken();
    }

    @Test
    @Order(1)
    void getDraftReturns204WhenNoDraftExists() throws Exception {
        mockMvc.perform(get("/api/public/forms/{id}/draft", formId)
                .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isNoContent());
    }

    @Test
    @Order(2)
    void getDraftReturns204WhenNotAuthenticated() throws Exception {
        mockMvc.perform(get("/api/public/forms/{id}/draft", formId))
                .andExpect(status().isNoContent());
    }

    @Test
    @Order(3)
    void createDraftViaUpsert() throws Exception {
        Map<String, Object> draftData = Map.of(
                "full_name", "Partial Entry",
                "email", ""
        );
        Map<String, Object> requestBody = Map.of("data", draftData);

        mockMvc.perform(put("/api/public/forms/{id}/draft", formId)
                .header("Authorization", "Bearer " + userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.data.full_name").value("Partial Entry"));
    }

    @Test
    @Order(4)
    void getDraftReturnsSavedDraft() throws Exception {
        mockMvc.perform(get("/api/public/forms/{id}/draft", formId)
                .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.data.full_name").value("Partial Entry"));
    }

    @Test
    @Order(5)
    void updateExistingDraft() throws Exception {
        Map<String, Object> updatedData = Map.of(
                "full_name", "Updated Name",
                "email", "updated@example.com"
        );
        Map<String, Object> requestBody = Map.of("data", updatedData);

        mockMvc.perform(put("/api/public/forms/{id}/draft", formId)
                .header("Authorization", "Bearer " + userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.data.full_name").value("Updated Name"))
                .andExpect(jsonPath("$.data.email").value("updated@example.com"));
    }

    @Test
    @Order(6)
    void getDraftReturnsUpdatedData() throws Exception {
        mockMvc.perform(get("/api/public/forms/{id}/draft", formId)
                .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.full_name").value("Updated Name"))
                .andExpect(jsonPath("$.data.email").value("updated@example.com"));
    }

    @Test
    @Order(7)
    void upsertDraftFailsWithoutAuth() throws Exception {
        Map<String, Object> draftData = Map.of("full_name", "No Auth");
        Map<String, Object> requestBody = Map.of("data", draftData);

        mockMvc.perform(put("/api/public/forms/{id}/draft", formId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(8)
    void otherUserDoesNotSeeDraft() throws Exception {
        // Admin should not see the draft user's draft
        mockMvc.perform(get("/api/public/forms/{id}/draft", formId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());
    }

    @Test
    @Order(9)
    void submitConvertsDraftToSubmitted() throws Exception {
        Map<String, Object> submissionData = Map.of(
                "full_name", "Final Submission",
                "email", "final@example.com"
        );
        Map<String, Object> requestBody = Map.of("data", submissionData);

        mockMvc.perform(post("/api/public/forms/{id}/submit", formId)
                .header("Authorization", "Bearer " + userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("SUBMITTED"))
                .andExpect(jsonPath("$.data.full_name").value("Final Submission"));
    }

    @Test
    @Order(10)
    void getDraftReturns204AfterSubmission() throws Exception {
        // Draft should be gone — it was converted to SUBMITTED
        mockMvc.perform(get("/api/public/forms/{id}/draft", formId)
                .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isNoContent());
    }

    @Test
    @Order(11)
    void submitWithoutDraftWorksNormally() throws Exception {
        // Unauthenticated submit (no draft to convert)
        Map<String, Object> submissionData = Map.of(
                "full_name", "Anonymous User",
                "email", "anon@example.com"
        );
        Map<String, Object> requestBody = Map.of("data", submissionData);

        mockMvc.perform(post("/api/public/forms/{id}/submit", formId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("SUBMITTED"))
                .andExpect(jsonPath("$.data.full_name").value("Anonymous User"));
    }

    @Test
    @Order(12)
    void submitWithDraftStillValidates() throws Exception {
        // Create a new draft first
        Map<String, Object> draftData = Map.of("email", "partial@example.com");
        Map<String, Object> draftBody = Map.of("data", draftData);

        mockMvc.perform(put("/api/public/forms/{id}/draft", formId)
                .header("Authorization", "Bearer " + userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(draftBody)))
                .andExpect(status().isOk());

        // Try to submit with missing required field — should fail validation
        Map<String, Object> incompleteData = Map.of("email", "incomplete@example.com");
        Map<String, Object> submitBody = Map.of("data", incompleteData);

        mockMvc.perform(post("/api/public/forms/{id}/submit", formId)
                .header("Authorization", "Bearer " + userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(submitBody)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(13)
    void cleanUp() throws Exception {
        mockMvc.perform(delete("/api/forms/{id}", formId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());
    }
}
