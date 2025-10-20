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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_id: string
          actor_type: string
          after_state: Json | null
          before_state: Json | null
          created_at: string
          id: string
          metadata: Json | null
          org_id: string
          resource_id: string | null
          resource_type: string
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          actor_type: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          metadata?: Json | null
          org_id: string
          resource_id?: string | null
          resource_type: string
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          actor_type?: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          metadata?: Json | null
          org_id?: string
          resource_id?: string | null
          resource_type?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      board_packs: {
        Row: {
          agenda: Json
          approved_by: string | null
          attendees: Json | null
          created_at: string
          created_by: string
          hash: string | null
          id: string
          meeting_date: string
          metadata: Json | null
          org_id: string
          pdf_url: string | null
          published_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agenda?: Json
          approved_by?: string | null
          attendees?: Json | null
          created_at?: string
          created_by: string
          hash?: string | null
          id?: string
          meeting_date: string
          metadata?: Json | null
          org_id: string
          pdf_url?: string | null
          published_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agenda?: Json
          approved_by?: string | null
          attendees?: Json | null
          created_at?: string
          created_by?: string
          hash?: string | null
          id?: string
          meeting_date?: string
          metadata?: Json | null
          org_id?: string
          pdf_url?: string | null
          published_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_packs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          org_id: string
          resource_id: string
          resource_type: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          org_id: string
          resource_id: string
          resource_type: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          org_id?: string
          resource_id?: string
          resource_type?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          created_by: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          metadata: Json | null
          notes: string | null
          org_id: string
          phone: string | null
          roles: Json | null
          status: string
          tenant_id: string | null
          title: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          metadata?: Json | null
          notes?: string | null
          org_id: string
          phone?: string | null
          roles?: Json | null
          status?: string
          tenant_id?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          metadata?: Json | null
          notes?: string | null
          org_id?: string
          phone?: string | null
          roles?: Json | null
          status?: string
          tenant_id?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_approvals: {
        Row: {
          approved_at: string | null
          approver_id: string
          created_at: string
          decision_id: string
          id: string
          notes: string | null
          status: string
        }
        Insert: {
          approved_at?: string | null
          approver_id: string
          created_at?: string
          decision_id: string
          id?: string
          notes?: string | null
          status: string
        }
        Update: {
          approved_at?: string | null
          approver_id?: string
          created_at?: string
          decision_id?: string
          id?: string
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_approvals_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions: {
        Row: {
          alternatives_considered: string | null
          context: string
          created_at: string
          created_by: string
          decided_at: string
          decided_by: string
          decision: string
          id: string
          metadata: Json | null
          org_id: string
          rationale: string | null
          status: string
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          alternatives_considered?: string | null
          context: string
          created_at?: string
          created_by: string
          decided_at?: string
          decided_by: string
          decision: string
          id?: string
          metadata?: Json | null
          org_id: string
          rationale?: string | null
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          alternatives_considered?: string | null
          context?: string
          created_at?: string
          created_by?: string
          decided_at?: string
          decided_by?: string
          decision?: string
          id?: string
          metadata?: Json | null
          org_id?: string
          rationale?: string | null
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_chunks: {
        Row: {
          chunk_index: number
          content: string
          content_sha256: string | null
          created_at: string
          document_id: string
          embedding: string | null
          heading: string | null
          id: string
          lang: string | null
          metadata: Json | null
          org_id: string
          page: number | null
          section_path: string | null
          tenant_id: string | null
          token_count: number | null
          tsv: unknown | null
          updated_at: string
          version: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          content_sha256?: string | null
          created_at?: string
          document_id: string
          embedding?: string | null
          heading?: string | null
          id?: string
          lang?: string | null
          metadata?: Json | null
          org_id: string
          page?: number | null
          section_path?: string | null
          tenant_id?: string | null
          token_count?: number | null
          tsv?: unknown | null
          updated_at?: string
          version?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          content_sha256?: string | null
          created_at?: string
          document_id?: string
          embedding?: string | null
          heading?: string | null
          id?: string
          lang?: string | null
          metadata?: Json | null
          org_id?: string
          page?: number | null
          section_path?: string | null
          tenant_id?: string | null
          token_count?: number | null
          tsv?: unknown | null
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_chunks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_chunks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_sections: {
        Row: {
          content: string
          created_at: string
          created_by: string
          display_order: number
          document_id: string
          id: string
          metadata: Json | null
          org_id: string
          questions_answers: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          display_order?: number
          document_id: string
          id?: string
          metadata?: Json | null
          org_id: string
          questions_answers?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          display_order?: number
          document_id?: string
          id?: string
          metadata?: Json | null
          org_id?: string
          questions_answers?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_sections_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_sections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string | null
          file_path: string
          file_size: number
          id: string
          metadata: Json | null
          mime_type: string
          name: string
          org_id: string | null
          tenant_id: string | null
          text_content: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          description?: string | null
          file_path: string
          file_size: number
          id?: string
          metadata?: Json | null
          mime_type?: string
          name: string
          org_id?: string | null
          tenant_id?: string | null
          text_content?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          file_path?: string
          file_size?: number
          id?: string
          metadata?: Json | null
          mime_type?: string
          name?: string
          org_id?: string | null
          tenant_id?: string | null
          text_content?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_analyses: {
        Row: {
          ai_insights: string[] | null
          ai_recommendations: string[] | null
          analysis_status: string
          approved: boolean | null
          confidence_score: number | null
          created_at: string
          created_by: string
          detected_issues: string[] | null
          document_id: string
          error_message: string | null
          extracted_data: Json | null
          file_type: string
          id: string
          org_id: string
          processing_time_ms: number | null
          raw_analysis: Json
          reviewed_at: string | null
          reviewed_by: string | null
          snapshot_id: string | null
          updated_at: string
        }
        Insert: {
          ai_insights?: string[] | null
          ai_recommendations?: string[] | null
          analysis_status?: string
          approved?: boolean | null
          confidence_score?: number | null
          created_at?: string
          created_by: string
          detected_issues?: string[] | null
          document_id: string
          error_message?: string | null
          extracted_data?: Json | null
          file_type: string
          id?: string
          org_id: string
          processing_time_ms?: number | null
          raw_analysis: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          snapshot_id?: string | null
          updated_at?: string
        }
        Update: {
          ai_insights?: string[] | null
          ai_recommendations?: string[] | null
          analysis_status?: string
          approved?: boolean | null
          confidence_score?: number | null
          created_at?: string
          created_by?: string
          detected_issues?: string[] | null
          document_id?: string
          error_message?: string | null
          extracted_data?: Json | null
          file_type?: string
          id?: string
          org_id?: string
          processing_time_ms?: number | null
          raw_analysis?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          snapshot_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_analyses_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_analyses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_analyses_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "financial_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_snapshots: {
        Row: {
          arr: number | null
          burn: number | null
          cash: number | null
          created_at: string
          created_by: string
          gross_margin: number | null
          id: string
          notes: string | null
          org_id: string
          period: string
          revenue: number | null
          runway_days: number | null
          source_ref: string | null
          updated_at: string
        }
        Insert: {
          arr?: number | null
          burn?: number | null
          cash?: number | null
          created_at?: string
          created_by: string
          gross_margin?: number | null
          id?: string
          notes?: string | null
          org_id: string
          period: string
          revenue?: number | null
          runway_days?: number | null
          source_ref?: string | null
          updated_at?: string
        }
        Update: {
          arr?: number | null
          burn?: number | null
          cash?: number | null
          created_at?: string
          created_by?: string
          gross_margin?: number | null
          id?: string
          notes?: string | null
          org_id?: string
          period?: string
          revenue?: number | null
          runway_days?: number | null
          source_ref?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_snapshots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_snapshots_source_ref_fkey"
            columns: ["source_ref"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_measurements: {
        Row: {
          created_at: string
          created_by: string
          id: string
          kpi_id: string
          org_id: string
          period: string
          source_ref: string | null
          updated_at: string
          value: number
          variance_note: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          kpi_id: string
          org_id: string
          period: string
          source_ref?: string | null
          updated_at?: string
          value: number
          variance_note?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          kpi_id?: string
          org_id?: string
          period?: string
          source_ref?: string | null
          updated_at?: string
          value?: number
          variance_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_measurements_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_measurements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_measurements_source_ref_fkey"
            columns: ["source_ref"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      kpis: {
        Row: {
          cadence: string
          created_at: string
          created_by: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          org_id: string
          owner_id: string | null
          target: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          cadence?: string
          created_at?: string
          created_by: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          org_id: string
          owner_id?: string | null
          target?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          cadence?: string
          created_at?: string
          created_by?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          org_id?: string
          owner_id?: string | null
          target?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpis_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          metadata: Json | null
          name: string
          org_id: string
          status: string
          target_date: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          org_id: string
          status?: string
          target_date?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          org_id?: string
          status?: string
          target_date?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      okrs: {
        Row: {
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          key_result: string
          metadata: Json | null
          notes: string | null
          objective: string
          org_id: string
          owner_id: string | null
          progress: number | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          due_date?: string | null
          id?: string
          key_result: string
          metadata?: Json | null
          notes?: string | null
          objective: string
          org_id: string
          owner_id?: string | null
          progress?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          key_result?: string
          metadata?: Json | null
          notes?: string | null
          objective?: string
          org_id?: string
          owner_id?: string | null
          progress?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "okrs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          created_by: string | null
          email: string
          expires_at: string
          id: string
          org_id: string | null
          role: Database["public"]["Enums"]["org_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          expires_at?: string
          id?: string
          org_id?: string | null
          role?: Database["public"]["Enums"]["org_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          org_id?: string | null
          role?: Database["public"]["Enums"]["org_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_memberships: {
        Row: {
          created_at: string | null
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          org_id: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_memberships_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      organizations: {
        Row: {
          brand_color: string | null
          created_at: string | null
          domain: string | null
          id: string
          logo_url: string | null
          members_count: number
          name: string
          plan_tier: string
          seats_limit: number
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          brand_color?: string | null
          created_at?: string | null
          domain?: string | null
          id?: string
          logo_url?: string | null
          members_count?: number
          name: string
          plan_tier?: string
          seats_limit?: number
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          brand_color?: string | null
          created_at?: string | null
          domain?: string | null
          id?: string
          logo_url?: string | null
          members_count?: number
          name?: string
          plan_tier?: string
          seats_limit?: number
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          created_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string | null
          last_name: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          content_hash: string | null
          content_html: string | null
          content_markdown: string
          created_at: string | null
          created_by: string
          id: string
          is_published: boolean | null
          metadata: Json | null
          org_id: string
          period_end: string
          period_start: string
          published_at: string | null
          rejection_reason: string | null
          stats: Json | null
          tenant_id: string | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          content_hash?: string | null
          content_html?: string | null
          content_markdown: string
          created_at?: string | null
          created_by: string
          id?: string
          is_published?: boolean | null
          metadata?: Json | null
          org_id: string
          period_end: string
          period_start: string
          published_at?: string | null
          rejection_reason?: string | null
          stats?: Json | null
          tenant_id?: string | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          content_hash?: string | null
          content_html?: string | null
          content_markdown?: string
          created_at?: string | null
          created_by?: string
          id?: string
          is_published?: boolean | null
          metadata?: Json | null
          org_id?: string
          period_end?: string
          period_start?: string
          published_at?: string | null
          rejection_reason?: string | null
          stats?: Json | null
          tenant_id?: string | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          metadata: Json | null
          org_id: string
          priority: string
          requested_by: string
          responded_at: string | null
          responded_by: string | null
          response: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          metadata?: Json | null
          org_id: string
          priority?: string
          requested_by: string
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string
          priority?: string
          requested_by?: string
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      risks: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          impact: string
          metadata: Json | null
          mitigation_plan: string | null
          org_id: string
          owner_id: string | null
          probability: string
          status: string
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          impact: string
          metadata?: Json | null
          mitigation_plan?: string | null
          org_id: string
          owner_id?: string | null
          probability: string
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          impact?: string
          metadata?: Json | null
          mitigation_plan?: string | null
          org_id?: string
          owner_id?: string | null
          probability?: string
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      secret_access: {
        Row: {
          granted_at: string
          granted_by: string
          id: string
          nda_acknowledged: boolean
          nda_acknowledged_at: string | null
          org_id: string
          principal_id: string | null
          principal_type: string
          role: string | null
          secret_id: string
          vault_id: string
        }
        Insert: {
          granted_at?: string
          granted_by: string
          id?: string
          nda_acknowledged?: boolean
          nda_acknowledged_at?: string | null
          org_id: string
          principal_id?: string | null
          principal_type: string
          role?: string | null
          secret_id: string
          vault_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string
          id?: string
          nda_acknowledged?: boolean
          nda_acknowledged_at?: string | null
          org_id?: string
          principal_id?: string | null
          principal_type?: string
          role?: string | null
          secret_id?: string
          vault_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "secret_access_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secret_access_secret_id_fkey"
            columns: ["secret_id"]
            isOneToOne: false
            referencedRelation: "secrets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secret_access_vault_id_fkey"
            columns: ["vault_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      secret_audit: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          org_id: string
          reason: string | null
          secret_id: string
          user_agent: string | null
          vault_id: string
          version_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          org_id: string
          reason?: string | null
          secret_id: string
          user_agent?: string | null
          vault_id: string
          version_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          org_id?: string
          reason?: string | null
          secret_id?: string
          user_agent?: string | null
          vault_id?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "secret_audit_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secret_audit_secret_id_fkey"
            columns: ["secret_id"]
            isOneToOne: false
            referencedRelation: "secrets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secret_audit_vault_id_fkey"
            columns: ["vault_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secret_audit_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "secret_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      secret_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          org_id: string
          secret_id: string
          sha256_hash: string
          tenant_id: string
          vault_id: string
          version_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          org_id: string
          secret_id: string
          sha256_hash: string
          tenant_id: string
          vault_id: string
          version_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          org_id?: string
          secret_id?: string
          sha256_hash?: string
          tenant_id?: string
          vault_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "secret_files_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secret_files_secret_id_fkey"
            columns: ["secret_id"]
            isOneToOne: false
            referencedRelation: "secrets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secret_files_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secret_files_vault_id_fkey"
            columns: ["vault_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secret_files_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "secret_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      secret_versions: {
        Row: {
          content_canonical_json: Json
          content_markdown: string
          created_at: string
          created_by: string
          eidas_qts: string | null
          id: string
          metadata: Json | null
          org_id: string
          secret_id: string
          sha256_hash: string
          signed_by: Json | null
          tenant_id: string
          tsa_policy_oid: string | null
          tsa_serial: string | null
          tsa_token: string | null
          vault_id: string
          version_number: number
        }
        Insert: {
          content_canonical_json: Json
          content_markdown: string
          created_at?: string
          created_by: string
          eidas_qts?: string | null
          id?: string
          metadata?: Json | null
          org_id: string
          secret_id: string
          sha256_hash: string
          signed_by?: Json | null
          tenant_id: string
          tsa_policy_oid?: string | null
          tsa_serial?: string | null
          tsa_token?: string | null
          vault_id: string
          version_number: number
        }
        Update: {
          content_canonical_json?: Json
          content_markdown?: string
          created_at?: string
          created_by?: string
          eidas_qts?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string
          secret_id?: string
          sha256_hash?: string
          signed_by?: Json | null
          tenant_id?: string
          tsa_policy_oid?: string | null
          tsa_serial?: string | null
          tsa_token?: string | null
          vault_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "secret_versions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secret_versions_secret_id_fkey"
            columns: ["secret_id"]
            isOneToOne: false
            referencedRelation: "secrets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secret_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secret_versions_vault_id_fkey"
            columns: ["vault_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      secrets: {
        Row: {
          classification: string
          created_at: string
          created_by: string
          current_version_id: string | null
          description: string | null
          id: string
          metadata: Json | null
          org_id: string
          status: string
          tenant_id: string
          title: string
          updated_at: string
          vault_id: string
        }
        Insert: {
          classification?: string
          created_at?: string
          created_by: string
          current_version_id?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          org_id: string
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
          vault_id: string
        }
        Update: {
          classification?: string
          created_at?: string
          created_by?: string
          current_version_id?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          vault_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_secrets_current_version"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "secret_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secrets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secrets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secrets_vault_id_fkey"
            columns: ["vault_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          org_id: string
          plan_tier: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          org_id: string
          plan_tier: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          org_id?: string
          plan_tier?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          metadata: Json | null
          milestone_id: string | null
          org_id: string
          priority: string | null
          status: string
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          milestone_id?: string | null
          org_id: string
          priority?: string | null
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          milestone_id?: string | null
          org_id?: string
          priority?: string | null
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          created_at: string
          id: string
          role: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          branding: Json | null
          created_at: string
          domain: string | null
          id: string
          name: string
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          branding?: Json | null
          created_at?: string
          domain?: string | null
          id?: string
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          branding?: Json | null
          created_at?: string
          domain?: string | null
          id?: string
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_notification_prefs: {
        Row: {
          email_digests: boolean
          email_invites: boolean
          sms_alerts: boolean
          updated_at: string
          user_id: string
          whatsapp_alerts: boolean
        }
        Insert: {
          email_digests?: boolean
          email_invites?: boolean
          sms_alerts?: boolean
          updated_at?: string
          user_id: string
          whatsapp_alerts?: boolean
        }
        Update: {
          email_digests?: boolean
          email_invites?: boolean
          sms_alerts?: boolean
          updated_at?: string
          user_id?: string
          whatsapp_alerts?: boolean
        }
        Relationships: []
      }
      vault_addresses: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string | null
          created_at: string
          google_place_id: string | null
          id: string
          is_primary: boolean
          label: string | null
          latitude: number | null
          longitude: number | null
          postal_code: string | null
          region: string | null
          updated_at: string
          vault_id: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          google_place_id?: string | null
          id?: string
          is_primary?: boolean
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          postal_code?: string | null
          region?: string | null
          updated_at?: string
          vault_id: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          google_place_id?: string | null
          id?: string
          is_primary?: boolean
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          postal_code?: string | null
          region?: string | null
          updated_at?: string
          vault_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_addresses_vault_id_fkey"
            columns: ["vault_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          expires_at: string
          id: string
          invitee_email: string
          inviter_id: string
          last_sent_at: string
          role: string
          status: string
          token: string
          updated_at: string
          vault_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          invitee_email: string
          inviter_id: string
          last_sent_at?: string
          role?: string
          status?: string
          token: string
          updated_at?: string
          vault_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invitee_email?: string
          inviter_id?: string
          last_sent_at?: string
          role?: string
          status?: string
          token?: string
          updated_at?: string
          vault_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_invites_vault_id_fkey"
            columns: ["vault_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_profiles: {
        Row: {
          brand_name: string | null
          company_size: string | null
          description: string | null
          emails: Json | null
          goals: Json | null
          id: string
          incorporation_date: string | null
          industry: string | null
          key_contacts: Json | null
          legal_name: string | null
          mission: string | null
          phones: Json | null
          registration_number: string | null
          socials: Json | null
          tax_id: string | null
          updated_at: string
          updated_by: string | null
          values: Json | null
          vault_id: string
          vision: string | null
          websites: Json | null
        }
        Insert: {
          brand_name?: string | null
          company_size?: string | null
          description?: string | null
          emails?: Json | null
          goals?: Json | null
          id?: string
          incorporation_date?: string | null
          industry?: string | null
          key_contacts?: Json | null
          legal_name?: string | null
          mission?: string | null
          phones?: Json | null
          registration_number?: string | null
          socials?: Json | null
          tax_id?: string | null
          updated_at?: string
          updated_by?: string | null
          values?: Json | null
          vault_id: string
          vision?: string | null
          websites?: Json | null
        }
        Update: {
          brand_name?: string | null
          company_size?: string | null
          description?: string | null
          emails?: Json | null
          goals?: Json | null
          id?: string
          incorporation_date?: string | null
          industry?: string | null
          key_contacts?: Json | null
          legal_name?: string | null
          mission?: string | null
          phones?: Json | null
          registration_number?: string | null
          socials?: Json | null
          tax_id?: string | null
          updated_at?: string
          updated_by?: string | null
          values?: Json | null
          vault_id?: string
          vision?: string | null
          websites?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "vault_profiles_vault_id_fkey"
            columns: ["vault_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          founder_seats: number
          id: string
          investor_seats: number
          status: string
          tier: string
          trial_ends_at: string | null
          updated_at: string
          vault_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          founder_seats?: number
          id?: string
          investor_seats?: number
          status?: string
          tier?: string
          trial_ends_at?: string | null
          updated_at?: string
          vault_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          founder_seats?: number
          id?: string
          investor_seats?: number
          status?: string
          tier?: string
          trial_ends_at?: string | null
          updated_at?: string
          vault_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_subscriptions_vault_id_fkey"
            columns: ["vault_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_org_invite: {
        Args: { invite_token: string }
        Returns: Json
      }
      accept_org_invite_by_id: {
        Args: { p_invitation_id: string }
        Returns: Json
      }
      create_notification: {
        Args: {
          p_action_url?: string
          p_message: string
          p_metadata?: Json
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      get_vault_id: {
        Args: { p_org_id: string; p_tenant_id: string }
        Returns: string
      }
      is_platform_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_tenant_admin: {
        Args: { tenant_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_tenant_member: {
        Args: { tenant_uuid: string; user_uuid: string }
        Returns: boolean
      }
      migrate_tenants_to_organizations: {
        Args: Record<PropertyKey, never>
        Returns: {
          migrated_memberships: number
          migrated_orgs: number
          skipped_orgs: number
        }[]
      }
      refresh_vault_member_count: {
        Args: { p_vault_id: string }
        Returns: undefined
      }
      search_chunks_hybrid: {
        Args: {
          k?: number
          org: string
          query_embedding: string
          query_text: string
        }
        Returns: {
          bm25: number
          chunk_index: number
          content: string
          document_id: string
          document_name: string
          fused: number
          id: string
          page: number
          sim: number
        }[]
      }
      user_is_org_admin: {
        Args: { check_org_id: string; check_user_id: string }
        Returns: boolean
      }
      user_is_org_member: {
        Args: { check_org_id: string; check_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      org_role: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      org_role: ["OWNER", "ADMIN", "EDITOR", "VIEWER"],
    },
  },
} as const
