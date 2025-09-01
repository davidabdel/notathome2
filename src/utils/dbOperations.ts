import { supabase } from './supabaseClient';

/**
 * Update an address in the not_at_home_addresses table
 */
export async function updateNotAtHomeAddress(
  id: string, 
  address: string, 
  block_number: string
) {
  // @ts-ignore - Ignore TypeScript errors for this function
  return await supabase
    .from('not_at_home_addresses')
    .update({
      address: address,
      block_number: block_number
    })
    .eq('id', id);
}
