package com.formbuilder;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.formbuilder.auth.AuthDTO;
import com.formbuilder.element.ElementConfiguration;
import com.formbuilder.element.ElementType;
import com.formbuilder.form.FormDTO;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests import/export of forms, including PAGE_BREAK elements and round-trip fidelity.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestFlywayConfig.class)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class ImportExportTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String adminToken;
    private String importedFormId;
    private String pageBreakFormId;

    @BeforeAll
    void setup() throws Exception {
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
    void importExampleFormJson() throws Exception {
        // Read the example JSON file
        Path examplePath = Path.of("../examples/zebrafish-line-submission.json");
        String json = Files.readString(examplePath);

        MvcResult result = mockMvc.perform(post("/api/forms/import")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Submit a Line"))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andReturn();

        FormDTO.Response response = objectMapper.readValue(
                result.getResponse().getContentAsString(), FormDTO.Response.class);
        importedFormId = response.getId().toString();
    }

    @Test
    @Order(2)
    void importedFormHasCorrectStructure() throws Exception {
        mockMvc.perform(get("/api/forms/{id}", importedFormId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Submit a Line"))
                .andExpect(jsonPath("$.pages.length()").value(6))
                .andExpect(jsonPath("$.elements.length()").value(24))
                // Check page titles
                .andExpect(jsonPath("$.pages[0].title").value("Page 1"))
                .andExpect(jsonPath("$.pages[3].title").value("Linked Features"))
                .andExpect(jsonPath("$.pages[5].title").value("Additional Information"));
    }

    @Test
    @Order(3)
    void importedFormHasNestedGroups() throws Exception {
        // The Mutations group should be a fullPage repeatable group with nested children
        mockMvc.perform(get("/api/forms/{id}", importedFormId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                // Find the Mutations element (an ELEMENT_GROUP with children)
                .andExpect(jsonPath("$.elements[?(@.fieldName=='mutations')].type").value("ELEMENT_GROUP"))
                .andExpect(jsonPath("$.elements[?(@.fieldName=='mutations')].configuration.repeatable").value(true))
                .andExpect(jsonPath("$.elements[?(@.fieldName=='mutations')].configuration.fullPage").value(true))
                .andExpect(jsonPath("$.elements[?(@.fieldName=='mutations')].configuration.instanceLabel").value("Mutation"))
                .andExpect(jsonPath("$.elements[?(@.fieldName=='mutations')].children").isNotEmpty());
    }

    @Test
    @Order(4)
    void exportFormPreservesStructure() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/forms/{id}/export", importedFormId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Submit a Line"))
                .andExpect(jsonPath("$.pages.length()").value(6))
                .andExpect(jsonPath("$.elements").isNotEmpty())
                .andReturn();

        // Verify the export can be deserialized
        FormDTO.ExportResponse export = objectMapper.readValue(
                result.getResponse().getContentAsString(), FormDTO.ExportResponse.class);
        Assertions.assertEquals(6, export.getPages().size());
        Assertions.assertFalse(export.getElements().isEmpty());
    }

    @Test
    @Order(5)
    void exportImportRoundTrip() throws Exception {
        // Export
        MvcResult exportResult = mockMvc.perform(get("/api/forms/{id}/export", importedFormId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();

        String exportedJson = exportResult.getResponse().getContentAsString();

        // Re-import
        MvcResult reimportResult = mockMvc.perform(post("/api/forms/import")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(exportedJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Submit a Line"))
                .andReturn();

        FormDTO.Response reimported = objectMapper.readValue(
                reimportResult.getResponse().getContentAsString(), FormDTO.Response.class);
        String reimportedId = reimported.getId().toString();

        // Verify the re-imported form matches original structure
        mockMvc.perform(get("/api/forms/{id}", reimportedId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pages.length()").value(6))
                .andExpect(jsonPath("$.elements.length()").value(24));

        // Clean up re-imported form
        mockMvc.perform(delete("/api/forms/{id}", reimportedId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());
    }

    @Test
    @Order(6)
    void importFormWithPageBreakElements() throws Exception {
        // Build an import request with PAGE_BREAK elements inside a group
        FormDTO.ImportRequest importRequest = new FormDTO.ImportRequest();
        importRequest.setName("PAGE_BREAK Test Form");
        importRequest.setDescription("Tests PAGE_BREAK element storage");
        importRequest.setPages(List.of(
                FormDTO.ExportPage.builder().pageNumber(0).title("Main Page").build()
        ));

        ElementConfiguration textConfig = new ElementConfiguration();
        textConfig.setRequired(true);
        textConfig.setPlaceholder("Enter name...");

        ElementConfiguration groupConfig = new ElementConfiguration();
        groupConfig.setRepeatable(true);
        groupConfig.setFullPage(true);
        groupConfig.setInstanceLabel("Detail");

        ElementConfiguration childConfig = new ElementConfiguration();
        childConfig.setPlaceholder("Enter value...");

        ElementConfiguration pageBreakConfig = new ElementConfiguration();

        FormDTO.ExportElement child1 = FormDTO.ExportElement.builder()
                .type(ElementType.TEXT_INPUT).label("First Field")
                .fieldName("first_field").sortOrder(0).configuration(childConfig).build();

        FormDTO.ExportElement pageBreak = FormDTO.ExportElement.builder()
                .type(ElementType.PAGE_BREAK).label("Section Two")
                .fieldName("section_two").sortOrder(1).configuration(pageBreakConfig).build();

        FormDTO.ExportElement child2 = FormDTO.ExportElement.builder()
                .type(ElementType.TEXT_INPUT).label("Second Field")
                .fieldName("second_field").sortOrder(2).configuration(childConfig).build();

        FormDTO.ExportElement nameField = FormDTO.ExportElement.builder()
                .type(ElementType.TEXT_INPUT).label("Name")
                .fieldName("name").sortOrder(0).pageIndex(0).configuration(textConfig).build();

        FormDTO.ExportElement detailsGroup = FormDTO.ExportElement.builder()
                .type(ElementType.ELEMENT_GROUP).label("Details")
                .fieldName("details").sortOrder(1).pageIndex(0).configuration(groupConfig)
                .children(List.of(child1, pageBreak, child2)).build();

        importRequest.setElements(List.of(nameField, detailsGroup));

        MvcResult result = mockMvc.perform(post("/api/forms/import")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(importRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("PAGE_BREAK Test Form"))
                .andReturn();

        FormDTO.Response response = objectMapper.readValue(
                result.getResponse().getContentAsString(), FormDTO.Response.class);
        pageBreakFormId = response.getId().toString();
    }

    @Test
    @Order(7)
    void pageBreakElementStoredCorrectly() throws Exception {
        mockMvc.perform(get("/api/forms/{id}", pageBreakFormId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pages.length()").value(1))
                .andExpect(jsonPath("$.elements.length()").value(2))
                // Verify the group has 3 children: TEXT_INPUT, PAGE_BREAK, TEXT_INPUT
                .andExpect(jsonPath("$.elements[?(@.fieldName=='details')].children.length()").value(3))
                .andExpect(jsonPath("$.elements[?(@.fieldName=='details')].children[0].type").value("TEXT_INPUT"))
                .andExpect(jsonPath("$.elements[?(@.fieldName=='details')].children[0].label").value("First Field"))
                .andExpect(jsonPath("$.elements[?(@.fieldName=='details')].children[1].type").value("PAGE_BREAK"))
                .andExpect(jsonPath("$.elements[?(@.fieldName=='details')].children[1].label").value("Section Two"))
                .andExpect(jsonPath("$.elements[?(@.fieldName=='details')].children[2].type").value("TEXT_INPUT"))
                .andExpect(jsonPath("$.elements[?(@.fieldName=='details')].children[2].label").value("Second Field"));
    }

    @Test
    @Order(8)
    void pageBreakExportRoundTrip() throws Exception {
        // Export the form with PAGE_BREAK
        MvcResult exportResult = mockMvc.perform(get("/api/forms/{id}/export", pageBreakFormId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.elements[?(@.fieldName=='details')].children[?(@.type=='PAGE_BREAK')].label")
                        .value("Section Two"))
                .andReturn();

        String exportedJson = exportResult.getResponse().getContentAsString();

        // Re-import and verify PAGE_BREAK survives round-trip
        MvcResult reimportResult = mockMvc.perform(post("/api/forms/import")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(exportedJson))
                .andExpect(status().isCreated())
                .andReturn();

        FormDTO.Response reimported = objectMapper.readValue(
                reimportResult.getResponse().getContentAsString(), FormDTO.Response.class);
        String reimportedId = reimported.getId().toString();

        // Verify PAGE_BREAK preserved
        mockMvc.perform(get("/api/forms/{id}", reimportedId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.elements[?(@.fieldName=='details')].children[1].type").value("PAGE_BREAK"))
                .andExpect(jsonPath("$.elements[?(@.fieldName=='details')].children[1].label").value("Section Two"));

        // Clean up
        mockMvc.perform(delete("/api/forms/{id}", reimportedId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());
    }

    @Test
    @Order(9)
    void importRejectsInvalidRequest() throws Exception {
        // Missing required name field
        mockMvc.perform(post("/api/forms/import")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"\", \"pages\":[], \"elements\":[]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(10)
    void importRequiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/forms/import")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Test\", \"pages\":[], \"elements\":[]}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(11)
    void cleanup() throws Exception {
        // Clean up forms created during tests
        if (importedFormId != null) {
            mockMvc.perform(delete("/api/forms/{id}", importedFormId)
                    .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isNoContent());
        }
        if (pageBreakFormId != null) {
            mockMvc.perform(delete("/api/forms/{id}", pageBreakFormId)
                    .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isNoContent());
        }
    }
}
