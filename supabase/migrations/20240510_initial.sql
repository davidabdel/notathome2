-- Initial SQL (Run First)
CREATE TABLE congregations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  pin_code VARCHAR(10) NOT NULL,
  status TEXT DEFAULT 'pending'
); 