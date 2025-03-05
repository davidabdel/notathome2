-- Reset Database and Create Super Admin Account

-- Step 1: Clear existing data (only if tables exist)
DO $$
BEGIN
    -- Only truncate if tables exist
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        EXECUTE 'TRUNCATE TABLE user_roles CASCADE';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'congregation_requests') THEN
        EXECUTE 'TRUNCATE TABLE congregation_requests CASCADE';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'congregations') THEN
        EXECUTE 'TRUNCATE TABLE congregations CASCADE';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'system_settings') THEN
        EXECUTE 'TRUNCATE TABLE system_settings CASCADE';
    END IF;
END $$;

-- Step 2: Reset auth tables (remove all users except super admin)
-- First, create a temporary table to store the super admin ID if it exists
CREATE TEMP TABLE temp_admin_id AS
SELECT id FROM auth.users WHERE email = 'david@uconnect.com.au';

-- Delete all users except the super admin (if exists)
DELETE FROM auth.users
WHERE email != 'david@uconnect.com.au';

-- Step 3: Create super admin user if it doesn't exist
-- Check if super admin exists
DO $$
DECLARE
    admin_exists boolean;
    admin_id uuid;
BEGIN
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'david@uconnect.com.au') INTO admin_exists;
    
    IF NOT admin_exists THEN
        -- Create the super admin user with a UUID
        INSERT INTO auth.users (
            id,
            email, 
            encrypted_password, 
            email_confirmed_at, 
            role
        )
        VALUES (
            gen_random_uuid(),
            'david@uconnect.com.au',
            crypt('123456', gen_salt('bf')),
            NOW(),
            'authenticated'
        )
        RETURNING id INTO admin_id;
        
        -- Store the ID for later use
        INSERT INTO temp_admin_id VALUES (admin_id);
    END IF;
END $$;

-- Step 4: Assign admin role to the super admin (only if user_roles table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        EXECUTE '
            INSERT INTO user_roles (user_id, role, user_email)
            SELECT id, ''admin'', ''david@uconnect.com.au''
            FROM temp_admin_id
            ON CONFLICT (user_id, congregation_id, role) 
            WHERE congregation_id IS NULL
            DO NOTHING
        ';
    END IF;
END $$;

-- Step 5: Restore default system settings (only if system_settings table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'system_settings') THEN
        EXECUTE '
            INSERT INTO system_settings (key, value)
            VALUES 
              (''allowNewCongregations'', ''true''::jsonb),
              (''maxUsersPerCongregation'', ''100''::jsonb),
              (''sessionDurationHours'', ''4''::jsonb)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        ';
    END IF;
END $$;

-- Clean up
DROP TABLE temp_admin_id;

-- Confirmation message
DO $$
BEGIN
    RAISE NOTICE 'Database reset complete. Super admin account created/preserved for david@uconnect.com.au';
END $$; 