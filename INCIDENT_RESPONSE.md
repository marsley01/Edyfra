# Incident Response Runbook — Edyfra

## When Edyfra Goes Down

### First 5 minutes
- [ ] Check Vercel deployment status → https://vercel.com
- [ ] Check Better Uptime / `/api/health` for which service failed
- [ ] Check Sentry for the error → https://sentry.io
- [ ] Check Supabase status page → https://status.supabase.com

### If it is a code bug
- [ ] Identify the failing deployment in Vercel → Deployments
- [ ] Rollback to previous deployment (Promote to Production)
- [ ] Verify `/api/health` returns 200
- [ ] Post in WhatsApp dev group: "Rolled back to [version] — investigating root cause"

### If it is a database issue
- [ ] Check Supabase Dashboard → Logs for errors
- [ ] Check if a migration ran recently
- [ ] Run the down migration to revert
- [ ] If data is corrupted: restore from the last manual backup

### If it is a third-party service
- [ ] Stream down: https://status.getstream.io
- [ ] Supabase down: https://status.supabase.com
- [ ] Vercel down: https://vercel-status.com
- [ ] OpenRouter down: check their status page
- [ ] Wait for the service to recover — nothing to do

### After recovery
- [ ] Write a brief post-mortem in the GitHub issue tracker
  - What broke, why, how long it took to fix
  - What will prevent this next time
