-- Postgres initialisation script — runs once on first container start
-- Enables pgcrypto for uuid generation if needed server-side

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Confirm DB is ready
SELECT current_database(), version();
