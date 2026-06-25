CREATE TABLE IF NOT EXISTS documents (
                                         id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name       VARCHAR(500)  NOT NULL,
    original_name   VARCHAR(500)  NOT NULL,
    file_size       BIGINT        NOT NULL,
    mime_type       VARCHAR(100)  NOT NULL,
    status          VARCHAR(50)   NOT NULL DEFAULT 'PENDING',
    chunk_count     INTEGER,
    error_message   TEXT,
    uploaded_by     VARCHAR(255)  NOT NULL DEFAULT 'user@dochat.com',
    created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP     NOT NULL DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_documents_status      ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);