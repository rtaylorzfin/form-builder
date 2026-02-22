# Spring Boot Form Builder

A full-stack web application for building, managing, and rendering dynamic forms. Built with a Spring Boot backend and a React frontend.

## Features

### Form Builder
- **Drag & Drop Interface**: Drag form elements (Text Input, Textarea, Number, Email, Date, Checkbox, Radio Group, Select, Element Group) onto a canvas
- **Element Configuration**: Customize labels, placeholders, validation rules, and field names
- **Element Grouping**: Group related fields together; mark groups as repeatable so users can add/remove instances
- **Multi-page Forms**: Create wizard-style forms with multiple pages, per-page validation, and a progress bar

### Form Management
- **Publishing**: Publish forms to make them available via a public link
- **Submissions Dashboard**: View, edit, and manage collected responses with draft/submitted status tracking

### Authentication
- **JWT Authentication**: User registration and login with JWT-based security
- **Form Ownership**: Each form belongs to the user who created it

### Database
- **H2** for local development (zero config, file-based)
- **PostgreSQL** for production (via Docker Compose)
- **Flyway** migrations for schema management

## Technology Stack

| Layer    | Technology                                         |
|----------|----------------------------------------------------|
| Backend  | Spring Boot 3.2, Java 17, Spring Security, JPA     |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS            |
| UI       | shadcn/ui (Radix), react-hook-form, zod, dnd-kit    |
| State    | Zustand, TanStack React Query                       |
| Database | H2 (dev) / PostgreSQL 16 (prod), Flyway             |
| Auth     | JWT (jjwt 0.12.3), BCrypt                            |
| API Docs | SpringDoc OpenAPI (Swagger UI)                       |

## Prerequisites

- **Java 17+** (JDK)
- **Maven 3.8+**
- **Node.js 18+** and **npm**
- **Docker & Docker Compose** (only needed for PostgreSQL)

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd spring-boot-form-builder
```

### 2. Start the Backend (Development mode with H2)

```bash
cd server
mvn spring-boot:run
```

The backend starts on **http://localhost:8080** using an embedded H2 database. No external database setup required.

Useful dev endpoints:
- **API**: http://localhost:8080/api/
- **Swagger UI**: http://localhost:8080/swagger-ui.html
- **H2 Console**: http://localhost:8080/h2-console (JDBC URL: `jdbc:h2:file:./data/formbuilder`, username: `sa`, no password)

### 3. Start the Frontend

```bash
cd client
npm install
npm run dev
```

The frontend starts on **http://localhost:5173** and proxies API requests to the backend.

### 4. Use the Application

1. Open **http://localhost:5173** in your browser
2. **Register** a new account (click "Register" on the login page)
3. **Login** with your credentials
4. **Create a form** from the dashboard
5. **Drag elements** from the palette onto the canvas to build your form
6. **Configure elements** by clicking on them in the canvas (right panel)
7. **Add pages** using the page tabs above the canvas for multi-page forms
8. **Preview** your form using the Preview button
9. **Publish** the form to make it available at its public URL
10. **Share** the public form link: `http://localhost:5173/public/form/{formId}`
11. **View submissions** from the form dashboard

## Running with PostgreSQL (Production)

### Start PostgreSQL via Docker Compose

```bash
docker compose up -d
```

This starts a PostgreSQL 16 instance on port 5432 with:
- Database: `formbuilder`
- Username: `formbuilder`
- Password: `formbuilder`

### Start the Backend with the prod profile

```bash
cd server
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

Or set the environment variable:
```bash
SPRING_PROFILES_ACTIVE=prod mvn spring-boot:run
```

### Stop PostgreSQL

```bash
docker compose down        # Stop containers (data persists in volume)
docker compose down -v     # Stop containers and delete data
```

## Running Tests

### Backend Tests

```bash
cd server
mvn test
```

Tests use an in-memory H2 database automatically.

### Frontend Build Check

```bash
cd client
npm run build
```

## Project Structure

```
spring-boot-form-builder/
├── docker-compose.yml              # PostgreSQL container
├── server/                         # Spring Boot backend
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/formbuilder/
│       │   ├── auth/               # JWT auth (User, AuthController, JwtService)
│       │   ├── config/             # SecurityConfig, WebConfig, OpenApiConfig
│       │   ├── element/            # FormElement entity, service, controller
│       │   ├── exception/          # Global exception handler
│       │   ├── form/               # Form entity, service, controller
│       │   ├── page/               # FormPage entity, service, controller
│       │   └── submission/         # Submission entity, service, controller
│       └── resources/
│           ├── application.properties          # Shared config
│           ├── application-dev.properties      # H2 config
│           ├── application-prod.properties     # PostgreSQL config
│           └── db/migration/                   # Flyway migrations (V1-V5)
├── client/                         # React frontend
│   ├── package.json
│   └── src/
│       ├── api/                    # API client and types
│       ├── components/
│       │   ├── builder/            # FormBuilder, Canvas, ElementPalette, ConfigPanel
│       │   ├── dashboard/          # FormList, SubmissionList
│       │   ├── preview/            # FormRenderer, MultiPageFormRenderer
│       │   └── ui/                 # shadcn/ui components
│       ├── pages/                  # Route pages (Login, Register, Public form, etc.)
│       └── stores/                 # Zustand stores (formBuilder, auth)
```

## API Overview

### Public Endpoints (no auth required)
| Method | Path                                | Description           |
|--------|-------------------------------------|-----------------------|
| POST   | `/api/auth/register`                | Register a new user   |
| POST   | `/api/auth/login`                   | Login, returns JWT    |
| GET    | `/api/public/forms/{formId}`        | Get published form    |
| POST   | `/api/public/forms/{formId}/submit` | Submit form response  |

### Protected Endpoints (JWT required)
| Method | Path                                             | Description              |
|--------|--------------------------------------------------|--------------------------|
| GET    | `/api/auth/me`                                   | Get current user         |
| GET    | `/api/forms`                                     | List user's forms        |
| POST   | `/api/forms`                                     | Create a form            |
| GET    | `/api/forms/{formId}`                            | Get form details         |
| PUT    | `/api/forms/{formId}`                            | Update form              |
| DELETE | `/api/forms/{formId}`                            | Delete form              |
| POST   | `/api/forms/{formId}/publish`                    | Publish form             |
| GET    | `/api/forms/{formId}/elements`                   | List form elements       |
| POST   | `/api/forms/{formId}/elements`                   | Create element           |
| PUT    | `/api/forms/{formId}/elements/{elementId}`       | Update element           |
| DELETE | `/api/forms/{formId}/elements/{elementId}`       | Delete element           |
| PUT    | `/api/forms/{formId}/elements/reorder`           | Reorder elements         |
| GET    | `/api/forms/{formId}/pages`                      | List form pages          |
| POST   | `/api/forms/{formId}/pages`                      | Create page              |
| PUT    | `/api/forms/{formId}/pages/{pageId}`             | Update page              |
| DELETE | `/api/forms/{formId}/pages/{pageId}`             | Delete page              |
| GET    | `/api/forms/{formId}/submissions`                | List submissions         |
| GET    | `/api/forms/{formId}/submissions/{submissionId}` | Get submission           |
| PUT    | `/api/forms/{formId}/submissions/{submissionId}` | Update submission        |

## Configuration

### Environment Variables / Properties

| Property            | Default                          | Description                     |
|---------------------|----------------------------------|---------------------------------|
| `server.port`       | `8080`                           | Backend server port             |
| `spring.profiles.active` | `dev`                       | Active profile (`dev` or `prod`) |
| `jwt.secret`        | (set in application.properties)  | JWT signing key (change in prod) |
| `jwt.expiration`    | `86400000`                       | JWT token lifetime (ms, default 24h) |

### Changing the JWT Secret (recommended for production)

Set the `jwt.secret` property via environment variable:
```bash
JWT_SECRET=your-secure-random-key mvn spring-boot:run -Dspring-boot.run.profiles=prod
```
