import { supabase } from './supabaseClient';

/**
 * Update an address in the not_at_home_addresses table using a custom SQL function
 */
export async function updateNotAtHomeAddress(
  id: string, 
  address: string, 
  block_number: string
) {
  // Call the SQL function we created to avoid TypeScript errors
  return await (supabase as any).rpc('update_not_at_home_address', {
    p_id: id,
    p_address: address,
    p_block_number: block_number
  });
}
