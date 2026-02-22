-- Make page_id required for all form elements.
-- 1) Create a default "Page 1" for any form that has no pages.
-- 2) Assign orphaned elements (page_id IS NULL) to their form's first page.
-- 3) Add NOT NULL constraint to page_id.

-- Insert a default page for every form that has no pages
INSERT INTO form_pages (id, form_id, page_number, title, created_at, updated_at)
SELECT RANDOM_UUID(), f.id, 0, 'Page 1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM forms f
WHERE NOT EXISTS (SELECT 1 FROM form_pages fp WHERE fp.form_id = f.id);

-- Assign orphaned elements to their form's first page (lowest page_number)
UPDATE form_elements fe
SET page_id = (
    SELECT fp.id FROM form_pages fp
    WHERE fp.form_id = fe.form_id
    ORDER BY fp.page_number ASC
    LIMIT 1
)
WHERE fe.page_id IS NULL;

-- Now enforce NOT NULL
ALTER TABLE form_elements ALTER COLUMN page_id SET NOT NULL;
