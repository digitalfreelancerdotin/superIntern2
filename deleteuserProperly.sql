
-- Replace 'USER_ID_HERE' with the actual user ID you want to delete
-- Find user by email
SELECT id, email 
FROM auth.users 
WHERE email = 'USER_EMAIL_HERE';


-- 1. First delete referral visits and referrals
DELETE FROM referral_visits 
WHERE referral_code IN (
    SELECT code 
    FROM referral_codes 
    WHERE user_id = 'USER_ID_HERE'
);

DELETE FROM referrals 
WHERE referrer_id = 'USER_ID_HERE' 
   OR referred_user_id = 'USER_ID_HERE';

-- 2. Delete referral codes
DELETE FROM referral_codes 
WHERE user_id = 'USER_ID_HERE';

-- 3. Delete task applications
DELETE FROM task_applications 
WHERE intern_id = 'USER_ID_HERE';

-- 4. Delete intern points
DELETE FROM intern_points 
WHERE intern_id = 'USER_ID_HERE';

-- 5. Delete intern profile
DELETE FROM intern_profiles 
WHERE user_id = 'USER_ID_HERE';

-- 6. Finally, delete the user from auth.users
DELETE FROM auth.users 
WHERE id = 'USER_ID_HERE';