-- Create table for AI usage telemetry
CREATE TABLE IF NOT EXISTS ai_usage_telemetry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for querying usage per user
CREATE INDEX IF NOT EXISTS ai_usage_telemetry_user_id_idx ON ai_usage_telemetry(user_id);

-- Index for reporting/aggregation
CREATE INDEX IF NOT EXISTS ai_usage_telemetry_created_at_idx ON ai_usage_telemetry(created_at);

-- Enable RLS
ALTER TABLE ai_usage_telemetry ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own telemetry
CREATE POLICY "Users can read their own ai telemetry" 
    ON ai_usage_telemetry 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Note: No insert policy is needed for users because inserts will happen via the Server DAL using the service role key.
