DROP POLICY "Users can read their own ai telemetry" ON ai_usage_telemetry;
CREATE POLICY "Users can read their own ai telemetry, admins read all"
    ON ai_usage_telemetry
    FOR SELECT
    USING (auth.uid() = user_id or public.is_admin(auth.uid()));
