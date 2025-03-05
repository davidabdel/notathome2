import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from './config';

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
  
  // Create a unique channel key
  const channelKey = `${schema}:${table}:${event}:${filter || 'all'}`;
  
  // Check if we already have an active channel for this subscription
  if (activeChannels[channelKey]) {
    console.log(`Using existing channel for ${channelKey}`);
    return () => {
      // Return a function to unsubscribe
      activeChannels[channelKey].unsubscribe();
      delete activeChannels[channelKey];
    };
  }
  
  // Create a new channel
  const channel = supabase.channel(channelKey);
  
  // Build the subscription
  let subscription = channel.on(
    'postgres_changes' as any,
    {
      event,
      schema,
      table,
      ...(filter ? { filter } : {})
    },
    (payload: RealtimePostgresChangesPayload<T>) => {
      callback(payload.new ? { new: payload.new as T, old: payload.old as T } : { new: {} as T, old: {} as T });
    }
  );
  
  // Subscribe to the channel
  subscription.subscribe((status) => {
    console.log(`Realtime subscription status for ${channelKey}:`, status);
  });
  
  // Store the channel
  activeChannels[channelKey] = channel;
  
  // Return a function to unsubscribe
  return () => {
    channel.unsubscribe();
    delete activeChannels[channelKey];
  };
};

/**
 * Subscribe to real-time location updates for a specific session
 * @param sessionId The session ID to subscribe to
 * @param callback Function to call when a new location is added
 * @returns A function to unsubscribe
 */
export const subscribeToLocationUpdates = (
  sessionId: string,
  callback: (location: Record<string, any>) => void
): (() => void) => {
  return subscribeToUpdates(
    {
      event: 'INSERT',
      table: 'locations',
      filter: `session_id=eq.${sessionId}`
    },
    (payload) => {
      if (payload.new) {
        callback(payload.new);
      }
    }
  );
};

/**
 * Subscribe to real-time session updates
 * @param sessionId The session ID to subscribe to
 * @param callback Function to call when the session is updated
 * @returns A function to unsubscribe
 */
export const subscribeToSessionUpdates = (
  sessionId: string,
  callback: (session: Record<string, any>) => void
): (() => void) => {
  return subscribeToUpdates(
    {
      event: 'UPDATE',
      table: 'sessions',
      filter: `id=eq.${sessionId}`
    },
    (payload) => {
      if (payload.new) {
        callback(payload.new);
      }
    }
  );
};

/**
 * Broadcast a location update to all subscribers
 * @param sessionId The session ID
 * @param coordinates The coordinates to broadcast
 */
export const broadcastLocation = async (
  sessionId: string,
  coordinates: { lat: number; lng: number }
) => {
  try {
    const { error } = await supabase.from('locations').insert({
      session_id: sessionId,
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      timestamp: new Date().toISOString()
    });
    
    if (error) {
      console.error('Error broadcasting location:', error);
    }
  } catch (err) {
    console.error('Failed to broadcast location:', err);
  }
};

export default {
  subscribeToUpdates,
  subscribeToLocationUpdates,
  subscribeToSessionUpdates,
  broadcastLocation
}; 