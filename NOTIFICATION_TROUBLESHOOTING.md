# Notification System Troubleshooting Guide

## Understanding Cron Jobs vs Manual Testing

### Automatic Cron Execution
Your Edge Functions are configured to run automatically via Supabase cron jobs:

```toml
[functions.generate-notifications]
enabled = true
schedule = "0 0 * * *"  # Runs daily at midnight UTC
verify_jwt = false      # No auth required for cron

[functions.send-notifications]
enabled = true
schedule = "*/15 * * * *"  # Runs every 15 minutes
verify_jwt = false         # No auth required for cron
```

**These will run automatically once deployed - no manual setup required.**

### Manual Testing (causing your 401 error)
When you manually test the functions, you need proper authentication.

## Resolving the 401 Error

### Option 1: Test with Service Role Key (Recommended)
```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/generate-notifications' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'
```

### Option 2: Test with User JWT Token
```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/generate-notifications' \
  -H 'Authorization: Bearer YOUR_USER_JWT_TOKEN' \
  -H 'Content-Type: application/json'
```

### Option 3: Temporarily Disable JWT Verification for Testing
In `supabase/config.toml`, you can temporarily set:
```toml
[functions.generate-notifications]
verify_jwt = false
```

## Getting Your Service Role Key

1. Go to your Supabase Dashboard
2. Navigate to Settings → API
3. Copy the `service_role` key (keep this secret!)
4. Use it in the Authorization header: `Bearer YOUR_SERVICE_ROLE_KEY`

## Testing the Functions

### Test generate-notifications
```bash
curl -X POST \
  'https://uhnvncqogcfgkdhlvmzq.supabase.co/functions/v1/generate-notifications' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'
```

### Test send-notifications
```bash
curl -X POST \
  'https://uhnvncqogcfgkdhlvmzq.supabase.co/functions/v1/send-notifications' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'
```

## Monitoring Cron Jobs

### Check Function Logs
1. Go to Supabase Dashboard
2. Navigate to Edge Functions
3. Click on your function name
4. View the "Logs" tab to see execution history

### Check Scheduled Notifications
Query your database to see if notifications are being created:
```sql
SELECT * FROM scheduled_notifications 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check Device Tokens
Ensure users have device tokens registered:
```sql
SELECT user_id, token, created_at 
FROM device_tokens 
ORDER BY created_at DESC;
```

## Common Issues and Solutions

### 1. No Notifications Being Generated
- Check if users have active goals
- Verify notification_days in preferences
- Check function logs for errors

### 2. Notifications Not Being Sent
- Verify device tokens are registered
- Check Expo push token format
- Review send-notifications function logs

### 3. Users Not Receiving Push Notifications
- Ensure app has notification permissions
- Verify device token is valid
- Check if notifications are marked as "sent" in database

### 4. OpenAI API Errors
- Verify OPENAI_API_KEY environment variable is set
- Check API quota and billing
- Review function logs for specific error messages

## Environment Variables Required

Make sure these are set in your Supabase project:

1. `OPENAI_API_KEY` - Your OpenAI API key
2. `SUPABASE_URL` - Auto-provided by Supabase
3. `SUPABASE_SERVICE_ROLE_KEY` - Auto-provided by Supabase

## Deployment Status

Your cron jobs will start working automatically once:
1. The functions are deployed to Supabase
2. Environment variables are configured
3. The database migrations are applied

No manual cron setup is required - Supabase handles this automatically based on your `config.toml` settings.