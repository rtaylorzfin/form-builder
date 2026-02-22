ALTER TABLE form_elements ADD COLUMN parent_element_id UUID;
ALTER TABLE form_elements ADD CONSTRAINT fk_form_elements_parent
    FOREIGN KEY (parent_element_id) REFERENCES form_elements(id) ON DELETE CASCADE;
CREATE INDEX idx_form_elements_parent_id ON form_elements(parent_element_id);
