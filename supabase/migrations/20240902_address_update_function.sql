-- Create a function to update not_at_home_addresses
CREATE OR REPLACE FUNCTION update_not_at_home_address(
  p_id UUID,
  p_address TEXT,
  p_block_number TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE public.not_at_home_addresses
  SET 
    address = p_address,
    block_number = p_block_number
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
