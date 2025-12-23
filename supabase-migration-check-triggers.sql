-- Check for triggers on auth.users that might be causing the signup error
-- Run this to see what triggers exist

-- List all triggers on auth.users
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users'
AND event_object_schema = 'auth'
ORDER BY trigger_name;

-- List all functions that might be called by triggers
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%user%profile%'
OR routine_name LIKE '%signup%'
OR routine_name LIKE '%auth%user%'
ORDER BY routine_name;

