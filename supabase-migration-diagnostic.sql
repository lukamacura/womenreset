-- Diagnostic Query: Check what's causing the registration error
-- Run this to see the current state of your database

-- 1. Check user_profiles table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check all constraints on user_profiles
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_profiles'::regclass
ORDER BY conname;

-- 3. Check all triggers on auth.users
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
AND event_object_schema = 'auth'
ORDER BY trigger_name;

-- 4. Check RLS policies on user_profiles
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

-- 5. Test if minimal insert would work
DO $$
DECLARE
    test_result TEXT;
BEGIN
    BEGIN
        -- Try to insert with just user_id (this is what a trigger/hook would do)
        INSERT INTO user_profiles (user_id) 
        VALUES ('00000000-0000-0000-0000-000000000000'::uuid)
        ON CONFLICT (user_id) DO NOTHING;
        
        DELETE FROM user_profiles WHERE user_id = '00000000-0000-0000-0000-000000000000'::uuid;
        
        test_result := 'SUCCESS: Minimal insert works';
    EXCEPTION WHEN OTHERS THEN
        test_result := 'FAILED: ' || SQLERRM;
    END;
    
    RAISE NOTICE '%', test_result;
END $$;

