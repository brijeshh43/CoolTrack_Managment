export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      attendance: {
        Row: {
          created_at: string;
          engineer_id: string;
          id: string;
          in_address: string | null;
          in_latitude: number | null;
          in_longitude: number | null;
          in_time: string;
          out_address: string | null;
          out_latitude: number | null;
          out_longitude: number | null;
          out_time: string | null;
          remarks: string | null;
          selfie_path: string | null;
          work_date: string;
        };
        Insert: {
          created_at?: string;
          engineer_id: string;
          id?: string;
          in_address?: string | null;
          in_latitude?: number | null;
          in_longitude?: number | null;
          in_time?: string;
          out_address?: string | null;
          out_latitude?: number | null;
          out_longitude?: number | null;
          out_time?: string | null;
          remarks?: string | null;
          selfie_path?: string | null;
          work_date?: string;
        };
        Update: {
          created_at?: string;
          engineer_id?: string;
          id?: string;
          in_address?: string | null;
          in_latitude?: number | null;
          in_longitude?: number | null;
          in_time?: string;
          out_address?: string | null;
          out_latitude?: number | null;
          out_longitude?: number | null;
          out_time?: string | null;
          remarks?: string | null;
          selfie_path?: string | null;
          work_date?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          details: Json;
          entity: string;
          entity_id: string | null;
          id: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          entity: string;
          entity_id?: string | null;
          id?: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          entity?: string;
          entity_id?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      breakdown_records: {
        Row: {
          action_taken: string | null;
          complaint: string | null;
          created_at: string;
          diagnosis: string | null;
          gas_charged_at: string | null;
          gas_quantity: string | null;
          gas_type: string | null;
          id: string;
          job_id: string;
          remarks: string | null;
          updated_at: string;
          valve_details: string | null;
        };
        Insert: {
          action_taken?: string | null;
          complaint?: string | null;
          created_at?: string;
          diagnosis?: string | null;
          gas_charged_at?: string | null;
          gas_quantity?: string | null;
          gas_type?: string | null;
          id?: string;
          job_id: string;
          remarks?: string | null;
          updated_at?: string;
          valve_details?: string | null;
        };
        Update: {
          action_taken?: string | null;
          complaint?: string | null;
          created_at?: string;
          diagnosis?: string | null;
          gas_charged_at?: string | null;
          gas_quantity?: string | null;
          gas_type?: string | null;
          id?: string;
          job_id?: string;
          remarks?: string | null;
          updated_at?: string;
          valve_details?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "breakdown_records_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: true;
            referencedRelation: "service_jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      commissioning_records: {
        Row: {
          commissioning_status: string | null;
          created_at: string;
          id: string;
          job_id: string;
          remarks: string | null;
          test_results: Json;
          updated_at: string;
        };
        Insert: {
          commissioning_status?: string | null;
          created_at?: string;
          id?: string;
          job_id: string;
          remarks?: string | null;
          test_results?: Json;
          updated_at?: string;
        };
        Update: {
          commissioning_status?: string | null;
          created_at?: string;
          id?: string;
          job_id?: string;
          remarks?: string | null;
          test_results?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "commissioning_records_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: true;
            referencedRelation: "service_jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_signatures: {
        Row: {
          captured_by: string | null;
          customer_name: string;
          id: string;
          job_id: string;
          latitude: number | null;
          longitude: number | null;
          signature_data: string;
          signed_at: string;
        };
        Insert: {
          captured_by?: string | null;
          customer_name: string;
          id?: string;
          job_id: string;
          latitude?: number | null;
          longitude?: number | null;
          signature_data: string;
          signed_at?: string;
        };
        Update: {
          captured_by?: string | null;
          customer_name?: string;
          id?: string;
          job_id?: string;
          latitude?: number | null;
          longitude?: number | null;
          signature_data?: string;
          signed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_signatures_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: true;
            referencedRelation: "service_jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          address: string | null;
          contact_number: string | null;
          created_at: string;
          created_by: string | null;
          customer_code: string;
          email: string | null;
          id: string;
          latitude: number | null;
          location: string | null;
          longitude: number | null;
          name: string;
          remarks: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          contact_number?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_code: string;
          email?: string | null;
          id?: string;
          latitude?: number | null;
          location?: string | null;
          longitude?: number | null;
          name: string;
          remarks?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          contact_number?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_code?: string;
          email?: string | null;
          id?: string;
          latitude?: number | null;
          location?: string | null;
          longitude?: number | null;
          name?: string;
          remarks?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      installation_records: {
        Row: {
          cable_details: string | null;
          copper_pipe_details: string | null;
          created_at: string;
          id: string;
          installation_location: string | null;
          job_id: string;
          pipe_size: string | null;
          remarks: string | null;
          updated_at: string;
        };
        Insert: {
          cable_details?: string | null;
          copper_pipe_details?: string | null;
          created_at?: string;
          id?: string;
          installation_location?: string | null;
          job_id: string;
          pipe_size?: string | null;
          remarks?: string | null;
          updated_at?: string;
        };
        Update: {
          cable_details?: string | null;
          copper_pipe_details?: string | null;
          created_at?: string;
          id?: string;
          installation_location?: string | null;
          job_id?: string;
          pipe_size?: string | null;
          remarks?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "installation_records_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: true;
            referencedRelation: "service_jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      job_media: {
        Row: {
          captured_at: string;
          checklist_key: string | null;
          created_at: string;
          customer_id: string | null;
          id: string;
          job_id: string;
          kind: Database["public"]["Enums"]["media_kind"];
          label: string | null;
          latitude: number | null;
          longitude: number | null;
          remarks: string | null;
          storage_path: string;
          unit_id: string | null;
          uploaded_by: string | null;
        };
        Insert: {
          captured_at?: string;
          checklist_key?: string | null;
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          job_id: string;
          kind?: Database["public"]["Enums"]["media_kind"];
          label?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          remarks?: string | null;
          storage_path: string;
          unit_id?: string | null;
          uploaded_by?: string | null;
        };
        Update: {
          captured_at?: string;
          checklist_key?: string | null;
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          job_id?: string;
          kind?: Database["public"]["Enums"]["media_kind"];
          label?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          remarks?: string | null;
          storage_path?: string;
          unit_id?: string | null;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "job_media_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_media_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "service_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_media_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
        ];
      };
      location_logs: {
        Row: {
          address: string | null;
          created_at: string;
          event: string;
          id: string;
          job_id: string | null;
          latitude: number | null;
          longitude: number | null;
          user_id: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          event: string;
          id?: string;
          job_id?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          user_id: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          event?: string;
          id?: string;
          job_id?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "location_logs_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "service_jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      parts: {
        Row: {
          category: string | null;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          part_number: string | null;
          remarks: string | null;
          unit_of_measure: string | null;
          updated_at: string;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          part_number?: string | null;
          remarks?: string | null;
          unit_of_measure?: string | null;
          updated_at?: string;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          part_number?: string | null;
          remarks?: string | null;
          unit_of_measure?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      parts_used: {
        Row: {
          condition: string;
          created_at: string;
          id: string;
          job_id: string;
          part_id: string | null;
          part_name: string;
          part_number: string | null;
          photo_path: string | null;
          quantity: number;
          recorded_by: string | null;
          remarks: string | null;
          serial_number: string | null;
          unit_id: string | null;
        };
        Insert: {
          condition?: string;
          created_at?: string;
          id?: string;
          job_id: string;
          part_id?: string | null;
          part_name: string;
          part_number?: string | null;
          photo_path?: string | null;
          quantity?: number;
          recorded_by?: string | null;
          remarks?: string | null;
          serial_number?: string | null;
          unit_id?: string | null;
        };
        Update: {
          condition?: string;
          created_at?: string;
          id?: string;
          job_id?: string;
          part_id?: string | null;
          part_name?: string;
          part_number?: string | null;
          photo_path?: string | null;
          quantity?: number;
          recorded_by?: string | null;
          remarks?: string | null;
          serial_number?: string | null;
          unit_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "parts_used_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "service_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parts_used_part_id_fkey";
            columns: ["part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parts_used_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
        ];
      };
      pm_records: {
        Row: {
          checklist: Json;
          created_at: string;
          id: string;
          job_id: string;
          remarks: string | null;
          updated_at: string;
        };
        Insert: {
          checklist?: Json;
          created_at?: string;
          id?: string;
          job_id: string;
          remarks?: string | null;
          updated_at?: string;
        };
        Update: {
          checklist?: Json;
          created_at?: string;
          id?: string;
          job_id?: string;
          remarks?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pm_records_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: true;
            referencedRelation: "service_jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          employee_code: string | null;
          full_name: string;
          id: string;
          is_active: boolean;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          employee_code?: string | null;
          full_name?: string;
          id: string;
          is_active?: boolean;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          employee_code?: string | null;
          full_name?: string;
          id?: string;
          is_active?: boolean;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      service_jobs: {
        Row: {
          complete_latitude: number | null;
          complete_longitude: number | null;
          completed_at: string | null;
          completed_by: string | null;
          created_at: string;
          created_by: string | null;
          customer_id: string;
          description: string | null;
          engineer_id: string | null;
          id: string;
          job_number: string;
          job_type: Database["public"]["Enums"]["job_type"];
          priority: string;
          remarks: string | null;
          scheduled_at: string | null;
          start_latitude: number | null;
          start_longitude: number | null;
          started_at: string | null;
          status: Database["public"]["Enums"]["job_status"];
          unit_id: string | null;
          updated_at: string;
        };
        Insert: {
          complete_latitude?: number | null;
          complete_longitude?: number | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_id: string;
          description?: string | null;
          engineer_id?: string | null;
          id?: string;
          job_number?: string;
          job_type: Database["public"]["Enums"]["job_type"];
          priority?: string;
          remarks?: string | null;
          scheduled_at?: string | null;
          start_latitude?: number | null;
          start_longitude?: number | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["job_status"];
          unit_id?: string | null;
          updated_at?: string;
        };
        Update: {
          complete_latitude?: number | null;
          complete_longitude?: number | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string;
          description?: string | null;
          engineer_id?: string | null;
          id?: string;
          job_number?: string;
          job_type?: Database["public"]["Enums"]["job_type"];
          priority?: string;
          remarks?: string | null;
          scheduled_at?: string | null;
          start_latitude?: number | null;
          start_longitude?: number | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["job_status"];
          unit_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_jobs_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_jobs_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
        ];
      };
      service_reports: {
        Row: {
          created_at: string;
          id: string;
          job_id: string;
          report_number: string;
          review_notes: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["report_status"];
          submitted_by: string | null;
          summary: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          job_id: string;
          report_number?: string;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
          submitted_by?: string | null;
          summary?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          job_id?: string;
          report_number?: string;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
          submitted_by?: string | null;
          summary?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_reports_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: true;
            referencedRelation: "service_jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      units: {
        Row: {
          created_at: string;
          customer_id: string;
          equipment_type: string | null;
          id: string;
          installation_date: string | null;
          location: string | null;
          model_number: string | null;
          photo_url: string | null;
          remarks: string | null;
          serial_number: string | null;
          status: string;
          unit_code: string;
          updated_at: string;
          warranty_info: string | null;
          warranty_until: string | null;
        };
        Insert: {
          created_at?: string;
          customer_id: string;
          equipment_type?: string | null;
          id?: string;
          installation_date?: string | null;
          location?: string | null;
          model_number?: string | null;
          photo_url?: string | null;
          remarks?: string | null;
          serial_number?: string | null;
          status?: string;
          unit_code: string;
          updated_at?: string;
          warranty_info?: string | null;
          warranty_until?: string | null;
        };
        Update: {
          created_at?: string;
          customer_id?: string;
          equipment_type?: string | null;
          id?: string;
          installation_date?: string | null;
          location?: string | null;
          model_number?: string | null;
          photo_url?: string | null;
          remarks?: string | null;
          serial_number?: string | null;
          status?: string;
          unit_code?: string;
          updated_at?: string;
          warranty_info?: string | null;
          warranty_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "units_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          author_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          author_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          author_id?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_access_job: { Args: { _job_id: string }; Returns: boolean };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_admin: { Args: never; Returns: boolean };
    };
    Enums: {
      app_role: "admin" | "engineer";
      job_status:
        | "assigned"
        | "accepted"
        | "on_the_way"
        | "arrived"
        | "in_progress"
        | "waiting_for_parts"
        | "completed"
        | "cancelled";
      job_type: "pm" | "breakdown" | "installation" | "commissioning";
      media_kind: "photo" | "video";
      report_status: "draft" | "submitted" | "approved" | "rejected";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "engineer"],
      job_status: [
        "assigned",
        "accepted",
        "on_the_way",
        "arrived",
        "in_progress",
        "waiting_for_parts",
        "completed",
        "cancelled",
      ],
      job_type: ["pm", "breakdown", "installation", "commissioning"],
      media_kind: ["photo", "video"],
      report_status: ["draft", "submitted", "approved", "rejected"],
    },
  },
} as const;
