# Database Setup Instructions

## Fix "Database error saving new user" Error

If you're getting a "Database error saving new user" error during registration, you need to create the `user_profiles` table in your Supabase database.

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"

### Step 2: Run the Migration SQL

Copy and paste the entire contents of `supabase-migration-user-profiles.sql` into the SQL Editor and click "Run".

Alternatively, copy this SQL:

```sql
-- User Profiles Table Migration
-- Create user_profiles table for storing user profile information

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 18 AND age <= 120),
  menopause_profile TEXT,
  nutrition_profile TEXT,
  exercise_profile TEXT,
  emotional_stress_profile TEXT,
  lifestyle_context TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS user_profiles_user_id_idx ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS user_profiles_created_at_idx ON user_profiles(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON user_profiles;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON user_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Service role (admin) can manage all profiles
-- This allows the admin client to insert profiles during registration
CREATE POLICY "Service role can manage all profiles"
ON user_profiles FOR ALL
USING (true)
WITH CHECK (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at_trigger ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at_trigger
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_user_profiles_updated_at();
```

### Step 3: Verify the Table Was Created

After running the SQL, verify the table exists:

1. Go to "Table Editor" in Supabase
2. You should see `user_profiles` in the list of tables
3. Click on it to see the columns

### Step 4: Test Registration Again

Try registering a new user again. The error should be resolved.

## Troubleshooting

### If you still get errors:

1. **Check the error message** - The app now shows detailed error messages in development mode
2. **Check RLS policies** - Make sure the "Service role can manage all profiles" policy exists
3. **Check environment variables** - Ensure `SUPABASE_SERVICE_ROLE_KEY` is set correctly
4. **Check console logs** - Look at the browser console and server logs for detailed error information

### Common Issues:

- **Table doesn't exist**: Run the migration SQL above
- **Permission denied**: Check that RLS policies are set up correctly
- **Invalid user ID**: Make sure the user was created in `auth.users` first
- **Service role key missing**: Check your `.env.local` file has `SUPABASE_SERVICE_ROLE_KEY`

