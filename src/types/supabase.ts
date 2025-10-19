export interface Database {
  public: {
    Tables: {
      congregations: {
        Row: {
          id: string;
          name: string;
          pin_code: string;
          contact_email: string;
          notification_email: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          pin_code: string;
          contact_email: string;
          notification_email?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          pin_code?: string;
          contact_email?: string;
          notification_email?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
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
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          congregation_id: string;
          role: string;
          user_email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          congregation_id: string;
          role: string;
          user_email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          congregation_id?: string;
          role?: string;
          user_email?: string | null;
          created_at?: string;
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