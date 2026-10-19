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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      applicant_matchmaking_notes: {
        Row: {
          body: string
          created_at: string
          id: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applicant_matchmaking_notes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          accepted: boolean
          accepted_at: string | null
          consent_key: string
          created_at: string
          id: string
          policy_version: string
          profile_id: string
          source: string | null
          withdrawn_at: string | null
        }
        Insert: {
          accepted: boolean
          accepted_at?: string | null
          consent_key: string
          created_at?: string
          id?: string
          policy_version: string
          profile_id: string
          source?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          accepted?: boolean
          accepted_at?: string | null
          consent_key?: string
          created_at?: string
          id?: string
          policy_version?: string
          profile_id?: string
          source?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          full_name: string
          handled_at: string | null
          handled_by_profile_id: string | null
          id: string
          message: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          handled_at?: string | null
          handled_by_profile_id?: string | null
          id?: string
          message: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          handled_at?: string | null
          handled_by_profile_id?: string | null
          id?: string
          message?: string
          phone?: string | null
        }
        Relationships: []
      }
      countries: {
        Row: {
          active: boolean
          calling_code: string | null
          code: string
          name: string
        }
        Insert: {
          active?: boolean
          calling_code?: string | null
          code: string
          name: string
        }
        Update: {
          active?: boolean
          calling_code?: string | null
          code?: string
          name?: string
        }
        Relationships: []
      }
      cultural_backgrounds: {
        Row: {
          active: boolean
          grouping: string | null
          id: string
          label: string
        }
        Insert: {
          active?: boolean
          grouping?: string | null
          id: string
          label: string
        }
        Update: {
          active?: boolean
          grouping?: string | null
          id?: string
          label?: string
        }
        Relationships: []
      }
      industries: {
        Row: {
          active: boolean
          id: string
          label: string
        }
        Insert: {
          active?: boolean
          id: string
          label: string
        }
        Update: {
          active?: boolean
          id?: string
          label?: string
        }
        Relationships: []
      }
      languages: {
        Row: {
          active: boolean
          code: string
          name: string
        }
        Insert: {
          active?: boolean
          code: string
          name: string
        }
        Update: {
          active?: boolean
          code?: string
          name?: string
        }
        Relationships: []
      }
      photos: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          rejected_reason_public: string | null
          review_status: Database["public"]["Enums"]["photo_review_status"]
          sort_order: number
          storage_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          rejected_reason_public?: string | null
          review_status?: Database["public"]["Enums"]["photo_review_status"]
          sort_order?: number
          storage_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          rejected_reason_public?: string | null
          review_status?: Database["public"]["Enums"]["photo_review_status"]
          sort_order?: number
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      preference_attributes: {
        Row: {
          active: boolean
          allowed_values: Json | null
          attribute_key: string
          created_at: string
          description: string | null
          operator: string | null
          section: string
          value_type: string
        }
        Insert: {
          active?: boolean
          allowed_values?: Json | null
          attribute_key: string
          created_at?: string
          description?: string | null
          operator?: string | null
          section?: string
          value_type?: string
        }
        Update: {
          active?: boolean
          allowed_values?: Json | null
          attribute_key?: string
          created_at?: string
          description?: string | null
          operator?: string | null
          section?: string
          value_type?: string
        }
        Relationships: []
      }
      profession_categories: {
        Row: {
          active: boolean
          id: string
          label: string
        }
        Insert: {
          active?: boolean
          id: string
          label: string
        }
        Update: {
          active?: boolean
          id?: string
          label?: string
        }
        Relationships: []
      }
      profile_facts: {
        Row: {
          children_living_status: string | null
          city: string | null
          countries_would_date_from: string[] | null
          countries_would_relocate_to: string[] | null
          country_of_origin: string | null
          created_at: string
          cultural_background_other_label: string | null
          cultural_backgrounds: string[] | null
          current_legal_status:
            | Database["public"]["Enums"]["legal_status_type"]
            | null
          denomination_or_faith_tradition: string | null
          drinking: Database["public"]["Enums"]["drinking_type"] | null
          education_level: Database["public"]["Enums"]["education_level"] | null
          employment_status:
            | Database["public"]["Enums"]["employment_status"]
            | null
          faith_observance:
            | Database["public"]["Enums"]["faith_observance_type"]
            | null
          field_of_study: string | null
          has_children: Database["public"]["Enums"]["yes_no"] | null
          height_cm: number | null
          id: string
          industry: string | null
          introduction_style:
            | Database["public"]["Enums"]["introduction_style_type"]
            | null
          job_title: string | null
          languages: string[] | null
          looking_for: Database["public"]["Enums"]["looking_for_type"] | null
          marital_history:
            | Database["public"]["Enums"]["marital_history_type"]
            | null
          marriage_timeline:
            | Database["public"]["Enums"]["marriage_timeline_type"]
            | null
          nationality: string[] | null
          number_of_children: number | null
          open_to_long_distance:
            | Database["public"]["Enums"]["yes_no_depends"]
            | null
          profession_category: string | null
          profile_id: string
          religion: string | null
          smoking: Database["public"]["Enums"]["smoking_type"] | null
          state_or_region: string | null
          updated_at: string
          wants_children:
            | Database["public"]["Enums"]["wants_children_type"]
            | null
          willing_to_relocate:
            | Database["public"]["Enums"]["yes_no_depends"]
            | null
        }
        Insert: {
          children_living_status?: string | null
          city?: string | null
          countries_would_date_from?: string[] | null
          countries_would_relocate_to?: string[] | null
          country_of_origin?: string | null
          created_at?: string
          cultural_background_other_label?: string | null
          cultural_backgrounds?: string[] | null
          current_legal_status?:
            | Database["public"]["Enums"]["legal_status_type"]
            | null
          denomination_or_faith_tradition?: string | null
          drinking?: Database["public"]["Enums"]["drinking_type"] | null
          education_level?:
            | Database["public"]["Enums"]["education_level"]
            | null
          employment_status?:
            | Database["public"]["Enums"]["employment_status"]
            | null
          faith_observance?:
            | Database["public"]["Enums"]["faith_observance_type"]
            | null
          field_of_study?: string | null
          has_children?: Database["public"]["Enums"]["yes_no"] | null
          height_cm?: number | null
          id?: string
          industry?: string | null
          introduction_style?:
            | Database["public"]["Enums"]["introduction_style_type"]
            | null
          job_title?: string | null
          languages?: string[] | null
          looking_for?: Database["public"]["Enums"]["looking_for_type"] | null
          marital_history?:
            | Database["public"]["Enums"]["marital_history_type"]
            | null
          marriage_timeline?:
            | Database["public"]["Enums"]["marriage_timeline_type"]
            | null
          nationality?: string[] | null
          number_of_children?: number | null
          open_to_long_distance?:
            | Database["public"]["Enums"]["yes_no_depends"]
            | null
          profession_category?: string | null
          profile_id: string
          religion?: string | null
          smoking?: Database["public"]["Enums"]["smoking_type"] | null
          state_or_region?: string | null
          updated_at?: string
          wants_children?:
            | Database["public"]["Enums"]["wants_children_type"]
            | null
          willing_to_relocate?:
            | Database["public"]["Enums"]["yes_no_depends"]
            | null
        }
        Update: {
          children_living_status?: string | null
          city?: string | null
          countries_would_date_from?: string[] | null
          countries_would_relocate_to?: string[] | null
          country_of_origin?: string | null
          created_at?: string
          cultural_background_other_label?: string | null
          cultural_backgrounds?: string[] | null
          current_legal_status?:
            | Database["public"]["Enums"]["legal_status_type"]
            | null
          denomination_or_faith_tradition?: string | null
          drinking?: Database["public"]["Enums"]["drinking_type"] | null
          education_level?:
            | Database["public"]["Enums"]["education_level"]
            | null
          employment_status?:
            | Database["public"]["Enums"]["employment_status"]
            | null
          faith_observance?:
            | Database["public"]["Enums"]["faith_observance_type"]
            | null
          field_of_study?: string | null
          has_children?: Database["public"]["Enums"]["yes_no"] | null
          height_cm?: number | null
          id?: string
          industry?: string | null
          introduction_style?:
            | Database["public"]["Enums"]["introduction_style_type"]
            | null
          job_title?: string | null
          languages?: string[] | null
          looking_for?: Database["public"]["Enums"]["looking_for_type"] | null
          marital_history?:
            | Database["public"]["Enums"]["marital_history_type"]
            | null
          marriage_timeline?:
            | Database["public"]["Enums"]["marriage_timeline_type"]
            | null
          nationality?: string[] | null
          number_of_children?: number | null
          open_to_long_distance?:
            | Database["public"]["Enums"]["yes_no_depends"]
            | null
          profession_category?: string | null
          profile_id?: string
          religion?: string | null
          smoking?: Database["public"]["Enums"]["smoking_type"] | null
          state_or_region?: string | null
          updated_at?: string
          wants_children?:
            | Database["public"]["Enums"]["wants_children_type"]
            | null
          willing_to_relocate?:
            | Database["public"]["Enums"]["yes_no_depends"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_facts_country_of_origin_fkey"
            columns: ["country_of_origin"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "profile_facts_industry_fkey"
            columns: ["industry"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_facts_profession_category_fkey"
            columns: ["profession_category"]
            isOneToOne: false
            referencedRelation: "profession_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_facts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_facts_religion_fkey"
            columns: ["religion"]
            isOneToOne: false
            referencedRelation: "religions"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_preferences: {
        Row: {
          attribute_key: string
          attribute_value: string | null
          attribute_value_json: Json | null
          created_at: string
          id: string
          profile_id: string
          updated_at: string
          weight: Database["public"]["Enums"]["preference_weight"]
        }
        Insert: {
          attribute_key: string
          attribute_value?: string | null
          attribute_value_json?: Json | null
          created_at?: string
          id?: string
          profile_id: string
          updated_at?: string
          weight?: Database["public"]["Enums"]["preference_weight"]
        }
        Update: {
          attribute_key?: string
          attribute_value?: string | null
          attribute_value_json?: Json | null
          created_at?: string
          id?: string
          profile_id?: string
          updated_at?: string
          weight?: Database["public"]["Enums"]["preference_weight"]
        }
        Relationships: [
          {
            foreignKeyName: "profile_preferences_attribute_key_fkey"
            columns: ["attribute_key"]
            isOneToOne: false
            referencedRelation: "preference_attributes"
            referencedColumns: ["attribute_key"]
          },
          {
            foreignKeyName: "profile_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_sections: {
        Row: {
          completeness_percent: number
          id: string
          is_complete: boolean
          last_saved_at: string | null
          profile_id: string
          section_key: Database["public"]["Enums"]["section_key"]
        }
        Insert: {
          completeness_percent?: number
          id?: string
          is_complete?: boolean
          last_saved_at?: string | null
          profile_id: string
          section_key: Database["public"]["Enums"]["section_key"]
        }
        Update: {
          completeness_percent?: number
          id?: string
          is_complete?: boolean
          last_saved_at?: string | null
          profile_id?: string
          section_key?: Database["public"]["Enums"]["section_key"]
        }
        Relationships: [
          {
            foreignKeyName: "profile_sections_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          application_started_at: string
          application_status: Database["public"]["Enums"]["application_status"]
          application_submitted_at: string | null
          decided_at: string | null
          decision_reason: string | null
          last_decision: Database["public"]["Enums"]["application_status"] | null
          submission_count: number
          auth_user_id: string | null
          country_of_residence: string | null
          created_at: string
          current_section: Database["public"]["Enums"]["section_key"] | null
          date_of_birth: string | null
          deleted_at: string | null
          email: string
          first_name: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          last_field_saved_at: string | null
          last_name: string | null
          phone: string | null
          phone_country: string | null
          updated_at: string
        }
        Insert: {
          application_started_at?: string
          application_status?: Database["public"]["Enums"]["application_status"]
          application_submitted_at?: string | null
          decided_at?: string | null
          decision_reason?: string | null
          last_decision?: Database["public"]["Enums"]["application_status"] | null
          submission_count?: number
          auth_user_id?: string | null
          country_of_residence?: string | null
          created_at?: string
          current_section?: Database["public"]["Enums"]["section_key"] | null
          date_of_birth?: string | null
          deleted_at?: string | null
          email: string
          first_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          last_field_saved_at?: string | null
          last_name?: string | null
          phone?: string | null
          phone_country?: string | null
          updated_at?: string
        }
        Update: {
          application_started_at?: string
          application_status?: Database["public"]["Enums"]["application_status"]
          application_submitted_at?: string | null
          decided_at?: string | null
          decision_reason?: string | null
          last_decision?: Database["public"]["Enums"]["application_status"] | null
          submission_count?: number
          auth_user_id?: string | null
          country_of_residence?: string | null
          created_at?: string
          current_section?: Database["public"]["Enums"]["section_key"] | null
          date_of_birth?: string | null
          deleted_at?: string | null
          email?: string
          first_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          last_field_saved_at?: string | null
          last_name?: string | null
          phone?: string | null
          phone_country?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_country_of_residence_fkey"
            columns: ["country_of_residence"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      religions: {
        Row: {
          active: boolean
          id: string
          label: string
        }
        Insert: {
          active?: boolean
          id: string
          label: string
        }
        Update: {
          active?: boolean
          id?: string
          label?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          revoked_at?: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      attach_draft_to_auth_user: {
        Args: { _auth_user_id: string; _profile_id: string }
        Returns: undefined
      }
      current_profile_id: { Args: never; Returns: string }
      grant_staff_access: { Args: { _email: string }; Returns: string }
      has_role: {
        Args: {
          _profile_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_clean_token_array: { Args: { _vals: string[] }; Returns: boolean }
      is_country_code_array: { Args: { _codes: string[] }; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      list_applications: {
        Args: never
        Returns: {
          application_status: Database["public"]["Enums"]["application_status"]
          city: string
          country_of_residence: string
          date_of_birth: string
          first_name: string
          gender: Database["public"]["Enums"]["gender_type"]
          last_name: string
          profile_id: string
          state_or_region: string
          submitted_at: string
        }[]
      }
      profile_ready_to_submit: {
        Args: { _profile_id: string }
        Returns: boolean
      }
      recompute_profile_sections: {
        Args: { _profile_id: string }
        Returns: number
      }
      reopen_application: { Args: never; Returns: string }
      set_application_status: {
        Args: {
          _profile_id: string
          _reason?: string
          _status: Database["public"]["Enums"]["application_status"]
        }
        Returns: string
      }
      submit_application: { Args: { _profile_id: string }; Returns: string }
      upsert_draft_profile: {
        Args: {
          _country_of_residence?: string
          _email: string
          _first_name?: string
          _gender?: string
          _last_name?: string
          _phone: string
          _phone_country?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "staff"
      application_status:
        | "draft"
        | "submitted"
        | "accepted"
        | "waitlisted"
        | "declined"
      drinking_type: "never" | "socially" | "regularly"
      education_level:
        | "secondary"
        | "vocational"
        | "bachelors"
        | "masters"
        | "doctorate"
        | "other"
      employment_status:
        | "employed"
        | "self_employed"
        | "business_owner"
        | "student"
        | "not_working"
        | "other"
      faith_observance_type:
        | "not_important"
        | "somewhat"
        | "important"
        | "central"
      gender_type: "woman" | "man" | "other" | "prefer_not_to_say"
      introduction_style_type:
        | "blind_first"
        | "photo_first"
        | "matchmaker_decides"
      legal_status_type:
        | "single"
        | "divorced"
        | "widowed"
        | "legally_separated"
        | "other"
      looking_for_type: "marriage" | "marriage_open_to_serious"
      marital_history_type:
        | "never_married"
        | "previously_divorced"
        | "previously_widowed"
        | "other"
      marriage_timeline_type:
        | "ready_now"
        | "within_1_year"
        | "within_2_years"
        | "unhurried"
      photo_review_status:
        | "uploaded"
        | "pending_review"
        | "approved"
        | "rejected"
      preference_weight:
        | "must_have"
        | "strong_preference"
        | "nice_to_have"
        | "does_not_matter"
      section_key:
        | "contact"
        | "identity"
        | "life"
        | "relationship"
        | "partner_preferences"
        | "photos"
        | "consent"
      smoking_type: "never" | "sometimes" | "regularly"
      wants_children_type: "yes" | "no" | "open" | "not_sure"
      yes_no: "no" | "yes"
      yes_no_depends: "yes" | "no" | "depends"
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
      app_role: ["staff"],
      application_status: [
        "draft",
        "submitted",
        "accepted",
        "waitlisted",
        "declined",
      ],
      drinking_type: ["never", "socially", "regularly"],
      education_level: [
        "secondary",
        "vocational",
        "bachelors",
        "masters",
        "doctorate",
        "other",
      ],
      employment_status: [
        "employed",
        "self_employed",
        "business_owner",
        "student",
        "not_working",
        "other",
      ],
      faith_observance_type: [
        "not_important",
        "somewhat",
        "important",
        "central",
      ],
      gender_type: ["woman", "man", "other", "prefer_not_to_say"],
      introduction_style_type: [
        "blind_first",
        "photo_first",
        "matchmaker_decides",
      ],
      legal_status_type: [
        "single",
        "divorced",
        "widowed",
        "legally_separated",
        "other",
      ],
      looking_for_type: ["marriage", "marriage_open_to_serious"],
      marital_history_type: [
        "never_married",
        "previously_divorced",
        "previously_widowed",
        "other",
      ],
      marriage_timeline_type: [
        "ready_now",
        "within_1_year",
        "within_2_years",
        "unhurried",
      ],
      photo_review_status: [
        "uploaded",
        "pending_review",
        "approved",
        "rejected",
      ],
      preference_weight: [
        "must_have",
        "strong_preference",
        "nice_to_have",
        "does_not_matter",
      ],
      section_key: [
        "contact",
        "identity",
        "life",
        "relationship",
        "partner_preferences",
        "photos",
        "consent",
      ],
      smoking_type: ["never", "sometimes", "regularly"],
      wants_children_type: ["yes", "no", "open", "not_sure"],
      yes_no: ["no", "yes"],
      yes_no_depends: ["yes", "no", "depends"],
    },
  },
} as const
