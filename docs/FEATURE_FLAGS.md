# Feature Flags

Feature flags allow turning features on/off without a redeploy.

## Available Flags

| Flag | Default | Description |
|------|---------|-------------|
| `new_matching_algo` | false | New group matching algorithm |
| `institution_portal` | false | Institution dashboard |
| `holiday_coaching` | false | Holiday coaching system |
| `ai_chat_v2` | false | Next-gen AI chat interface |
| `paystack_payments` | false | Paystack payment integration |
| `mpesa_payments` | false | M-Pesa payment integration |
| `community_forum` | true | Community forum features |
| `push_notifications` | true | Web push notifications |

## Usage

```typescript
const flags = await supabase.from("feature_flags").select("name, enabled");
const isEnabled = (name: string) =>
  flags.data?.find((f) => f.name === name)?.enabled ?? false;
```

## Emergency killswitch

If a feature causes issues in production:
1. Go to Supabase → Table Editor → `feature_flags`
2. Set `enabled = false` for the affected flag
3. The feature stops immediately for all users — no deploy needed
