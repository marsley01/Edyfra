-- Enable Row Level Security (RLS) on group_match_requests
ALTER TABLE group_match_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing select policy if any to avoid errors on retry
DROP POLICY IF EXISTS select_group_match_requests ON group_match_requests;

-- Create Select policy
CREATE POLICY select_group_match_requests ON group_match_requests
  FOR SELECT
  USING (
    auth.uid()::text = ANY(student_ids)
    OR auth.uid()::text = tutor_id
  );
