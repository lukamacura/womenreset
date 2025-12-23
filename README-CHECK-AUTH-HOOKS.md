# Check Supabase Auth Hooks

The "Database error saving new user" error might be caused by a **Supabase Auth Hook** configured in your Dashboard.

## How to Check

1. Go to **Supabase Dashboard** → **Authentication** → **Hooks**
2. Look for any hooks that run on:
   - `auth.users` INSERT
   - User signup events
   - Any hook that might create `user_profiles` entries

## If You Find a Hook

If there's a hook that creates `user_profiles` entries:

### Option 1: Disable the Hook (Recommended)
- Click on the hook
- Disable or delete it
- The profile will be created when the user completes the quiz

### Option 2: Update the Hook
If you need to keep the hook, update it to only insert `user_id`:

```sql
INSERT INTO user_profiles (user_id) 
VALUES (NEW.id) 
ON CONFLICT (user_id) DO NOTHING;
```

## After Running Migration

After running `supabase-migration-final-fix.sql`:
1. The `safe_user_profile_on_signup` trigger will create minimal profiles
2. This trigger won't fail signup even if there's an error
3. Users can complete the quiz to fill in the profile data

## Test

1. Try signing up with a new email
2. Signup should succeed (magic link sent)
3. After clicking magic link and completing quiz, profile will be saved

