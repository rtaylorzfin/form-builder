
Next steps (COMPLETED)
===

All 4 items below have been implemented.

1. ~~Remove H2 completely. We are only going to use postgresql.~~
   **Done.** H2 removed from all environments. Dev, test, and prod all use PostgreSQL via Docker Compose. Flyway migrations updated for PostgreSQL syntax (`gen_random_uuid()`).

2. ~~We may need to allow further levels of nesting.~~
   **Done.** Groups can now be nested up to 5 levels deep (e.g., Line > Feature > Genes), each independently repeatable. Backend validation is recursive. Frontend schema building, rendering, and canvas display all support arbitrary nesting with depth-colored visual indicators.

3. ~~We need a suite of tests to exercise the front end.~~
   **Done.** 53 frontend tests using Vitest + Testing Library + MSW. Covers the Zustand store (23 tests), FormRenderer with all field types and validation (19 tests), and FormList integration with role-based visibility (11 tests). Run with `npm test`.

4. ~~We should have a concept of roles for users.~~
   **Done.** ADMIN and USER roles implemented. First registered user becomes ADMIN. ADMIN can create/edit/publish/delete forms and view all submissions. USER can only fill published forms and view own submissions. Method-level security with `@PreAuthorize`. Frontend hides admin-only UI elements for USER role.
