# Fix "Database error saving new user" - Final Steps

## The Error
You're seeing: "Database error saving new user" when trying to register with a magic link.

## Root Cause
This error occurs when Supabase Auth tries to create a user in `auth.users`, but something (trigger or Auth Hook) tries to automatically create a `user_profiles` entry and fails.

## Step-by-Step Fix

### Step 1: Run the Diagnostic Query
1. Go to Supabase Dashboard → SQL Editor
2. Run `supabase-migration-diagnose-signup-error.sql`
3. Review the results to see:
   - What triggers exist on `auth.users`
   - What functions might be creating `user_profiles`
   - If the table structure is correct

### Step 2: Run the Fix Migration
1. In Supabase SQL Editor, run `supabase-migration-fix-registration-error.sql`
2. Check the output messages - you should see:
   - "SUCCESS: No triggers on auth.users reference user_profiles"
   - "SUCCESS: All quiz columns allow NULL values"
   - "SUCCESS: All CHECK constraints allow NULL values"

### Step 3: Check Supabase Auth Hooks (CRITICAL)
**This is the most common cause after running the migration.**

1. Go to **Supabase Dashboard → Authentication → Hooks** (NOT Database Webhooks)
2. Look for any hooks that:
   - Run on "User Signup" or "User Created"
   - Create entries in `user_profiles` table
3. If you find any:
   - **Disable them** (recommended), OR
   - **Update them** to only insert `user_id`:
     ```sql
     INSERT INTO user_profiles (user_id) 
     VALUES (NEW.id) 
     ON CONFLICT (user_id) DO NOTHING;
     ```

### Step 4: Verify the Fix
1. Try registering with a new email address
2. You should see: "Check your email! We sent you a magic link..."
3. Click the magic link in your email
4. You should be redirected to `/register` to complete the quiz
5. After completing the quiz, the profile will be created via `/api/intake`

## If Error Persists

### Check Database Logs
1. Go to Supabase Dashboard → Logs → Postgres Logs
2. Look for errors around the time you tried to sign up
3. The error message will tell you exactly what constraint or trigger is failing

### Common Issues

1. **Auth Hook still active**: Even after running migration, if an Auth Hook is configured in the Dashboard, it will still run. You MUST disable it manually.

2. **Trigger in different schema**: Some triggers might be in a different schema. The diagnostic query will find them.

3. **Function signature mismatch**: If a function has parameters, the DROP FUNCTION might not work. Check the diagnostic results and drop manually:
   ```sql
   DROP FUNCTION IF EXISTS function_name(parameter_types) CASCADE;
   ```

## Expected Flow After Fix

1. User completes quiz → answers saved to localStorage
2. User enters email → `signInWithOtp` succeeds (magic link sent)
3. User clicks magic link → authenticated successfully
4. User redirected to `/register` → quiz answers restored from localStorage
5. Profile created via `/api/intake` when quiz is completed

## Still Having Issues?

If the error persists after:
- Running the migration
- Disabling Auth Hooks
- Verifying no triggers exist

Then the issue might be:
- A Supabase configuration issue (contact Supabase support)
- A custom Auth Hook configured via API (check your codebase for hook creation)
- A database extension or plugin interfering

Run the diagnostic query and share the results for further troubleshooting.

