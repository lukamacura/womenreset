-- Find ALL triggers on auth.users that might be causing the error
-- Run this to see exactly what triggers exist

-- List all triggers on auth.users
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing,
    action_orientation
FROM information_schema.triggers
WHERE event_object_table = 'users'
AND event_object_schema = 'auth'
ORDER BY trigger_name;

-- List all functions that are called by triggers on auth.users
SELECT DISTINCT
    t.trigger_name,
    t.action_statement,
    r.routine_name,
    r.routine_definition
FROM information_schema.triggers t
LEFT JOIN information_schema.routines r 
    ON r.routine_name = substring(t.action_statement from 'EXECUTE FUNCTION ([^(]+)')
WHERE t.event_object_table = 'users'
AND t.event_object_schema = 'auth'
ORDER BY t.trigger_name;

-- Check if any function references user_profiles
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (
    routine_definition LIKE '%user_profiles%' 
    OR routine_definition LIKE '%user_profile%'
)
ORDER BY routine_name;

