-- Drop the table if it exists
DROP TABLE IF EXISTS not_at_home_addresses;

-- Create the not_at_home_addresses table
CREATE TABLE not_at_home_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  block_number INTEGER NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE not_at_home_addresses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Anyone can insert addresses
DROP POLICY IF EXISTS "Anyone can insert addresses" ON not_at_home_addresses;
CREATE POLICY "Anyone can insert addresses" 
  ON not_at_home_addresses
  FOR INSERT
  WITH CHECK (true);

-- Anyone can view addresses
DROP POLICY IF EXISTS "Anyone can view addresses" ON not_at_home_addresses;
CREATE POLICY "Anyone can view addresses" 
  ON not_at_home_addresses
  FOR SELECT
  USING (true);

-- Anyone can update addresses
DROP POLICY IF EXISTS "Anyone can update addresses" ON not_at_home_addresses;
CREATE POLICY "Anyone can update addresses" 
  ON not_at_home_addresses
  FOR UPDATE
  USING (true);

-- Anyone can delete addresses
DROP POLICY IF EXISTS "Anyone can delete addresses" ON not_at_home_addresses;
CREATE POLICY "Anyone can delete addresses" 
  ON not_at_home_addresses
  FOR DELETE
  USING (true);

-- Refresh the schema cache
SELECT pg_catalog.pg_reload_conf();

-- Analyze the table to update statistics
ANALYZE not_at_home_addresses; 