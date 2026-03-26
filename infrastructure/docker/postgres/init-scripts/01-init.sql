-- Initialize SynapseRoute database
-- This script runs on first database creation

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'SynapseRoute database initialized successfully';
END $$;
