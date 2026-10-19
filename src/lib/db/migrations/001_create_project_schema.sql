CREATE TABLE IF NOT EXISTS projects (
    id BIGSERIAL PRIMARY KEY,
    github_repo_id BIGINT NOT NULL UNIQUE,
    github_owner TEXT NOT NULL,
    repository_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    repository_url TEXT NOT NULL,
    technologies JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_github_update TIMESTAMPTZ NOT NULL,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sync_runs (
    id BIGSERIAL PRIMARY KEY,
    github_owner TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    repositories_seen INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS projects_github_owner_idx ON projects (github_owner);
CREATE INDEX IF NOT EXISTS projects_published_idx ON projects (published);
CREATE INDEX IF NOT EXISTS sync_runs_owner_started_idx ON sync_runs (github_owner, started_at DESC);