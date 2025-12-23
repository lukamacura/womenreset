# Fix Email Registration Issue

## Problem

Users cannot continue with email registration. When they enter their email and click "Continue with email", they see an error like:
- "Database error saving new user"
- "Database configuration error"
- Or the magic link is sent but registration still fails

## Root Cause

Supabase is trying to **automatically create a `user_profiles` entry** when a user signs up, but it's failing because:

1. **Database triggers** are trying to insert user_profiles with NULL values for required fields
2. **CHECK constraints** don't allow NULL values for quiz fields
3. The profile should be created **AFTER the quiz**, not during signup

## Solution

### Step 1: Run the SQL Migration

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Open the file: `supabase-migration-fix-email-registration.sql`
4. Copy all the SQL code
5. Paste it into the SQL Editor
6. Click **Run**

The migration will:
- ✅ Remove ALL automatic user_profiles creation triggers
- ✅ Fix CHECK constraints to allow NULL values
- ✅ Make all quiz fields optional
- ✅ Report any remaining issues

### Step 2: Check Authentication Hooks

**IMPORTANT:** Supabase Auth Hooks can also cause this issue!

1. Go to **Supabase Dashboard** → **Authentication** → **Hooks**
2. Look for any hooks that trigger on:
   - "User created" events
   - `auth.users` INSERT events
   - Anything that might create `user_profiles` entries

3. **If you find any hooks:**
   - **Option A (Recommended):** Disable or delete the hook
     - The profile will be created when the user completes the quiz
   - **Option B:** Update the hook to only insert `user_id`:
     ```sql
     INSERT INTO user_profiles (user_id)
     VALUES (NEW.id)
     ON CONFLICT (user_id) DO NOTHING;
     ```

### Step 3: Test Registration

1. Try registering with a **new email address** (not one used before)
2. You should see: "Check your email! We sent you a magic link..."
3. Check your email and click the magic link
4. You should be redirected back to the registration page to complete the quiz
5. Complete the quiz and verify you're redirected to the dashboard

## How Registration Works Now

```
1. User visits /register
   ↓
2. User fills out quiz questions
   ↓
3. Quiz answers saved to localStorage
   ↓
4. User enters email → Magic link sent
   (NO user_profiles entry created yet - this is correct!)
   ↓
5. User clicks magic link → Authenticated
   ↓
6. User redirected to /register page
   ↓
7. Page detects: User authenticated + Quiz answers in localStorage
   ↓
8. Profile created via /api/intake with all quiz answers
   ↓
9. User redirected to dashboard ✓
```

## Troubleshooting

### Still getting "Database error saving new user"?

**Check your database:**
1. Go to Supabase Dashboard → Database → Triggers
2. Look for triggers on `auth.users` table
3. Remove any that reference `user_profiles`

**Check logs:**
1. In your code editor, check the browser console (F12)
2. Look for error messages that show the exact database error

### Magic link works but profile isn't created?

Check [app/register/page.tsx:286-327](app/register/page.tsx#L286-L327) - this is where the profile is created after magic link authentication.

The flow:
1. User clicks magic link
2. Auth callback ([app/auth/callback/route.ts:88-103](app/auth/callback/route.ts#L88-L103)) redirects to `/register`
3. Register page detects authenticated user + pending quiz answers
4. Profile created via `/api/intake`

### Users getting stuck in a loop?

Clear localStorage:
1. Open browser console (F12)
2. Run: `localStorage.removeItem('pending_quiz_answers')`
3. Refresh page

## Technical Details

### What Changed

**Before (causing errors):**
- Trigger automatically creates user_profiles during signup
- Quiz fields have NOT NULL constraints
- Trigger tries to insert NULL values → ERROR

**After (working correctly):**
- NO automatic user_profiles creation
- Quiz fields allow NULL
- Profile created only when quiz is completed
- All quiz answers validated and saved together

### Files Modified

- `supabase-migration-fix-email-registration.sql` - New migration to fix the issue
- No code changes needed - the existing code already handles this flow correctly!

### Database Schema

After running the migration, the `user_profiles` table will:
- Allow NULL for all quiz fields (name, top_problems, severity, etc.)
- Have CHECK constraints that accept NULL OR valid enum values
- NOT have any automatic creation triggers

This allows the registration flow to work as designed:
1. User completes quiz → answers stored in localStorage
2. User authenticates → session created (no profile yet)
3. Page detects both conditions → creates profile with quiz data
4. User sees dashboard with their personalized information

## Need Help?

If you're still having issues after following these steps:

1. Check the browser console (F12) for error messages
2. Check Supabase logs: Dashboard → Logs → API
3. Run the diagnostic SQL to see table structure:
   ```sql
   SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_name = 'user_profiles'
   ORDER BY ordinal_position;
   ```

4. Check for triggers:
   ```sql
   SELECT trigger_name, event_manipulation, action_statement
   FROM information_schema.triggers
   WHERE event_object_table = 'users'
   AND event_object_schema = 'auth';
   ```
