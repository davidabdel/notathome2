-- Add user_email column to user_roles table
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Update existing rows with email from auth.users if possible
UPDATE user_roles 
SET user_email = auth.users.email
FROM auth.users
WHERE user_roles.user_id = auth.users.id AND user_roles.user_email IS NULL;

-- Create index on user_email for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_email ON user_roles(user_email);

-- Add comment explaining the purpose of this column
COMMENT ON COLUMN user_roles.user_email IS 'Email address of the user, used for congregation admin login'; 