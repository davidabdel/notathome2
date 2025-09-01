export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      congregations: {
        Row: {
          id: string
          name: string
          pin_code: string
          status: 'active' | 'inactive'
        }
        Insert: {
          id?: string
          name: string
          pin_code: string
          status?: 'active' | 'inactive'
        }
        Update: {
          id?: string
          name?: string
          pin_code?: string
          status?: 'active' | 'inactive'
        }
      }
      user_roles: {
        Row: {
          id?: string
          user_id: string
          role: string
        }
        Insert: {
          id?: string
          user_id: string
          role: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
        }
      }
      locations: {
        Row: {
          id?: string
          session_id: string
          latitude: number
          longitude: number
          timestamp: string
        }
        Insert: {
          id?: string
          session_id: string
          latitude: number
          longitude: number
          timestamp: string
        }
        Update: {
          id?: string
          session_id?: string
          latitude?: number
          longitude?: number
          timestamp?: string
        }
      }
    }
  }
}
