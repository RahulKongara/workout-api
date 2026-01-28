-- Migration: Add indexes for cleanup queries and cleanup function
-- Run this migration after 001_initial_schema.sql and 002_fix_users_rls_recursion.sql

-- Add index for rate_limits cleanup queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start 
  ON rate_limits(window_start);

-- Add index for api_usage cleanup queries
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at 
  ON api_usage(created_at);

-- Function to cleanup old records (call via cron or scheduled job)
-- This prevents the tables from growing indefinitely
CREATE OR REPLACE FUNCTION cleanup_old_records()
RETURNS void AS $$
BEGIN
  -- Delete rate limits older than 2 days
  DELETE FROM rate_limits 
  WHERE window_start < NOW() - INTERVAL '2 days';
  
  -- Delete API usage logs older than 90 days
  DELETE FROM api_usage 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Log the cleanup (optional - remove if not using pg_notify)
  RAISE NOTICE 'Cleanup completed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a pg_cron job to run cleanup daily (requires pg_cron extension)
-- Uncomment if using Supabase or PostgreSQL with pg_cron enabled
SELECT cron.schedule('cleanup-old-records', '0 3 * * *', 'SELECT cleanup_old_records()');
