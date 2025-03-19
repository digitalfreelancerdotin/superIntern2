-- Function to update referral status and award points
CREATE OR REPLACE FUNCTION update_referral_status()
RETURNS TRIGGER AS $$
DECLARE
  referral_points INTEGER;
BEGIN
  -- Get the referral points from the environment variable or use default
  SELECT COALESCE(current_setting('app.referral_points', TRUE)::INTEGER, 10)
  INTO referral_points;

  -- If a task is marked as completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update the referral record
    UPDATE referrals
    SET 
      completed_task_count = completed_task_count + 1,
      status = CASE 
        WHEN completed_task_count + 1 >= 1 AND NOT points_awarded THEN 'completed'
        ELSE status
      END,
      points_awarded = CASE 
        WHEN completed_task_count + 1 >= 1 AND NOT points_awarded THEN TRUE
        ELSE points_awarded
      END
    WHERE referred_user_id = NEW.assigned_to
    AND NOT points_awarded;

    -- Award points to the referrer if this is the first completed task
    UPDATE intern_profiles
    SET points = points + referral_points
    FROM referrals
    WHERE 
      intern_profiles.user_id = referrals.referrer_id
      AND referrals.referred_user_id = NEW.assigned_to
      AND referrals.completed_task_count = 1
      AND referrals.points_awarded = TRUE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on tasks table
DROP TRIGGER IF EXISTS update_referral_on_task_completion ON tasks;
CREATE TRIGGER update_referral_on_task_completion
  AFTER UPDATE ON tasks
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION update_referral_status(); 