# RLS Policy Explanation for user_profiles

## Current Policies (from your database)

1. **Service role can manage all profiles** - `ALL` commands, `true` for both qual and with_check
2. **Users can insert own profile** - `INSERT`, with_check: `(auth.uid() = user_id)`
3. **Users can update own profile** - `UPDATE`, both qual and with_check: `(auth.uid() = user_id)`
4. **Users can view own profile** - `SELECT`, qual: `(auth.uid() = user_id)`

## Why Signup Might Fail

If a **trigger or Auth Hook** tries to insert into `user_profiles` during signup:

1. The trigger/hook runs in a context where `auth.uid()` might not be set
2. The "Users can insert own profile" policy requires `auth.uid() = user_id`
3. If `auth.uid()` is NULL or doesn't match, the insert fails
4. This causes the "Database error saving new user" error

## Solution

**The service role bypasses RLS entirely**, so:
- The `/api/intake` route (which uses service role) can always insert/update
- Triggers/hooks that run as part of signup might not have service role context

**Best practice**: Don't create `user_profiles` during signup. Create it only after the user completes the quiz via `/api/intake`.

## What the Migration Does

The migration:
1. Removes all triggers that create `user_profiles` during signup
2. Ensures RLS policies are correct
3. The "Service role can manage all profiles" policy is a safety net (service role bypasses RLS anyway)

## If Error Persists

The issue is likely:
1. **An Auth Hook in the Dashboard** - Check Authentication → Hooks
2. **A trigger we haven't found** - Run the diagnostic query
3. **RLS blocking a trigger** - The trigger needs to run with service role or be removed

The migration removes triggers, but Auth Hooks must be disabled manually in the Dashboard.

