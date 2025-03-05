import { RealtimeChannel, RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

// Explicitly type the supabase client
const supabaseClient: SupabaseClient = supabase;

interface RealtimeSubscriptionOptions {
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  table: string;
  filter?: string;
}

// Store active channels to prevent duplicate subscriptions
const activeChannels: Record<string, RealtimeChannel> = {};

/**
 * Subscribe to real-time updates for a specific table
 * @param options Subscription options
 * @param callback Function to call when an update is received
 * @returns A function to unsubscribe
 */
export const subscribeToUpdates = <T extends Record<string, any> = Record<string, any>>(
  options: RealtimeSubscriptionOptions,
  callback: (payload: { new: T; old: T }) => void
): (() => void) => {
  const { event = '*', schema = 'public', table, filter } = options;
  
  // Create a unique key for this subscription
  const channelKey = `${schema}:${table}:${event}:${filter || 'all'}`;
  
  // Check if we already have an active channel for this subscription
  if (activeChannels[channelKey]) {
    console.log(`Using existing channel for ${channelKey}`);
    return () => {
      // No-op, we're keeping the channel open for other subscribers
    };
  }
  
  // Create a new channel
  console.log(`Creating new channel for ${channelKey}`);
  const channel = supabaseClient
    .channel(channelKey)
    .on<T>(
      'postgres_changes',
      {
        event,
        schema,
        table,
        filter: filter ? filter : undefined,
      },
      (payload: RealtimePostgresChangesPayload<T>) => {
        callback({
          new: payload.new as T,
          old: payload.old as T,
        });
      }
    )
    .subscribe((status) => {
      console.log(`Realtime subscription status for ${channelKey}:`, status);
    });
  
  // Store the channel for future use
  activeChannels[channelKey] = channel;
  
  // Return a function to unsubscribe
  return () => {
    // We don't actually unsubscribe here to keep the channel open for other components
    // In a production app, you might want to implement reference counting
    console.log(`Keeping channel ${channelKey} open for other subscribers`);
  };
};

/**
 * Subscribe to location updates for a specific session
 * @param sessionId The session ID to subscribe to
 * @param callback Function to call when a location update is received
 * @returns A function to unsubscribe
 */
export const subscribeToLocationUpdates = (
  sessionId: string,
  callback: (location: Record<string, any>) => void
): (() => void) => {
  return subscribeToUpdates(
    {
      table: 'not_at_home_addresses',
      event: 'INSERT',
      filter: `session_id=eq.${sessionId}`,
    },
    (payload) => {
      if (payload.new) {
        callback(payload.new);
      }
    }
  );
};

/**
 * Subscribe to session updates
 * @param sessionId The session ID to subscribe to
 * @param callback Function to call when a session update is received
 * @returns A function to unsubscribe
 */
export const subscribeToSessionUpdates = (
  sessionId: string,
  callback: (session: Record<string, any>) => void
): (() => void) => {
  return subscribeToUpdates(
    {
      table: 'sessions',
      event: 'UPDATE',
      filter: `id=eq.${sessionId}`,
    },
    (payload) => {
      if (payload.new) {
        callback(payload.new);
      }
    }
  );
};

/**
 * Broadcast a location to the server
 * @param sessionId The session ID to broadcast to
 * @param coordinates The coordinates to broadcast
 */
export const broadcastLocation = async (
  sessionId: string,
  coordinates: { lat: number; lng: number }
) => {
  try {
    const { error } = await supabaseClient.from('not_at_home_addresses').insert({
      session_id: sessionId,
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      created_at: new Date().toISOString(),
    });
    
    if (error) {
      console.error('Error broadcasting location:', error);
      throw error;
    }
  } catch (err) {
    console.error('Failed to broadcast location:', err);
    throw err;
  }
}; 