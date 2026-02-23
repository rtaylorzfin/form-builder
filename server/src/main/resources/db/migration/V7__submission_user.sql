ALTER TABLE submissions ADD COLUMN user_id UUID;
ALTER TABLE submissions ADD CONSTRAINT fk_submissions_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
