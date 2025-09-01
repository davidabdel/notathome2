-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings if they don't exist
INSERT INTO system_settings (key, value)
VALUES 
  ('allowNewCongregations', 'true'::jsonb),
  ('maxUsersPerCongregation', '100'::jsonb),
  ('sessionDurationHours', '4'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Add RLS policies
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read system settings
CREATE POLICY system_settings_read_policy ON system_settings
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );

-- Only admins can update system settings
CREATE POLICY system_settings_update_policy ON system_settings
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );

-- Only admins can insert system settings
CREATE POLICY system_settings_insert_policy ON system_settings
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  ); 