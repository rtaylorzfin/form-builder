# Claude Context - Spring Boot Form Builder

## Project Status: COMPLETE

## What Was Built

Full-stack form builder application with:

### Backend (Spring Boot - `/server`)
- **Port**: 8080
- **Database**: PostgreSQL 16 (via Docker Compose, all environments)
- **API Docs**: http://localhost:8080/swagger-ui/index.html

**Entities:**
- `User` - id, email, password, name, role (ADMIN/USER), timestamps
- `Form` - id, name, description, user_id, status (DRAFT/PUBLISHED/ARCHIVED), timestamps
- `FormPage` - id, form_id, pageNumber, title, description, timestamps
- `FormElement` - id, form_id, type, label, fieldName, sortOrder, configuration (JSON), page_id, parent_element_id, timestamps
- `Submission` - id, form_id, user_id, data (JSON), status, submittedAt, ipAddress, userAgent

**Element Types:** TEXT_INPUT, TEXT_AREA, NUMBER, EMAIL, DATE, CHECKBOX, RADIO_GROUP, SELECT, ELEMENT_GROUP, STATIC_TEXT

**Key features:**
- Nested element groups up to 5 levels deep, each independently repeatable
- Multi-page wizard-style forms with per-page validation
- User roles: ADMIN (first registered user) can manage forms; USER can only fill published forms
- Method-level security with `@PreAuthorize("hasRole('ADMIN')")` on write endpoints
- Form import/export as JSON
- Submission CSV export

**API Endpoints:**
- `POST /api/auth/register` / `POST /api/auth/login` - Auth
- `GET /api/auth/me` - Current user info
- `GET/POST /api/forms` - List/Create forms
- `GET/PUT/DELETE /api/forms/{id}` - CRUD operations
- `POST /api/forms/{id}/publish` - Publish form
- `GET /api/forms/{id}/export` - Export form JSON (ADMIN)
- `POST /api/forms/import` - Import form JSON (ADMIN)
- `GET/POST /api/forms/{formId}/elements` - Manage elements
- `PUT /api/forms/{formId}/elements/reorder` - Reorder elements
- `GET/POST /api/forms/{formId}/pages` - Manage pages
- `PUT /api/forms/{formId}/pages/reorder` - Reorder pages
- `GET /api/public/forms/{id}` - Get published form (public)
- `POST /api/public/forms/{id}/submit` - Submit response (public)
- `GET /api/forms/{formId}/submissions` - List submissions
- `GET /api/forms/{formId}/submissions/{id}` - Get submission
- `PUT /api/forms/{formId}/submissions/{id}` - Update submission
- `GET /api/forms/{formId}/submissions/export` - CSV export (ADMIN)

### Frontend (React + Vite - `/client`)
- **Port**: 5173
- **Proxy**: `/api` -> `http://localhost:8080`

**Key Components:**
- `FormBuilder` - Click-to-add builder with element palette
- `ElementPalette` - Clickable element types (supports adding to groups)
- `Canvas` - Element list with depth-colored nested groups
- `ElementConfigPanel` - Property editor for selected element
- `FormRenderer` - Form rendering with recursive Zod validation
- `MultiPageFormRenderer` - Wizard-style multi-page forms
- `FormList` / `SubmissionList` - Dashboard components (role-aware)

**State Management:**
- Zustand (`formBuilderStore`) - Builder state with recursive tree operations
- Zustand (`authStore`) - Auth state with `isAdmin()` helper
- TanStack Query - Server state/caching

**Routes:**
- `/login` / `/register` - Authentication
- `/` - Home (form list, role-aware)
- `/forms/:formId/edit` - Form builder (admin only)
- `/forms/:formId/preview` - Preview mode
- `/forms/:formId/submissions` - Submissions dashboard
- `/f/:formId` - Public form (standalone page)

## Commands

```bash
# PostgreSQL (required for all environments)
docker compose up -d

# Backend
cd server
mvn spring-boot:run -Dspring-boot.run.profiles=dev    # Run server
mvn test                                                # Run tests (18 tests)

# Frontend
cd client
npm install          # Install deps
npm run dev          # Dev server
npm run build        # Production build
npm test             # Run tests (53 tests)
npm run test:watch   # Watch mode
```

## Admin Management

Promote a user to ADMIN:
```bash
cd server
mvn spring-boot:run -Dspring-boot.run.arguments="--promote-admin=user@example.com"
```

## Testing

### Backend (18 tests)
- JUnit 5 with `@TestMethodOrder` for ordered test execution
- Tests against `formbuilder_test` database (Docker Compose PostgreSQL)
- `TestFlywayConfig` provides clean+migrate between runs
- Covers: registration, login, form CRUD, publishing, submissions, role-based access (403 for USER), full-page group submissions

### Frontend (53 tests, 3 suites)
- **Vitest** + **jsdom** environment
- **Testing Library** for React component testing
- **MSW** (Mock Service Worker) for API mocking
- **formBuilderStore.test.ts** (23 tests): Store operations, nested groups, element movement
- **FormRenderer.test.tsx** (19 tests): All field types, validation, groups, submit states
- **FormList.test.tsx** (11 tests): Integration with MSW, role-based UI visibility

## Flyway Migrations
- V1: users, forms tables
- V2: form_elements table
- V3: submissions table
- V4: element groups (parent_element_id), repeatable fields
- V5: form_pages table, multi-page support
- V6: require page_id for elements (uses `gen_random_uuid()`)
- V7: submission user_id column (links submissions to users)
