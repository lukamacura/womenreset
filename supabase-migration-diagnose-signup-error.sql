-- Diagnostic Query: Find what's causing the signup error
-- Run this to identify the exact issue

-- 1. Check ALL triggers on auth.users (this is the most likely culprit)
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement,
    action_orientation
FROM information_schema.triggers
WHERE event_object_table = 'users'
AND event_object_schema = 'auth'
ORDER BY trigger_name;

-- 2. Check all functions that might be called by triggers
SELECT 
    routine_name,
    routine_schema,
    routine_type,
    substring(routine_definition, 1, 200) as definition_preview
FROM information_schema.routines
WHERE routine_schema IN ('public', 'auth')
AND (
    routine_definition LIKE '%user_profiles%' 
    OR routine_definition LIKE '%user_profile%'
    OR routine_name LIKE '%user%profile%'
    OR routine_name LIKE '%signup%'
)
ORDER BY routine_schema, routine_name;

-- 3. Check user_profiles table structure and constraints
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check all constraints on user_profiles
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_profiles'::regclass
ORDER BY conname;

-- 5. Check RLS policies on user_profiles
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- 6. Test if we can insert a minimal row (using a real user if one exists)
DO $$
DECLARE
    test_user_id UUID;
    test_result TEXT;
BEGIN
    -- Try to get a real user ID from auth.users
    SELECT id INTO test_user_id
    FROM auth.users
    LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No users found in auth.users - cannot test insert';
        RETURN;
    END IF;
    
    -- Try to insert a minimal row
    BEGIN
        INSERT INTO user_profiles (user_id) 
        VALUES (test_user_id)
        ON CONFLICT (user_id) DO UPDATE SET user_id = test_user_id;
        
        test_result := 'SUCCESS: Minimal insert works';
    EXCEPTION WHEN OTHERS THEN
        test_result := 'FAILED: ' || SQLERRM;
    END;
    
    RAISE NOTICE '%', test_result;
END $$;

