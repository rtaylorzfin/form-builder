# Spring Boot Form Builder

A full-stack web application for building, managing, and rendering dynamic forms. This project features a Spring Boot backend and a React frontend.

## Features

### 1. Form Builder (Frontend)
- **Drag & Drop Interface**: Users can drag form elements (Text Input, Date Picker, Checkbox, etc.) onto a canvas to construct a form.
- **Element Configuration**: Customize properties for each form element (labels, validation rules, placeholders).
- **Input Validation**: Define required fields, regex patterns, and custom error messages.

### 2. Form Persistence (Backend)
Forms are stored in a relational database with the following structure:
- **Forms Table**: Stores metadata about the form (ID, Name, Description, Created Date).
- **Form Elements Table**: Stores the actual fields associated with a form (ID, Form ID, Type, Label, Order, Configuration).
- **Submissions Table**: Stores user responses linked to specific forms.

### 3. Form Rendering & Data Capture
- **Public View**: Ability to render a saved form for end-users to fill out.
- **Data Entry**: Capture user form submissions and save them to the database.
- **Submissions Dashboard**: View and manage collected form data in an admin interface.

## Technology Stack

- **Backend**: Spring Boot (Java 17+)
- **Frontend**: React + Vite
- **Database**: H2 (Dev) / PostgreSQL (Prod)
- **Build Tools**: Maven (Backend), NPM (Frontend)

## Getting Started

### Prerequisites
- Java 17+
- Node.js & npm

### Running the Application

1. **Backend**:
   ```bash
   cd server
   mvn spring-boot:run
   ```

2. **Frontend**:
   ```bash
   cd client
   npm install
   npm run dev
   ```

