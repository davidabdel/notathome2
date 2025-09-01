-- RLS Policies
ALTER TABLE congregations ENABLE ROW LEVEL SECURITY;

-- Create user_roles table for role-based access control
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  congregation_id UUID REFERENCES congregations(id),
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, congregation_id, role)
);

-- Create congregation_requests table
CREATE TABLE congregation_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  pin_code VARCHAR(10) NOT NULL,
  contact_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Policy for congregation admins to view their congregation
CREATE POLICY congregation_admins ON congregations
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'congregation_admin' AND congregation_id = id
  ));

-- Policy for viewing congregation requests (admin only)
ALTER TABLE congregation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_view_requests ON congregation_requests
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  ));

-- Policy for creating congregation requests (public)
CREATE POLICY create_congregation_request ON congregation_requests
  FOR INSERT WITH CHECK (true);  -- Anyone can submit a request 