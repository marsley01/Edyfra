SELECT conname as constraint_name, contype as constraint_type, pg_get_constraintdef(oid) as constraint_def
FROM pg_constraint
WHERE conrelid = 'public."PushSubscription"'::regclass;
