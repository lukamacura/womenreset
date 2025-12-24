# Production Authentication Fix Guide

## Problem
Login and registration work on localhost but fail on production (womenreset.com).

## Root Causes

The most common issues are:

1. **Redirect URL not configured in Supabase** (Most Common)
2. **Environment variables not set in production**
3. **Incorrect SITE_URL configuration**

## Solution Steps

### 1. Configure Supabase Redirect URLs

**CRITICAL**: You must add the production redirect URL to Supabase's allowed redirect URLs.

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Under **Redirect URLs**, add:
   ```
   https://womenreset.com/auth/callback
   ```
4. Also add (for development/testing):
   ```
   http://localhost:3000/auth/callback
   ```
5. Click **Save**

**Note**: Supabase requires exact URL matches. Make sure:
- No trailing slashes
- Use `https://` (not `http://`) for production
- Use the exact domain `womenreset.com` (not `www.womenreset.com` unless you use that)

### 2. Set Environment Variables in Production

Ensure these environment variables are set in your production deployment (Vercel, etc.):

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=https://womenreset.com  # Optional, defaults to https://womenreset.com
```

**Where to set these:**
- **Vercel**: Project Settings → Environment Variables
- **Other platforms**: Check your hosting provider's documentation

### 3. Verify Configuration

After making changes:

1. **Test the redirect URL**:
   - Try logging in on production
   - Check browser console for any errors
   - Check Supabase logs for authentication errors

2. **Common error messages**:
   - `Redirect URL not allowed` → Add URL to Supabase redirect URLs (Step 1)
   - `NEXT_PUBLIC_SUPABASE_URL is not set` → Set environment variables (Step 2)
   - `Invalid redirect URL format` → Check SITE_URL configuration

### 4. Testing

1. **Local Testing**:
   ```bash
   npm run dev
   # Should work with http://localhost:3000/auth/callback
   ```

2. **Production Testing**:
   - Deploy to production
   - Try logging in with a test email
   - Check that magic link redirects to `https://womenreset.com/auth/callback`

## Code Changes Made

1. **`lib/constants.ts`**: Made SITE_URL configurable via `NEXT_PUBLIC_SITE_URL` environment variable
2. **`app/auth/callback/route.ts`**: Improved production URL detection

## Troubleshooting

### Error: "Redirect URL not allowed"
- **Fix**: Add `https://womenreset.com/auth/callback` to Supabase redirect URLs

### Error: "NEXT_PUBLIC_SUPABASE_URL is not set"
- **Fix**: Set environment variables in your hosting platform

### Magic link works but redirects to wrong URL
- **Fix**: Check that `NEXT_PUBLIC_SITE_URL` is set correctly, or verify `SITE_URL` constant in `lib/constants.ts`

### Session not persisting after login
- **Fix**: Check cookie settings in `app/auth/callback/route.ts` - ensure `secure` flag is set for production

## Additional Notes

- The redirect URL format is: `${SITE_URL}${AUTH_CALLBACK_PATH}` = `https://womenreset.com/auth/callback`
- Supabase validates redirect URLs strictly - they must match exactly
- Environment variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
- The callback route handles both login and registration flows automatically

