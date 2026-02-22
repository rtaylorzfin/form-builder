# Claude Context - Spring Boot Form Builder

## Project Status: COMPLETE (Initial Implementation)

## What Was Built

Full-stack form builder application with:

### Backend (Spring Boot - `/server`)
- **Port**: 8080
- **Database**: H2 (file-based at `./data/formbuilder`)
- **API Docs**: http://localhost:8080/swagger-ui/index.html

**Entities:**
- `Form` - id, name, description, status (DRAFT/PUBLISHED/ARCHIVED), timestamps
- `FormElement` - id, form_id, type, label, fieldName, sortOrder, configuration (JSON)
- `Submission` - id, form_id, data (JSON), submittedAt, ipAddress, userAgent

**Element Types:** TEXT_INPUT, TEXT_AREA, NUMBER, EMAIL, DATE, CHECKBOX, RADIO_GROUP, SELECT

**API Endpoints:**
- `GET/POST /api/forms` - List/Create forms
- `GET/PUT/DELETE /api/forms/{id}` - CRUD operations
- `POST /api/forms/{id}/publish` - Publish form
- `GET/POST /api/forms/{formId}/elements` - Manage elements
- `PUT /api/forms/{formId}/elements/reorder` - Reorder elements
- `GET /api/public/forms/{id}` - Get published form (public)
- `POST /api/public/forms/{id}/submit` - Submit response
- `GET /api/forms/{formId}/submissions` - List submissions
- `GET /api/forms/{formId}/submissions/export` - CSV export

### Frontend (React + Vite - `/client`)
- **Port**: 5173
- **Proxy**: `/api` -> `http://localhost:8080`

**Key Components:**
- `FormBuilder` - Drag-and-drop builder with dnd-kit
- `ElementPalette` - Draggable element types
- `Canvas` - Sortable drop zone
- `ElementConfigPanel` - Property editor
- `FormRenderer` - Form preview/submission with Zod validation
- `FormList` / `SubmissionList` - Dashboard components

**State Management:**
- Zustand (`formBuilderStore`) - Builder state
- TanStack Query - Server state/caching

**Routes:**
- `/` - Home (form list)
- `/forms/:formId/edit` - Form builder
- `/forms/:formId/preview` - Preview mode
- `/forms/:formId/submissions` - Submissions dashboard
- `/f/:formId` - Public form (standalone page)

## Commands

```bash
# Backend
cd server
mvn spring-boot:run        # Run server
mvn test                   # Run tests (4 tests)

# Frontend
cd client
npm install                # Install deps
npm run dev                # Dev server
npm run build              # Production build
```

## Current State

- Git initialized with initial commit: `bdc89da`
- Backend tests: 4/4 passing
- Frontend builds successfully
- Test data exists: 1 form ("Contact Form"), 4 elements, 2 submissions

## Test Form ID
`93a70b3f-2887-41ff-bfca-8acf3247e037` (PUBLISHED)

## Potential Next Steps

1. Add more element types (file upload, signature, rating)
2. Form templates/duplication
3. Conditional logic (show/hide based on answers)
4. Multi-page forms
5. Form analytics/charts
6. User authentication
7. PostgreSQL for production
8. Docker deployment
9. E2E tests with Playwright/Cypress
