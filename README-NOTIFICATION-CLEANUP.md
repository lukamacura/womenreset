# Notification Cleanup Setup Guide

This guide explains how to set up automatic cleanup of old notifications in your Supabase database.

## Overview

The notification cleanup function automatically removes old notifications based on retention policies:
- **Read/dismissed notifications**: Deleted after 7 days
- **Unread notifications**: Kept for 30 days before deletion

This prevents database bloat while ensuring important unread notifications aren't lost prematurely.

## Database Function

The cleanup function is defined in `supabase-migration-notifications-cleanup.sql`. Run this migration in your Supabase SQL Editor to create the function.

## Setup Options

### Option 1: Supabase Cron Jobs (Recommended)

Supabase provides built-in cron job functionality via the `pg_cron` extension.

#### Step 1: Enable pg_cron Extension

In your Supabase SQL Editor, run:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

#### Step 2: Schedule the Cleanup Job

Run the following SQL to schedule daily cleanup at 2 AM UTC:

```sql
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 2 * * *',  -- Runs daily at 2:00 AM UTC
  'SELECT cleanup_old_notifications();'
);
```

#### Step 3: Verify the Schedule

Check your scheduled jobs:

```sql
SELECT * FROM cron.job;
```

#### Step 4: View Job History (Optional)

Monitor job execution:

```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-old-notifications')
ORDER BY start_time DESC 
LIMIT 10;
```

### Option 2: Supabase Edge Function with Cron Trigger

If `pg_cron` is not available or you prefer Edge Functions:

#### Step 1: Create Edge Function

Create a new Edge Function (e.g., `notification-cleanup`) that calls the cleanup function:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Call the cleanup function
    const { data, error } = await supabaseAdmin.rpc("cleanup_old_notifications");

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, deleted_count: data?.[0]?.deleted_count || 0 }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
```

#### Step 2: Deploy the Edge Function

Deploy using Supabase CLI:

```bash
supabase functions deploy notification-cleanup
```

#### Step 3: Set Up Cron Trigger

In Supabase Dashboard:
1. Go to **Database** → **Cron Jobs**
2. Create a new cron job
3. Set schedule: `0 2 * * *` (daily at 2 AM UTC)
4. Set the function name: `notification-cleanup`
5. Save the cron job

### Option 3: External Cron Service

You can use external services like:
- **GitHub Actions** (scheduled workflows)
- **Vercel Cron Jobs** (if deployed on Vercel)
- **AWS EventBridge** or similar cloud schedulers

These would make HTTP requests to an API endpoint that calls the cleanup function.

Example API endpoint (`app/api/notifications/cleanup/route.ts`):

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Optional: Add authentication/authorization here
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CLEANUP_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.rpc("cleanup_old_notifications");

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      deleted_count: data?.[0]?.deleted_count || 0,
    });
  } catch (error: any) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

## Manual Execution

You can manually run the cleanup function anytime:

```sql
SELECT cleanup_old_notifications();
```

This returns the number of deleted notifications.

## Monitoring

To monitor notification cleanup:

1. **Check function execution**:
   ```sql
   SELECT cleanup_old_notifications();
   ```

2. **Check notification counts by age**:
   ```sql
   SELECT 
     COUNT(*) FILTER (WHERE dismissed = true OR seen = true) as read_count,
     COUNT(*) FILTER (WHERE dismissed = false AND seen = false) as unread_count,
     MIN(created_at) as oldest_notification
   FROM notifications;
   ```

3. **View recent deletions** (if you add logging):
   ```sql
   -- Check notifications older than 7 days that should be cleaned
   SELECT COUNT(*) 
   FROM notifications 
   WHERE (dismissed = true OR seen = true) 
     AND created_at < NOW() - INTERVAL '7 days';
   ```

## Retention Policy Summary

| Notification Status | Retention Period | Deleted After |
|-------------------|------------------|---------------|
| Dismissed | 7 days | Auto-deleted |
| Read (seen) | 7 days | Auto-deleted |
| Unread | 30 days | Auto-deleted |

**Note**: Manual deletion (via the notification center UI) removes notifications immediately, regardless of retention policy.

## Troubleshooting

### Function not found
- Ensure you've run `supabase-migration-notifications-cleanup.sql` in Supabase SQL Editor
- Verify the function exists: `SELECT * FROM pg_proc WHERE proname = 'cleanup_old_notifications';`

### Cron job not running
- Check if `pg_cron` extension is enabled
- Verify cron schedule: `SELECT * FROM cron.job;`
- Check cron logs: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;`

### Permissions error
- The function uses `SECURITY DEFINER` to run with elevated privileges
- Ensure the function has `GRANT EXECUTE` for the appropriate roles

## Best Practices

1. **Monitor cleanup execution** regularly to ensure it's working
2. **Adjust retention periods** in the function if needed (edit the SQL migration)
3. **Test manually** before relying on automatic cleanup
4. **Keep backup** of important notification data if needed before cleanup
5. **Consider notification importance** when setting retention periods

