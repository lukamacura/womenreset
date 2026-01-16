# Notification System Setup Guide

## Overview

The notification system has been simplified to focus on what actually works:
- **One daily reminder** to track symptoms
- **Simple settings**: Toggle on/off + time picker
- **Reliable delivery** via cron job

## What Changed

### Removed (Non-Working Features)
- ❌ Morning Check-in separate setting
- ❌ Evening Reflection setting
- ❌ Streak Reminders toggle
- ❌ Insight Alerts toggle
- ❌ Weekly Summary day picker

### Kept (Working Features)
- ✅ Master toggle: "Send me reminders"
- ✅ Time picker: "Remind me daily at:" (default: 9:00 AM)
- ✅ Daily reminder notification
- ✅ Toast notifications (bottom-right)
- ✅ Notification center (`/dashboard/notifications`)

## Database Schema

The `user_preferences` table now uses:
- `notification_enabled` (boolean) - Master toggle
- `reminder_time` (TIME) - When to send daily reminder (format: HH:MM, e.g., "09:00")

### Migration

Run the migration to update your database:
```sql
-- See: supabase-migration-simplify-notifications.sql
```

This migration:
1. Adds `reminder_time` column if it doesn't exist
2. Migrates existing `morning_checkin_time` to `reminder_time`
3. Sets default to "09:00" for users with notifications enabled
4. Creates index for faster queries

## Cron Job Setup

### Option 1: Vercel Cron (Recommended)

If deploying to Vercel, the `vercel.json` file is already configured:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```

This runs every hour at :00 (9:00 AM, 10:00 AM, etc.)

**To enable:**
1. Deploy to Vercel
2. Vercel will automatically detect and enable the cron job
3. No additional setup needed

### Option 2: External Cron Service

If not using Vercel, set up a cron job to call:
```
GET https://your-domain.com/api/cron/daily-reminders
Authorization: Bearer YOUR_CRON_SECRET
```

**Schedule:** Every hour at :00 (or every 15 minutes for better accuracy)

**Environment Variable:**
- `CRON_SECRET` - Secret token for authorization (optional but recommended)

### Option 3: Supabase Edge Function

You can also create a Supabase Edge Function that calls this endpoint.

## How It Works

1. **User sets preferences** in `/dashboard/settings/notifications`
   - Toggle: ON/OFF
   - Time: 6:00 AM - 9:00 PM

2. **Cron job runs** (every hour)
   - Fetches users with `notification_enabled = true`
   - Checks if `reminder_time` matches current hour
   - For each matching user:
     - Checks if they've tracked symptoms today
     - Checks if trial is expired
     - Checks if reminder already sent today
     - Creates notification if needed

3. **Notification appears** as toast (bottom-right)
   - Title: "Time to check in"
   - Message: "How are you feeling today? Track your symptoms to see patterns."
   - Action: "Track Now" → `/dashboard/symptoms`

4. **User can view** all notifications in `/dashboard/notifications`

## Notification Content

### Daily Reminder
- **Type:** `reminder`
- **Title:** "Time to check in"
- **Message:** "How are you feeling today? Track your symptoms to see patterns."
- **Action:** "Track Now" → `/dashboard/symptoms`
- **Auto-dismiss:** 30 seconds

### Trial Notifications (Already Working)
- Created by dashboard page when trial is ending
- Type: `trial`
- Shows upgrade prompt

## Testing

### Manual Test
```bash
# Test the cron endpoint manually
curl -X GET https://your-domain.com/api/cron/daily-reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Expected Response
```json
{
  "success": true,
  "message": "Processed X users",
  "notificationsCreated": Y,
  "errors": 0,
  "timestamp": "2024-01-15T09:00:00.000Z"
}
```

## Troubleshooting

### Notifications not appearing
1. Check user preferences: `notification_enabled = true` and `reminder_time` set
2. Check cron job is running (check Vercel logs or cron service logs)
3. Check if user has already tracked symptoms today
4. Check if user's trial is expired
5. Check if notification was already sent today (prevents duplicates)

### Cron job not running
1. Verify `vercel.json` is in root directory
2. Check Vercel dashboard → Settings → Cron Jobs
3. For external cron, verify URL and authorization header
4. Check server logs for errors

### Database errors
1. Run migration: `supabase-migration-simplify-notifications.sql`
2. Verify `reminder_time` column exists
3. Check user_preferences table structure

## Future Enhancements (Optional)

Once daily reminders work reliably, consider:
- Weekly summary notification (every Sunday)
- Encouragement notifications ("3 days tracked - keep going!")
- Pattern detection notifications ("We noticed a pattern in your symptoms")

But only add these AFTER the daily reminder system is proven reliable.

## Security

- Cron endpoint requires `Authorization: Bearer CRON_SECRET` header
- Set `CRON_SECRET` in environment variables
- Endpoint checks user authentication and trial status
- Prevents duplicate notifications (checks if already sent today)
