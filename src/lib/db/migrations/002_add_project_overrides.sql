CREATE TABLE IF NOT EXISTS project_overrides (
    project_id BIGINT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT,
    description TEXT,
    technologies JSONB,
    published BOOLEAN,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);