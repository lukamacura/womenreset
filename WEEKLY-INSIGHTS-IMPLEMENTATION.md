# Weekly Insights System Implementation

## Overview
Replaced the AI-generated "What Lisa Noticed" component with a data-based weekly insights system. This system provides pure data calculations without AI, making it App Store compliant (no diagnosis, no treatment recommendations).

## What Was Changed

### 1. Database Schema

#### New Table: `weekly_insights`
- Stores generated insights for each user per week
- Fields: `id`, `user_id`, `insight_type`, `content`, `data_json`, `week_start`, `week_end`, `created_at`, `read_at`, `sent_as_notification`
- Migration: `supabase-migration-weekly-insights.sql`

#### Updated Table: `user_preferences`
- Added fields for weekly insights preferences:
  - `weekly_insights_enabled` (boolean, default: true)
  - `weekly_insights_day` (text: 'sunday' or 'monday', default: 'sunday')
  - `weekly_insights_time` (time, default: '20:00')
- Migration: `supabase-migration-weekly-insights-preferences.sql`

#### Updated Table: `notifications`
- Added 'weekly_insights' to notification type check constraint
- Migration: `supabase-migration-notifications-weekly-insights.sql`

### 2. Components

#### Removed
- `components/symptom-tracker/WhatLisaNoticed.tsx` (no longer used in symptoms page)

#### Created
- `components/insights/WeeklyInsights.tsx` - Main component displaying weekly insights
- `lib/insights/insightTemplates.ts` - Text templates for each insight type
- `lib/insights/generateInsights.ts` - Pure data calculation logic
- `hooks/useWeeklyInsights.ts` - React hook for fetching insights

### 3. API Endpoints

#### Created
- `app/api/insights/weekly/route.ts` - GET endpoint to fetch/generate weekly insights
- `app/api/cron/weekly-insights/route.ts` - Cron job endpoint for weekly notifications

#### Updated
- `app/api/notifications/preferences/route.ts` - Added weekly insights preference fields

### 4. Pages

#### Updated
- `app/dashboard/symptoms/page.tsx` - Replaced `WhatLisaNoticed` with `WeeklyInsights`
- `app/dashboard/settings/notifications/page.tsx` - Added weekly insights settings UI

### 5. Cron Jobs

#### Added to `vercel.json`
- Sunday 8:00 PM UTC: `/api/cron/weekly-insights`
- Monday 8:00 AM UTC: `/api/cron/weekly-insights`

## Insight Types

The system generates 7 types of insights (when applicable):

1. **Frequency**: "You logged X symptoms this week. Most frequent: Y (Z)."
2. **Comparison**: "X: Y this week vs. Z last week."
3. **Consistency**: "You tracked X out of 7 days this week." (always shown)
4. **Trigger Pattern**: "You tagged 'X' on Y logs this week." (if trigger appears 3+ times)
5. **Time Pattern**: "Most symptoms logged in the [morning/afternoon/evening/night]." (if 4+ symptoms at same time)
6. **Good Days**: "You had X good days this week." (if any "Good Day" logs)
7. **Severity**: "Severity: X mild, Y moderate, Z severe." (if 3+ logs)

## Key Features

- **Pure Data Calculations**: No AI, no LLM calls, no medical advice
- **Real-time Updates**: Insights refresh when user logs symptoms
- **Weekly Notifications**: Automated weekly summaries sent via notifications
- **User Preferences**: Users can configure when to receive weekly insights
- **App Store Compliant**: Only data reflection, no diagnosis or treatment recommendations

## Migration Steps

1. Run `supabase-migration-weekly-insights.sql` in Supabase SQL Editor
2. Run `supabase-migration-weekly-insights-preferences.sql` in Supabase SQL Editor
3. Run `supabase-migration-notifications-weekly-insights.sql` in Supabase SQL Editor
4. Deploy code changes
5. Cron jobs will automatically start running on Vercel

## Testing

- Test insight generation with various symptom log scenarios
- Verify weekly notifications are sent at configured times
- Test user preferences UI updates
- Verify insights display correctly on symptoms page

## Notes

- The old `WhatLisaNoticed` component file still exists but is no longer imported/used in the symptoms page
- Weekly insights are calculated based on Sunday-Saturday week boundaries
- Insights are cached for 1 hour to avoid regenerating on every page load
- Notifications are only sent once per week per user (tracked via `sent_as_notification` flag)
