import { supabase } from '../../supabase/config';
import { PostgrestError } from '@supabase/supabase-js';

/**
 * Type-safe wrapper for Supabase operations to avoid TypeScript errors
 */

// Generic types for database operations
export type SupabaseResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

// Congregation types
export interface Congregation {
  id: string;
  name: string;
  pin_code: string;
  status: 'active' | 'inactive';
}

export type CongregationUpdate = {
  name?: string;
  pin_code?: string;
  status?: 'active' | 'inactive';
};

/**
 * Update a congregation in the database
 */
export async function updateCongregation(
  id: string, 
  data: CongregationUpdate
): Promise<SupabaseResponse<Congregation>> {
  // Use type assertion to bypass TypeScript limitations with Supabase client
  const response = await supabase
    .from('congregations')
    .update(data as any)
    .eq('id', id);
  
  return response as unknown as SupabaseResponse<Congregation>;
}

/**
 * Fetch all congregations from the database
 */
export async function fetchCongregations(): Promise<SupabaseResponse<Congregation[]>> {
  const response = await supabase
    .from('congregations')
    .select('*');
  
  return response as unknown as SupabaseResponse<Congregation[]>;
}

/**
 * Delete a congregation from the database
 */
export async function deleteCongregation(id: string): Promise<SupabaseResponse<null>> {
  const response = await supabase
    .from('congregations')
    .delete()
    .eq('id', id);
  
  return response as unknown as SupabaseResponse<null>;
}

/**
 * Create a new congregation in the database
 */
export async function createCongregation(data: Omit<Congregation, 'id'>): Promise<SupabaseResponse<Congregation>> {
  const response = await supabase
    .from('congregations')
    .insert(data as any);
  
  return response as unknown as SupabaseResponse<Congregation>;
}
