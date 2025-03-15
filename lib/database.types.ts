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
      intern_profiles: {
        Row: {
          id: string
          first_name: string
          last_name: string
          total_points: number
          created_at: string
          is_admin: boolean
        }
        Insert: {
          id: string
          first_name: string
          last_name: string
          total_points?: number
          created_at?: string
          is_admin?: boolean
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          total_points?: number
          created_at?: string
          is_admin?: boolean
        }
      }
      task_applications: {
        Row: {
          id: string
          intern_id: string
          task_id: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          intern_id: string
          task_id: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          intern_id?: string
          task_id?: string
          status?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 