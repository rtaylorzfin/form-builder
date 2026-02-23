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

import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests creating a form with nested groups that have both repeatable and fullPage
 * flags set, then publishing the form and submitting data through the public API.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestFlywayConfig.class)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class FullPageGroupSubmissionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String adminToken;
    private String formId;
    private String pageId;

    @BeforeAll
    void setup() throws Exception {
        // Try logging in as the admin user created by other test classes.
        // If no users exist yet (this test runs first), register a new admin.
        String email = "admin@example.com";
        String password = "password123";

        AuthDTO.LoginRequest loginRequest = new AuthDTO.LoginRequest();
        loginRequest.setEmail(email);
        loginRequest.setPassword(password);

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andReturn();

        if (loginResult.getResponse().getStatus() == 200) {
            AuthDTO.AuthResponse authResponse = objectMapper.readValue(
                    loginResult.getResponse().getContentAsString(),
                    AuthDTO.AuthResponse.class);
            adminToken = authResponse.getToken();
        } else {
            // First test to run — register a new admin
            AuthDTO.RegisterRequest registerRequest = new AuthDTO.RegisterRequest();
            registerRequest.setName("Admin User");
            registerRequest.setEmail(email);
            registerRequest.setPassword(password);

            MvcResult result = mockMvc.perform(post("/api/auth/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(registerRequest)))
                    .andExpect(status().isCreated())
                    .andReturn();

            AuthDTO.AuthResponse authResponse = objectMapper.readValue(
                    result.getResponse().getContentAsString(),
                    AuthDTO.AuthResponse.class);
            adminToken = authResponse.getToken();
        }
    }

    @Test
    @Order(1)
    void createFormWithNestedFullPageRepeatableGroup() throws Exception {
        // Create a form
        FormDTO.CreateRequest createRequest = new FormDTO.CreateRequest();
        createRequest.setName("Employee Onboarding");
        createRequest.setDescription("Form with full-page repeatable nested groups");

        MvcResult createResult = mockMvc.perform(post("/api/forms")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Employee Onboarding"))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.pages.length()").value(1))
                .andReturn();

        FormDTO.Response form = objectMapper.readValue(
                createResult.getResponse().getContentAsString(),
                FormDTO.Response.class);
        formId = form.getId().toString();
        pageId = form.getPages().get(0).getId().toString();

        // 1. Add a top-level text field: employee_name
        FormElementDTO.CreateRequest nameElement = new FormElementDTO.CreateRequest();
        nameElement.setType(ElementType.TEXT_INPUT);
        nameElement.setLabel("Employee Name");
        nameElement.setFieldName("employee_name");
        nameElement.setPageId(java.util.UUID.fromString(pageId));
        ElementConfiguration nameConfig = new ElementConfiguration();
        nameConfig.setRequired(true);
        nameElement.setConfiguration(nameConfig);

        mockMvc.perform(post("/api/forms/{formId}/elements", formId)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(nameElement)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fieldName").value("employee_name"));

        // 2. Add a top-level group: work_history (repeatable + fullPage)
        FormElementDTO.CreateRequest groupElement = new FormElementDTO.CreateRequest();
        groupElement.setType(ElementType.ELEMENT_GROUP);
        groupElement.setLabel("Work History");
        groupElement.setFieldName("work_history");
        groupElement.setPageId(java.util.UUID.fromString(pageId));
        ElementConfiguration groupConfig = new ElementConfiguration();
        groupConfig.setRepeatable(true);
        groupConfig.setFullPage(true);
        groupConfig.setMinInstances(1);
        groupConfig.setMaxInstances(3);
        groupElement.setConfiguration(groupConfig);

        MvcResult groupResult = mockMvc.perform(post("/api/forms/{formId}/elements", formId)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(groupElement)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("ELEMENT_GROUP"))
                .andExpect(jsonPath("$.configuration.repeatable").value(true))
                .andExpect(jsonPath("$.configuration.fullPage").value(true))
                .andExpect(jsonPath("$.configuration.minInstances").value(1))
                .andExpect(jsonPath("$.configuration.maxInstances").value(3))
                .andReturn();

        FormElementDTO.Response group = objectMapper.readValue(
                groupResult.getResponse().getContentAsString(),
                FormElementDTO.Response.class);
        String groupId = group.getId().toString();

        // 3. Add child: company_name (inside work_history group)
        FormElementDTO.CreateRequest companyElement = new FormElementDTO.CreateRequest();
        companyElement.setType(ElementType.TEXT_INPUT);
        companyElement.setLabel("Company Name");
        companyElement.setFieldName("company_name");
        companyElement.setParentElementId(java.util.UUID.fromString(groupId));
        companyElement.setPageId(java.util.UUID.fromString(pageId));
        ElementConfiguration companyConfig = new ElementConfiguration();
        companyConfig.setRequired(true);
        companyElement.setConfiguration(companyConfig);

        mockMvc.perform(post("/api/forms/{formId}/elements", formId)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(companyElement)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fieldName").value("company_name"));

        // 4. Add child: job_title (inside work_history group)
        FormElementDTO.CreateRequest titleElement = new FormElementDTO.CreateRequest();
        titleElement.setType(ElementType.TEXT_INPUT);
        titleElement.setLabel("Job Title");
        titleElement.setFieldName("job_title");
        titleElement.setParentElementId(java.util.UUID.fromString(groupId));
        titleElement.setPageId(java.util.UUID.fromString(pageId));
        ElementConfiguration titleConfig = new ElementConfiguration();
        titleConfig.setRequired(true);
        titleElement.setConfiguration(titleConfig);

        mockMvc.perform(post("/api/forms/{formId}/elements", formId)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(titleElement)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fieldName").value("job_title"));

        // 5. Add child: start_date (inside work_history group)
        FormElementDTO.CreateRequest dateElement = new FormElementDTO.CreateRequest();
        dateElement.setType(ElementType.DATE);
        dateElement.setLabel("Start Date");
        dateElement.setFieldName("start_date");
        dateElement.setParentElementId(java.util.UUID.fromString(groupId));
        dateElement.setPageId(java.util.UUID.fromString(pageId));
        dateElement.setConfiguration(new ElementConfiguration());

        mockMvc.perform(post("/api/forms/{formId}/elements", formId)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dateElement)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fieldName").value("start_date"));
    }

    @Test
    @Order(2)
    void verifyFormStructure() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/forms/{id}", formId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.elements.length()").value(2))
                // First element: employee_name
                .andExpect(jsonPath("$.elements[0].fieldName").value("employee_name"))
                .andExpect(jsonPath("$.elements[0].type").value("TEXT_INPUT"))
                // Second element: work_history group
                .andExpect(jsonPath("$.elements[1].fieldName").value("work_history"))
                .andExpect(jsonPath("$.elements[1].type").value("ELEMENT_GROUP"))
                .andExpect(jsonPath("$.elements[1].configuration.repeatable").value(true))
                .andExpect(jsonPath("$.elements[1].configuration.fullPage").value(true))
                .andExpect(jsonPath("$.elements[1].configuration.minInstances").value(1))
                .andExpect(jsonPath("$.elements[1].configuration.maxInstances").value(3))
                // Group children
                .andExpect(jsonPath("$.elements[1].children.length()").value(3))
                .andExpect(jsonPath("$.elements[1].children[0].fieldName").value("company_name"))
                .andExpect(jsonPath("$.elements[1].children[1].fieldName").value("job_title"))
                .andExpect(jsonPath("$.elements[1].children[2].fieldName").value("start_date"))
                .andReturn();
    }

    @Test
    @Order(3)
    void publishForm() throws Exception {
        mockMvc.perform(post("/api/forms/{id}/publish", formId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));
    }

    @Test
    @Order(4)
    void getPublishedFormAsPublic() throws Exception {
        mockMvc.perform(get("/api/public/forms/{id}", formId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Employee Onboarding"))
                .andExpect(jsonPath("$.elements[1].configuration.fullPage").value(true))
                .andExpect(jsonPath("$.elements[1].configuration.repeatable").value(true))
                .andExpect(jsonPath("$.elements[1].children.length()").value(3));
    }

    @Test
    @Order(5)
    void submitFormWithSingleGroupInstance() throws Exception {
        Map<String, Object> submissionData = Map.of(
                "employee_name", "Jane Doe",
                "work_history", List.of(
                        Map.of(
                                "company_name", "Acme Corp",
                                "job_title", "Software Engineer",
                                "start_date", "2020-01-15"
                        )
                )
        );

        Map<String, Object> requestBody = Map.of(
                "data", submissionData,
                "status", "SUBMITTED"
        );

        mockMvc.perform(post("/api/public/forms/{id}/submit", formId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.employee_name").value("Jane Doe"))
                .andExpect(jsonPath("$.data.work_history.length()").value(1))
                .andExpect(jsonPath("$.data.work_history[0].company_name").value("Acme Corp"))
                .andExpect(jsonPath("$.data.work_history[0].job_title").value("Software Engineer"))
                .andExpect(jsonPath("$.data.work_history[0].start_date").value("2020-01-15"))
                .andExpect(jsonPath("$.status").value("SUBMITTED"));
    }

    @Test
    @Order(6)
    void submitFormWithMultipleGroupInstances() throws Exception {
        Map<String, Object> submissionData = Map.of(
                "employee_name", "John Smith",
                "work_history", List.of(
                        Map.of(
                                "company_name", "Startup Inc",
                                "job_title", "Junior Developer",
                                "start_date", "2018-06-01"
                        ),
                        Map.of(
                                "company_name", "BigTech Co",
                                "job_title", "Senior Engineer",
                                "start_date", "2021-03-15"
                        ),
                        Map.of(
                                "company_name", "Current LLC",
                                "job_title", "Tech Lead",
                                "start_date", "2024-01-10"
                        )
                )
        );

        Map<String, Object> requestBody = Map.of(
                "data", submissionData,
                "status", "SUBMITTED"
        );

        MvcResult result = mockMvc.perform(post("/api/public/forms/{id}/submit", formId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.employee_name").value("John Smith"))
                .andExpect(jsonPath("$.data.work_history.length()").value(3))
                .andExpect(jsonPath("$.data.work_history[0].company_name").value("Startup Inc"))
                .andExpect(jsonPath("$.data.work_history[1].company_name").value("BigTech Co"))
                .andExpect(jsonPath("$.data.work_history[2].company_name").value("Current LLC"))
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andReturn();

        // Verify submission is retrievable
        String submissionId = objectMapper.readTree(
                result.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(get("/api/forms/{formId}/submissions", formId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2));  // 2 submissions so far
    }

    @Test
    @Order(7)
    void rejectSubmissionExceedingMaxInstances() throws Exception {
        Map<String, Object> submissionData = Map.of(
                "employee_name", "Over Limit",
                "work_history", List.of(
                        Map.of("company_name", "A", "job_title", "A", "start_date", "2020-01-01"),
                        Map.of("company_name", "B", "job_title", "B", "start_date", "2021-01-01"),
                        Map.of("company_name", "C", "job_title", "C", "start_date", "2022-01-01"),
                        Map.of("company_name", "D", "job_title", "D", "start_date", "2023-01-01")
                )
        );

        Map<String, Object> requestBody = Map.of(
                "data", submissionData,
                "status", "SUBMITTED"
        );

        mockMvc.perform(post("/api/public/forms/{id}/submit", formId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(8)
    void rejectSubmissionMissingRequiredGroupFields() throws Exception {
        Map<String, Object> submissionData = Map.of(
                "employee_name", "Missing Fields",
                "work_history", List.of(
                        Map.of(
                                "company_name", "Has Company",
                                // job_title missing (required)
                                "start_date", "2020-01-01"
                        )
                )
        );

        Map<String, Object> requestBody = Map.of(
                "data", submissionData,
                "status", "SUBMITTED"
        );

        mockMvc.perform(post("/api/public/forms/{id}/submit", formId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(9)
    void rejectSubmissionMissingRequiredTopLevelField() throws Exception {
        Map<String, Object> submissionData = Map.of(
                // employee_name missing (required)
                "work_history", List.of(
                        Map.of(
                                "company_name", "Acme",
                                "job_title", "Dev",
                                "start_date", "2020-01-01"
                        )
                )
        );

        Map<String, Object> requestBody = Map.of(
                "data", submissionData,
                "status", "SUBMITTED"
        );

        mockMvc.perform(post("/api/public/forms/{id}/submit", formId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(10)
    void submitAndRetrievePreservesNestedData() throws Exception {
        Map<String, Object> submissionData = Map.of(
                "employee_name", "Retrieval Test",
                "work_history", List.of(
                        Map.of(
                                "company_name", "Alpha Corp",
                                "job_title", "Architect",
                                "start_date", "2019-07-22"
                        ),
                        Map.of(
                                "company_name", "Beta Inc",
                                "job_title", "CTO",
                                "start_date", "2023-11-01"
                        )
                )
        );

        Map<String, Object> requestBody = Map.of(
                "data", submissionData,
                "status", "SUBMITTED"
        );

        MvcResult submitResult = mockMvc.perform(post("/api/public/forms/{id}/submit", formId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isCreated())
                .andReturn();

        String submissionId = objectMapper.readTree(
                submitResult.getResponse().getContentAsString()).get("id").asText();

        // Retrieve the specific submission and verify all nested data is intact
        mockMvc.perform(get("/api/forms/{formId}/submissions/{submissionId}", formId, submissionId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.employee_name").value("Retrieval Test"))
                .andExpect(jsonPath("$.data.work_history.length()").value(2))
                .andExpect(jsonPath("$.data.work_history[0].company_name").value("Alpha Corp"))
                .andExpect(jsonPath("$.data.work_history[0].job_title").value("Architect"))
                .andExpect(jsonPath("$.data.work_history[0].start_date").value("2019-07-22"))
                .andExpect(jsonPath("$.data.work_history[1].company_name").value("Beta Inc"))
                .andExpect(jsonPath("$.data.work_history[1].job_title").value("CTO"))
                .andExpect(jsonPath("$.data.work_history[1].start_date").value("2023-11-01"));
    }

    @Test
    @Order(11)
    void cleanUp() throws Exception {
        mockMvc.perform(delete("/api/forms/{id}", formId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());
    }
}
