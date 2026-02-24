# Architecture

## Overview

A full-stack form builder that lets admins design multi-page forms through a drag-and-drop UI and collect submissions from end users via shareable public links.

**Stack:**
- **Backend:** Spring Boot 3.2.1, Java 17, Spring Data JPA, Spring Security, Flyway, Lombok
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Radix UI primitives
- **Database:** PostgreSQL 16 (all environments)
- **Auth:** Stateless JWT (jjwt 0.12.3), BCrypt password hashing
- **API docs:** SpringDoc OpenAPI (Swagger UI at `/swagger-ui.html`)

The backend is a Maven project in `server/`. The frontend is a Vite/TypeScript project in `client/`. A `docker-compose.yml` at the root provides a PostgreSQL instance for local development.

---

## Backend Architecture

### Package structure

All packages live under `com.formbuilder`:

```
com.formbuilder/
  FormBuilderApplication.java       # @SpringBootApplication entry point
  auth/
    User.java                        # JPA entity, implements UserDetails
    UserRole.java                    # Enum: ADMIN, USER
    UserRepository.java
    AuthService.java                 # Register, login, first-user-is-admin logic
    AuthController.java              # POST /api/auth/register, /login, GET /me
    AuthDTO.java                     # RegisterRequest, LoginRequest, AuthResponse, UserResponse
    JwtService.java                  # Token generation and validation (HMAC-SHA)
    JwtAuthenticationFilter.java     # OncePerRequestFilter, extracts Bearer token
    CustomUserDetailsService.java    # Loads User by email for Spring Security
    PromoteAdminRunner.java          # CLI: --promote-admin=<email>
  config/
    SecurityConfig.java              # Filter chain, stateless sessions, @EnableMethodSecurity
    CorsConfig.java
    JacksonConfig.java
    OpenApiConfig.java
  form/
    Form.java                        # JPA entity: id, name, description, status, user
    FormStatus.java                  # Enum: DRAFT, PUBLISHED, ARCHIVED
    FormRepository.java              # JPQL: findByIdWithElements, findPublishedByIdWithElements
    FormService.java                 # CRUD, publish, ownership verification, import/export
    FormController.java              # /api/forms  -- @PreAuthorize("hasRole('ADMIN')") on mutating endpoints
    FormDTO.java                     # Response, ListResponse, CreateRequest, UpdateRequest, ExportResponse, ImportRequest
  page/
    FormPage.java                    # JPA entity: id, form, pageNumber, title, description
    FormPageRepository.java
    FormPageService.java             # CRUD, reorder, delete (reassigns orphaned elements)
    FormPageController.java          # /api/forms/{formId}/pages
    FormPageDTO.java
  element/
    FormElement.java                 # JPA entity with self-referential parent_element_id FK
    ElementType.java                 # Enum: TEXT_INPUT, TEXT_AREA, NUMBER, EMAIL, DATE, CHECKBOX, RADIO_GROUP, SELECT, ELEMENT_GROUP, STATIC_TEXT
    ElementConfiguration.java        # POJO: placeholder, required, minLength, maxLength, min, max, pattern, options, repeatable, minInstances, maxInstances, instanceLabel, content, fullPage, allowOther
    JsonConverter.java               # JPA AttributeConverter<ElementConfiguration, String>
    FormElementRepository.java
    FormElementService.java          # CRUD, reorder, nesting depth validation (max 5 levels)
    FormElementController.java       # /api/forms/{formId}/elements
    FormElementDTO.java              # Response (recursive children), CreateRequest, UpdateRequest, ReorderRequest, toTreeResponse()
  submission/
    Submission.java                  # JPA entity: form, user, data (JSON TEXT), status, ipAddress, userAgent
    SubmissionStatus.java            # Enum: DRAFT, SUBMITTED
    SubmissionRepository.java
    SubmissionService.java           # CRUD, server-side validation, CSV export, paginated listing
    SubmissionController.java        # /api/forms/{formId}/submissions  -- CSV export is @PreAuthorize("hasRole('ADMIN')")
    PublicFormController.java        # /api/public/forms/{id} and /api/public/forms/{id}/submit  -- no auth required
    SubmissionDTO.java               # Response, PageResponse, CreateRequest, UpdateRequest
  exception/
    ResourceNotFoundException.java
    ValidationException.java
    GlobalExceptionHandler.java      # @RestControllerAdvice, structured ErrorResponse with fieldErrors map
```

### Layered pattern

Every domain follows **Controller -> Service -> Repository** with DTOs separating the API contract from JPA entities:

1. **Controller** -- receives HTTP requests, delegates to service, returns `ResponseEntity<DTO>`. Annotated with `@Tag` and `@Operation` for OpenAPI.
2. **Service** -- transactional business logic (`@Transactional`). Converts between entities and DTOs. Validates business rules (nesting depth, publish preconditions, ownership).
3. **Repository** -- Spring Data JPA interfaces extending `JpaRepository<Entity, UUID>`. Custom JPQL queries for eager fetching (`findByIdWithElements`) and aggregation (`findMaxSortOrder`).

### Self-referential parent_element_id FK for nested groups

`FormElement` has a self-referential `@ManyToOne` to itself via `parent_element_id`:

```java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "parent_element_id")
private FormElement parentElement;

@OneToMany(mappedBy = "parentElement", cascade = CascadeType.ALL, orphanRemoval = true)
@OrderBy("sortOrder ASC")
private List<FormElement> children = new ArrayList<>();
```

Only elements of type `ELEMENT_GROUP` may have children. Nesting is capped at 5 levels deep -- enforced in `FormElementService.createElement()` by walking ancestor pointers. The database FK uses `ON DELETE CASCADE`, so deleting a group removes all descendants.

### JSON configuration column

Each element has a `configuration TEXT` column that stores an `ElementConfiguration` POJO serialized to JSON via a JPA `AttributeConverter` (`JsonConverter`). This single column holds all type-specific settings:

- Validation rules: `required`, `minLength`, `maxLength`, `min`, `max`, `pattern`, `patternMessage`
- Presentation: `placeholder`, `defaultValue`, `content` (HTML for STATIC_TEXT)
- Options: `options` (list of label/value pairs for RADIO_GROUP, SELECT)
- Repeatable groups/fields: `repeatable`, `minInstances`, `maxInstances`, `instanceLabel`
- Layout: `fullPage`
- Choice fields: `allowOther` (renders an "Other (please specify)" option with text input for RADIO_GROUP, SELECT, CHECKBOX_GROUP; stored as `other:user text`)

New configuration properties can be added to `ElementConfiguration` without database migrations.

### Flyway migrations (V1-V7)

| Migration | Purpose |
|-----------|---------|
| V1 | Initial schema: `forms`, `form_elements`, `submissions` tables with indexes |
| V2 | Add `parent_element_id` self-referential FK for element grouping |
| V3 | Add `updated_at` and `status` columns to `submissions` for draft/edit support |
| V4 | Create `users` table, add `user_id` FK to `forms` |
| V5 | Create `form_pages` table, add `page_id` FK to `form_elements` |
| V6 | Make `page_id` NOT NULL: creates default page per form, reassigns orphaned elements |
| V7 | Add `user_id` FK to `submissions` |

### Method-level security

`SecurityConfig` enables `@EnableMethodSecurity`. The filter chain enforces:

- `/api/auth/**` and `/api/public/**` -- `permitAll()` (registration, login, public form viewing/submission)
- `/api/**` -- `authenticated()` (requires valid JWT)
- Swagger UI paths -- `permitAll()`

Individual controller methods use `@PreAuthorize("hasRole('ADMIN')")` for granular access:

- `FormController`: create, update, publish, delete, export, import all require ADMIN
- `SubmissionController`: CSV export requires ADMIN
- `FormElementController` and `FormPageController`: accessible to any authenticated user (ownership verified in service layer)

The `User` entity maps its `UserRole` to a Spring Security authority as `ROLE_ADMIN` or `ROLE_USER`.

---

## Frontend Architecture

### Component organization

```
client/src/
  main.tsx                        # React root, QueryClientProvider, BrowserRouter
  App.tsx                         # Route definitions, ProtectedRoute/AdminRoute wrappers
  api/
    client.ts                     # Axios instance with JWT interceptor, API modules (formsApi, elementsApi, pagesApi, publicApi, submissionsApi, authApi)
    types.ts                      # TypeScript interfaces mirroring backend DTOs
  stores/
    authStore.ts                  # Zustand + persist middleware: token, user, isAdmin()
    formBuilderStore.ts           # Zustand: form, elements (recursive tree), pages, selection, reorder
  components/
    ProtectedRoute.tsx            # Redirects to /login if not authenticated
    Layout.tsx                    # App shell with nav, Outlet
    builder/
      FormBuilder.tsx             # Main builder: loads form via React Query, orchestrates palette/canvas/config
      ElementPalette.tsx          # Sidebar listing 10 element types as clickable buttons
      Canvas.tsx                  # Displays element tree for current page
      ElementConfigPanel.tsx      # Right sidebar: edits selected element's label, fieldName, configuration
    preview/
      FormRenderer.tsx            # Single-page: builds Zod schema from elements, renders react-hook-form
      MultiPageFormRenderer.tsx   # Multi-page wizard: per-page validation, progress bar, prev/next navigation
      SubmissionPrintView.tsx     # Read-only submission view: renders all pages as static label/value pairs for review/printing
    dashboard/
      FormList.tsx                # Lists forms with admin/user-specific actions
      SubmissionList.tsx          # Paginated submission table with CSV export
    ui/                           # Radix UI-based primitives: button, input, textarea, label, card, checkbox, radio-group, select, dialog, toast, badge
  pages/
    HomePage.tsx                  # Dashboard with FormList
    FormBuilderPage.tsx           # Admin-only, wraps FormBuilder
    FormPreviewPage.tsx           # Preview of form before publishing
    PublicFormPage.tsx             # /f/:formId -- public form submission page
    SubmissionsPage.tsx           # View submissions for a form
    SubmissionEditPage.tsx        # Edit an existing submission
    SubmissionViewPage.tsx        # Read-only print view of a submission
    LoginPage.tsx
    RegisterPage.tsx
```

### Zustand stores

**`authStore`** -- persisted to `localStorage` via Zustand's `persist` middleware:
- `token: string | null` -- JWT token
- `user: { id, email, name, role } | null`
- `setAuth(token, user)`, `logout()`, `isAuthenticated()`, `isAdmin()`

The Axios client reads the token from `localStorage('auth-storage')` on each request via a request interceptor. A response interceptor clears auth and redirects to `/login` on 401.

**`formBuilderStore`** -- manages the builder's client-side state:
- `form`, `elements` (recursive tree), `pages`, `currentPageIndex`, `selectedElementId`, `isDirty`
- Recursive tree operations: `findElementById`, `removeElementFromTree`, `addChildToGroup`, `updateElementInTree`, `moveChildUp`, `moveChildDown`
- `createNewElement(type, sortOrder)` -- factory that produces an element with sensible defaults per type

### TanStack React Query

Server state is managed with `@tanstack/react-query` v5:
- `useQuery` for fetching forms, elements, pages, submissions
- `useMutation` for create/update/delete operations with `onSuccess` callbacks that `invalidateQueries` to refresh
- Query keys follow the pattern `['form', formId]`, `['submissions', formId]`

### Dynamic Zod schema generation

`FormRenderer` and `MultiPageFormRenderer` build Zod validation schemas at render time from the element tree:

1. `buildFieldSchema(element)` -- maps element type + configuration to a Zod type (e.g., `z.string().min(1)` for required text, `z.coerce.number()` for NUMBER, `z.boolean().refine()` for required CHECKBOX)
2. `buildGroupObjectSchema(children)` -- recursively builds `z.object({...})` for group children
3. `buildValidationSchema(elements)` -- top-level schema; handles repeatable groups as `z.array(groupObj)` with min/max, non-repeatable groups flatten children into the parent schema
4. The generated schema is passed to `react-hook-form` via `zodResolver(schema)`

### Routing

```
/login                                 -- LoginPage (public)
/register                              -- RegisterPage (public)
/                                      -- ProtectedRoute > Layout > HomePage
/forms/:formId/edit                    -- ProtectedRoute > AdminRoute > FormBuilderPage
/forms/:formId/preview                 -- ProtectedRoute > FormPreviewPage
/forms/:formId/submissions             -- ProtectedRoute > SubmissionsPage
/forms/:formId/submissions/:id/edit    -- ProtectedRoute > SubmissionEditPage
/forms/:formId/submissions/:id/view    -- ProtectedRoute > SubmissionViewPage
/f/:formId                             -- PublicFormPage (public, no auth)
```

`ProtectedRoute` checks `authStore.isAuthenticated()` and redirects to `/login`.
`AdminRoute` checks `authStore.isAdmin()` and redirects to `/` if the user is not an admin.

---

## Design Decisions

### PostgreSQL-only

All environments (dev, test, prod) use PostgreSQL. There is no H2 or in-memory fallback. This ensures migration and query behavior is identical everywhere, eliminating a class of "works in dev, breaks in prod" bugs. The tradeoff is requiring Docker for local development, which `docker-compose.yml` handles.

### Self-referential FK for groups

Rather than a separate `groups` table with a join, `ELEMENT_GROUP` is just another `ElementType` in the same `form_elements` table with a self-referential `parent_element_id` FK. This simplifies the data model -- groups and fields share the same table, ordering, and CRUD endpoints. `CASCADE DELETE` on the FK handles recursive deletion automatically. Nesting depth is enforced in application code (max 5 levels).

### JSON config column

`ElementConfiguration` is stored as a single JSON `TEXT` column rather than separate columns or a related table for each config property. This avoids needing a migration every time a new property is added (e.g., `repeatable`, `content`, `fullPage` were all added without schema changes). The `JsonConverter` JPA `AttributeConverter` handles serialization transparently. The tradeoff is that configuration fields cannot be indexed or queried via SQL, which is acceptable because config is always loaded with its parent element.

### Dual validation (Zod + backend)

Form submissions are validated on both sides:
- **Frontend (Zod):** Provides instant field-level feedback via `react-hook-form`. The Zod schema is dynamically generated from the element definitions, so validation rules are defined once (in element configuration) and applied automatically.
- **Backend (SubmissionService):** Re-validates all fields, including required checks, min/max length, regex patterns, and repeatable instance counts. This protects against API calls that bypass the UI.

### Stateless JWT

Sessions are fully stateless -- the JWT contains the user's email as the subject, and the backend validates it on each request via `JwtAuthenticationFilter`. No server-side session store is needed. The token is stored in the browser's `localStorage` (via Zustand's `persist` middleware) and attached to every API request by an Axios interceptor. Expiration is configurable via `jwt.expiration` (default: 24 hours).

### First-user-is-admin

`AuthService.register()` checks `userRepository.count() == 0`. If the database has no users, the first registered user gets `UserRole.ADMIN`; all subsequent users get `UserRole.USER`. This eliminates the need for seed data or manual database intervention during initial setup. For promoting additional admins, a CLI command is provided: `--promote-admin=<email>` (implemented in `PromoteAdminRunner`).

### Immediate element creation via API

When a user clicks an element type in the palette, the frontend immediately sends a `POST /api/forms/{formId}/elements` request. The element is persisted in the database right away. Subsequent "Save" actions only update element properties (label, fieldName, configuration) and reorder. This means the element list is always consistent with the database and avoids the complexity of batching creates.

### Method-level @PreAuthorize

Authorization is enforced at the controller method level using `@PreAuthorize("hasRole('ADMIN')")` rather than URL-pattern-based rules in the security filter chain. This keeps authorization rules close to the business logic they protect, makes them visible in the code alongside the endpoint, and allows mixing public and protected endpoints within the same controller (e.g., `FormController` has all-ADMIN mutations, while `SubmissionController` has a mix).

---

## Data Flow

### Form creation through builder to persistence

1. Admin clicks "New Form" on the dashboard, triggering `POST /api/forms` with a name.
2. `FormService.createForm()` persists a `Form` (status=DRAFT) and a default `FormPage` ("Page 1").
3. The builder page loads the form via `GET /api/forms/{id}` (React Query), populating `formBuilderStore`.
4. Admin clicks an element type in `ElementPalette`. `FormBuilder.handleAddElement()` calls `createNewElement()` for defaults, then fires `POST /api/forms/{formId}/elements`.
5. The API responds with the persisted element (including server-generated UUID). The store adds it to `elements[]` (or to a group's `children[]` if a group is selected).
6. Admin configures the element in `ElementConfigPanel`, which calls `formBuilderStore.updateElement()` to update the local tree and sets `isDirty=true`.
7. Admin clicks "Save". `saveElementsMutation` iterates all elements, calling `PUT /api/forms/{formId}/elements/{id}` for each, plus a reorder call. `isDirty` resets to `false`.
8. Admin clicks "Publish". `POST /api/forms/{id}/publish` sets status=PUBLISHED and records `publishedAt`.

### Form rendering: elements to Zod schema to react-hook-form to submission

1. Public user navigates to `/f/:formId`. `PublicFormPage` fetches the form via `GET /api/public/forms/{id}`.
2. If the form has multiple pages, `MultiPageFormRenderer` is used; otherwise `FormRenderer`.
3. The renderer calls `buildValidationSchema(elements)`, which walks the element tree and produces a `z.object({...})` schema mapping each `fieldName` to a Zod type derived from `element.type` and `element.configuration`.
4. The schema is passed to `useForm({ resolver: zodResolver(schema) })`.
5. Each element is rendered as the appropriate input (Input, Textarea, Select, RadioGroup, Checkbox, etc.) via the `RenderElement` component. Groups render as `<fieldset>`. Repeatable groups use `useFieldArray`.
6. On submit, `react-hook-form` validates against the Zod schema. If valid, `onSubmit` fires `POST /api/public/forms/{id}/submit` with `{ data: {...}, status: "SUBMITTED" }`.
7. Backend `SubmissionService.createSubmission()` re-validates the data against element definitions, serializes it to JSON, and persists a `Submission` row with IP address and user agent.

### Multi-page wizard

1. `MultiPageFormRenderer` receives `pages[]`, each containing its `elements[]`.
2. A single `useForm` instance holds state across all pages, backed by `buildFullSchema(pages)` covering all fields.
3. Only the current page's elements are rendered. The progress bar shows `page N of M`.
4. "Next" button calls `trigger(fieldNames)` with only the current page's field names (from `buildPageSchema(page)`). Navigation advances only if the current page validates.
5. "Previous" button navigates back without validation.
6. On the last page, the "Submit" button triggers the full form submission.

---

## Testing

### Backend: JUnit 5 + MockMvc

`FormBuilderApplicationTests` is a `@SpringBootTest` integration test that runs against a real PostgreSQL database (`formbuilder_test`):

- **`TestFlywayConfig`:** Provides a `FlywayMigrationStrategy` that calls `flyway.clean()` then `flyway.migrate()` before each test run, ensuring a fresh schema.
- **Test database:** Configured in `server/src/test/resources/application.properties` pointing to `jdbc:postgresql://localhost:5432/formbuilder_test` with `flyway.clean-disabled=false`.
- **Tests are ordered** (`@TestMethodOrder(MethodOrderer.OrderAnnotation.class)`, `@TestInstance(PER_CLASS)`) to test a full lifecycle: context load, form+element CRUD, publish, public access, validation errors, 404s, unauthenticated access (403), and role-based access (USER cannot create forms).
- The first test registers a user (who becomes ADMIN via first-user-is-admin) and stores the JWT for subsequent requests.

### Frontend: Vitest + Testing Library + MSW

53 tests across 3 test files, run with `vitest`:

| File | Tests | Coverage |
|------|-------|----------|
| `formBuilderStore.test.ts` | 23 | Store operations: add, remove, update, reorder, move up/down (including nested children), select, addElementToGroup (including deep nesting), pages, setForm, createNewElement, reset |
| `FormRenderer.test.tsx` | 19 | Field rendering for all 10 element types, required indicator, Zod validation (required text, required email, successful submission), group rendering (non-repeatable fieldset, repeatable with instance controls), submit button states (custom label, submitting, readOnly) |
| `FormList.test.tsx` | 11 | Loading state, form card rendering, descriptions, element counts, status badges, admin actions (Edit, Import, Submissions), user role restrictions (no Edit, no Import, Fill Form for published) |

**Test infrastructure:**
- `test/setup.ts` -- Sets up MSW server, `@testing-library/jest-dom/vitest` matchers, and a `ResizeObserver` polyfill for Radix UI in jsdom.
- `test/mocks/server.ts` -- MSW `setupServer` instance.
- `test/mocks/handlers.ts` -- Mock handlers for `GET /api/forms`, `DELETE /api/forms/:id`, `POST /api/forms/import`.
- Tests use `renderWithProviders()` helper that wraps components in `QueryClientProvider` and `MemoryRouter`.
