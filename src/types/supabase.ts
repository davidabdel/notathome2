export interface Database {
  public: {
    Tables: {
      addresses: {
        Row: {
          id: string;
          address: string | null;
          created_at: string;
          session_id: string;
          block_number?: string;
          latitude?: number;
          longitude?: number;
        };
        Insert: {
          id?: string;
          address?: string | null;
          created_at?: string;
          session_id: string;
          block_number?: string;
          latitude?: number;
          longitude?: number;
        };
        Update: {
          id?: string;
          address?: string | null;
          created_at?: string;
          session_id?: string;
          block_number?: string;
          latitude?: number;
          longitude?: number;
        };
      };
      not_at_home_addresses: {
        Row: {
          id: string;
          address: string | null;
          created_at: string;
          session_id: string;
          block_number?: string;
          latitude?: number;
          longitude?: number;
        };
        Insert: {
          id?: string;
          address?: string | null;
          created_at?: string;
          session_id: string;
          block_number?: string;
          latitude?: number;
          longitude?: number;
        };
        Update: {
          id?: string;
          address?: string | null;
          created_at?: string;
          session_id?: string;
          block_number?: string;
          latitude?: number;
          longitude?: number;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
} 