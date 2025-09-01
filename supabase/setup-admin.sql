-- Temporarily disable RLS for the congregations table
ALTER TABLE congregations DISABLE ROW LEVEL SECURITY;

-- Check if Admin Congregation already exists
DO $$
DECLARE
  congregation_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM congregations WHERE name = 'Admin Congregation'
  ) INTO congregation_exists;
  
  IF NOT congregation_exists THEN
    -- Insert the Admin Congregation
    INSERT INTO congregations (name, pin_code, status)
    VALUES ('Admin Congregation', '123456', 'active');
    
    RAISE NOTICE 'Admin Congregation created successfully';
  ELSE
    RAISE NOTICE 'Admin Congregation already exists';
  END IF;
END $$;

-- Re-enable RLS for the congregations table
ALTER TABLE congregations ENABLE ROW LEVEL SECURITY; 