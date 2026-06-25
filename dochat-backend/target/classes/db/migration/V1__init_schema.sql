-- Users table
CREATE TABLE users (
                       id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                       email       VARCHAR(255) NOT NULL UNIQUE,
                       password    VARCHAR(255) NOT NULL,
                       full_name   VARCHAR(255) NOT NULL,
                       role        VARCHAR(50)  NOT NULL DEFAULT 'USER',
                       enabled     BOOLEAN      NOT NULL DEFAULT TRUE,
                       created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
                       updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Chat sessions table
CREATE TABLE chat_sessions (
                               id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                               user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                               title       VARCHAR(500),
                               created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
                               updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE chat_messages (
                               id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                               session_id  UUID         NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
                               role        VARCHAR(20)  NOT NULL,
                               content     TEXT         NOT NULL,
                               tokens_used INTEGER,
                               created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Refresh tokens table
CREATE TABLE refresh_tokens (
                                id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                                token       VARCHAR(512) NOT NULL UNIQUE,
                                expires_at  TIMESTAMP    NOT NULL,
                                created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_chat_sessions_user    ON chat_sessions(user_id);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_refresh_tokens_user   ON refresh_tokens(user_id);