CREATE TABLE form_pages (
    id UUID PRIMARY KEY,
    form_id UUID NOT NULL,
    page_number INTEGER NOT NULL DEFAULT 0,
    title VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_form_pages_form FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
);

CREATE INDEX idx_form_pages_form_id ON form_pages(form_id);
CREATE UNIQUE INDEX idx_form_pages_form_page ON form_pages(form_id, page_number);

ALTER TABLE form_elements ADD COLUMN page_id UUID;
ALTER TABLE form_elements ADD CONSTRAINT fk_form_elements_page
    FOREIGN KEY (page_id) REFERENCES form_pages(id) ON DELETE SET NULL;
