# Fix "Database error saving new user" Error

## Problem
The error occurs because Supabase has a database webhook or trigger configured that tries to automatically create a `user_profiles` entry when a user signs up, but it's using old column names or required fields that don't exist.

## Solution

### Step 1: Run the Migration
Run `supabase-migration-complete-fix.sql` in your Supabase SQL Editor. This will:
- Fix CHECK constraints to allow NULL values
- Remove automatic user_profiles creation triggers
- Ensure all columns allow NULL

### Step 2: Check for Database Webhooks
1. Go to Supabase Dashboard → Database → Webhooks
2. Look for any webhook that triggers on `auth.users` INSERT
3. If you find a webhook that creates `user_profiles` entries:
   - **Option A (Recommended)**: Disable or delete the webhook
     - The profile will be created when the user completes the quiz
   - **Option B**: Update the webhook to only insert `user_id`:
     ```sql
     INSERT INTO user_profiles (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
     ```

### Step 3: Verify the Fix
1. Try signing up with a new email
2. The signup should succeed (magic link sent)
3. After clicking the magic link and completing the quiz, the profile will be created

## Why This Works
- We removed the automatic trigger that was causing conflicts
- User profiles are now created only when the quiz is completed (via `/api/intake`)
- This prevents database errors during signup
- All quiz fields are properly validated when the profile is created

## Note
If you need automatic profile creation for other reasons, you can re-enable it, but make sure it only inserts `user_id` and doesn't reference any removed columns.

