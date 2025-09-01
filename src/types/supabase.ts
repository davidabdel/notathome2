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
      congregations: {
        Row: {
          id: string;
          name: string;
          status: string;
          contact_email?: string | null;
          created_at?: string | null;
          pin_code?: string | null;
          map_count?: number | null;
        };
        Insert: {
          id?: string;
          name: string;
          status: string;
          contact_email?: string | null;
          created_at?: string | null;
          pin_code?: string | null;
          map_count?: number | null;
        };
        Update: {
          id?: string;
          name?: string;
          status?: string;
          contact_email?: string | null;
          created_at?: string | null;
          pin_code?: string | null;
          map_count?: number | null;
        };
      };
      territory_maps: {
        Row: {
          id: string;
          congregation_id: string;
          name: string;
          description: string | null;
          status: string;
          created_at: string;
          image_url?: string | null;
          updated_at?: string | null;
        };
        Insert: {
          id?: string;
          congregation_id: string;
          name: string;
          description?: string | null;
          status?: string;
          created_at?: string;
          image_url?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          congregation_id?: string;
          name?: string;
          description?: string | null;
          status?: string;
          created_at?: string;
          image_url?: string | null;
          updated_at?: string | null;
        };
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