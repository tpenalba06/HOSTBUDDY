export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      conversations: {
        Row: {
          created_at: string
          guest_contact: string | null
          guest_display_name: string
          id: string
          last_message_at: string
          organization_id: string
          property_id: string
          status: string
        }
        Insert: {
          created_at?: string
          guest_contact?: string | null
          guest_display_name: string
          id?: string
          last_message_at?: string
          organization_id: string
          property_id: string
          status?: string
        }
        Update: {
          created_at?: string
          guest_contact?: string | null
          guest_display_name?: string
          id?: string
          last_message_at?: string
          organization_id?: string
          property_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_message_rate_limits: {
        Row: {
          created_at: string
          fingerprint: string
          id: string
        }
        Insert: {
          created_at?: string
          fingerprint: string
          id?: string
        }
        Update: {
          created_at?: string
          fingerprint?: string
          id?: string
        }
        Relationships: []
      }
      guide_section_translations: {
        Row: {
          content: Json
          created_at: string
          id: string
          is_stale: boolean
          locale: string
          section_id: string
          source_type: string
          source_updated_at: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          is_stale?: boolean
          locale: string
          section_id: string
          source_type?: string
          source_updated_at: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          is_stale?: boolean
          locale?: string
          section_id?: string
          source_type?: string
          source_updated_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_section_translations_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "guide_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_sections: {
        Row: {
          content: Json
          created_at: string
          id: string
          is_visible: boolean
          property_id: string
          section_key: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          property_id: string
          section_key: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          property_id?: string
          section_key?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_sections_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      import_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          organization_id: string
          property_id: string | null
          raw_text: string | null
          source_type: string
          source_url: string | null
          status: Database["public"]["Enums"]["import_status"]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          organization_id: string
          property_id?: string | null
          raw_text?: string | null
          source_type: string
          source_url?: string | null
          status?: Database["public"]["Enums"]["import_status"]
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          organization_id?: string
          property_id?: string | null
          raw_text?: string | null
          source_type?: string
          source_url?: string | null
          status?: Database["public"]["Enums"]["import_status"]
        }
        Relationships: [
          {
            foreignKeyName: "import_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_runs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_type: string
          sender_user_id: string | null
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_type: string
          sender_user_id?: string | null
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_type?: string
          sender_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          branding: Json
          created_at: string
          id: string
          name: string
          operator_type: string | null
          preferred_locale: string
          trial_ends_at: string
          trial_started_at: string
        }
        Insert: {
          branding?: Json
          created_at?: string
          id?: string
          name: string
          operator_type?: string | null
          preferred_locale?: string
          trial_ends_at?: string
          trial_started_at?: string
        }
        Update: {
          branding?: Json
          created_at?: string
          id?: string
          name?: string
          operator_type?: string | null
          preferred_locale?: string
          trial_ends_at?: string
          trial_started_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          accommodation_type: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
          original_locale: string
          published_at: string | null
          slug: string
          source_type: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["property_status"]
          updated_at: string
        }
        Insert: {
          accommodation_type?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id: string
          original_locale?: string
          published_at?: string | null
          slug: string
          source_type?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          updated_at?: string
        }
        Update: {
          accommodation_type?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          original_locale?: string
          published_at?: string | null
          slug?: string
          source_type?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      property_fields: {
        Row: {
          category: string
          confidence: number
          essential: boolean
          id: string
          imported_at: string | null
          key: string
          label: string
          manually_overridden: boolean
          manually_verified: boolean
          property_id: string
          question: string | null
          raw_value: string | null
          source_type: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["field_status"]
          updated_at: string
          value: string | null
        }
        Insert: {
          category: string
          confidence?: number
          essential?: boolean
          id?: string
          imported_at?: string | null
          key: string
          label: string
          manually_overridden?: boolean
          manually_verified?: boolean
          property_id: string
          question?: string | null
          raw_value?: string | null
          source_type?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["field_status"]
          updated_at?: string
          value?: string | null
        }
        Update: {
          category?: string
          confidence?: number
          essential?: boolean
          id?: string
          imported_at?: string | null
          key?: string
          label?: string
          manually_overridden?: boolean
          manually_verified?: boolean
          property_id?: string
          question?: string | null
          raw_value?: string | null
          source_type?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["field_status"]
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_fields_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_messaging_settings: {
        Row: {
          is_enabled: boolean
          property_id: string
          updated_at: string
        }
        Insert: {
          is_enabled?: boolean
          property_id: string
          updated_at?: string
        }
        Update: {
          is_enabled?: boolean
          property_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_messaging_settings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_review_destinations: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          label: string
          property_id: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          label: string
          property_id: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          label?: string
          property_id?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_review_destinations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_review_settings: {
        Row: {
          is_enabled: boolean
          message: string
          property_id: string
          title: string
          updated_at: string
        }
        Insert: {
          is_enabled?: boolean
          message?: string
          property_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          is_enabled?: boolean
          message?: string
          property_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_review_settings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      section_media: {
        Row: {
          alt_text: string | null
          caption: string | null
          created_at: string
          file_size: number
          id: string
          media_type: string
          mime_type: string
          organization_id: string
          property_id: string
          section_id: string
          sort_order: number
          storage_path: string
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          file_size: number
          id?: string
          media_type: string
          mime_type: string
          organization_id: string
          property_id: string
          section_id: string
          sort_order?: number
          storage_path: string
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          file_size?: number
          id?: string
          media_type?: string
          mime_type?: string
          organization_id?: string
          property_id?: string
          section_id?: string
          sort_order?: number
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_media_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_media_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_media_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "guide_sections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_property: { Args: { _property: string }; Returns: boolean }
      ensure_my_organization: { Args: { _first_name: string }; Returns: string }
      get_public_guide: { Args: { _slug: string }; Returns: Json }
      is_org_admin: { Args: { _org: string }; Returns: boolean }
      is_org_member: { Args: { _org: string }; Returns: boolean }
      submit_guest_message: {
        Args: {
          _body: string
          _contact: string
          _fingerprint: string
          _name: string
          _slug: string
          _website?: string
        }
        Returns: string
      }
    }
    Enums: {
      field_status: "found" | "to_verify" | "missing"
      import_status:
        | "pending"
        | "running"
        | "succeeded"
        | "insufficient"
        | "failed"
      org_role: "owner" | "admin" | "member"
      property_status: "draft" | "published" | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      field_status: ["found", "to_verify", "missing"],
      import_status: [
        "pending",
        "running",
        "succeeded",
        "insufficient",
        "failed",
      ],
      org_role: ["owner", "admin", "member"],
      property_status: ["draft", "published", "archived"],
    },
  },
} as const
