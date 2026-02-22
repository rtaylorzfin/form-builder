ALTER TABLE submissions ADD COLUMN updated_at TIMESTAMP;
ALTER TABLE submissions ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED';
UPDATE submissions SET updated_at = submitted_at WHERE updated_at IS NULL;
ALTER TABLE submissions ALTER COLUMN updated_at SET NOT NULL;
CREATE INDEX idx_submissions_status ON submissions(status);
