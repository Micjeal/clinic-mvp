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
      appointments: {
        Row: {
          appointment_type: string
          clinician_user_id: string | null
          created_at: string
          created_by: string | null
          department_id: string
          facility_id: string
          id: string
          notes: string | null
          organization_id: string
          patient_id: string
          reason: string | null
          scheduled_end: string | null
          scheduled_start: string
          service_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          appointment_type?: string
          clinician_user_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id: string
          facility_id: string
          id?: string
          notes?: string | null
          organization_id: string
          patient_id: string
          reason?: string | null
          scheduled_end?: string | null
          scheduled_start: string
          service_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_type?: string
          clinician_user_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string
          facility_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          patient_id?: string
          reason?: string | null
          scheduled_end?: string | null
          scheduled_start?: string
          service_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinician_user_id_fkey"
            columns: ["clinician_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          organization_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          organization_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          organization_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_notes: {
        Row: {
          author_user_id: string
          content: string
          created_at: string
          encounter_id: string
          id: string
          note_type: string
          organization_id: string
          patient_id: string
          patient_visible: boolean
          updated_at: string
        }
        Insert: {
          author_user_id: string
          content: string
          created_at?: string
          encounter_id: string
          id?: string
          note_type?: string
          organization_id: string
          patient_id: string
          patient_visible?: boolean
          updated_at?: string
        }
        Update: {
          author_user_id?: string
          content?: string
          created_at?: string
          encounter_id?: string
          id?: string
          note_type?: string
          organization_id?: string
          patient_id?: string
          patient_visible?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_notes_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      clinician_achievements: {
        Row: {
          created_at: string
          description: string | null
          id: string
          membership_id: string
          organization_id: string
          sort_order: number
          title: string
          updated_at: string
          year: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          membership_id: string
          organization_id: string
          sort_order?: number
          title: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          membership_id?: string
          organization_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clinician_achievements_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "staff_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinician_achievements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clinician_availability_exceptions: {
        Row: {
          created_at: string
          ends_at: string
          facility_id: string
          id: string
          membership_id: string
          organization_id: string
          starts_at: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          facility_id: string
          id?: string
          membership_id: string
          organization_id: string
          starts_at: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          facility_id?: string
          id?: string
          membership_id?: string
          organization_id?: string
          starts_at?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinician_availability_exceptions_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinician_availability_exceptions_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "staff_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinician_availability_exceptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clinician_availability_rules: {
        Row: {
          created_at: string
          day_of_week: number
          effective_from: string | null
          effective_to: string | null
          end_time: string
          facility_id: string
          id: string
          is_active: boolean
          membership_id: string
          organization_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          effective_from?: string | null
          effective_to?: string | null
          end_time: string
          facility_id: string
          id?: string
          is_active?: boolean
          membership_id: string
          organization_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          effective_from?: string | null
          effective_to?: string | null
          end_time?: string
          facility_id?: string
          id?: string
          is_active?: boolean
          membership_id?: string
          organization_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinician_availability_rules_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinician_availability_rules_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "staff_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinician_availability_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clinician_photo_objects: {
        Row: {
          created_at: string
          membership_id: string
          object_path: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          membership_id: string
          object_path: string
          organization_id: string
        }
        Update: {
          created_at?: string
          membership_id?: string
          object_path?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinician_photo_objects_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "staff_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinician_photo_objects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clinician_profiles: {
        Row: {
          accepting_appointments: boolean
          created_at: string
          display_name: string
          experience_summary: string | null
          is_public: boolean
          languages: string[] | null
          membership_id: string
          photo_path: string | null
          professional_title: string | null
          public_bio: string | null
          public_id: string
          slug: string | null
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          accepting_appointments?: boolean
          created_at?: string
          display_name: string
          experience_summary?: string | null
          is_public?: boolean
          languages?: string[] | null
          membership_id: string
          photo_path?: string | null
          professional_title?: string | null
          public_bio?: string | null
          public_id?: string
          slug?: string | null
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          accepting_appointments?: boolean
          created_at?: string
          display_name?: string
          experience_summary?: string | null
          is_public?: boolean
          languages?: string[] | null
          membership_id?: string
          photo_path?: string | null
          professional_title?: string | null
          public_bio?: string | null
          public_id?: string
          slug?: string | null
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clinician_profiles_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: true
            referencedRelation: "staff_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinician_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clinician_qualifications: {
        Row: {
          country: string | null
          created_at: string
          id: string
          institution: string
          membership_id: string
          organization_id: string
          qualification: string
          qualification_type: string
          sort_order: number
          updated_at: string
          year: number | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          institution: string
          membership_id: string
          organization_id: string
          qualification: string
          qualification_type: string
          sort_order?: number
          updated_at?: string
          year?: number | null
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          institution?: string
          membership_id?: string
          organization_id?: string
          qualification?: string
          qualification_type?: string
          sort_order?: number
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clinician_qualifications_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "staff_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinician_qualifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clinician_specializations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          membership_id: string
          name: string
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          membership_id: string
          name: string
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          membership_id?: string
          name?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinician_specializations_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "staff_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinician_specializations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string
          description: string | null
          email: string | null
          facility_id: string
          id: string
          is_active: boolean
          is_public: boolean
          name: string
          opening_hours: Json
          organization_id: string
          phone: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          email?: string | null
          facility_id: string
          id?: string
          is_active?: boolean
          is_public?: boolean
          name: string
          opening_hours?: Json
          organization_id: string
          phone?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          email?: string | null
          facility_id?: string
          id?: string
          is_active?: boolean
          is_public?: boolean
          name?: string
          opening_hours?: Json
          organization_id?: string
          phone?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnoses: {
        Row: {
          code_system: string | null
          created_at: string
          diagnosed_by: string | null
          diagnosis_code: string | null
          diagnosis_name: string
          diagnosis_type: string
          encounter_id: string
          id: string
          notes: string | null
          organization_id: string
          patient_id: string
          patient_visible: boolean
        }
        Insert: {
          code_system?: string | null
          created_at?: string
          diagnosed_by?: string | null
          diagnosis_code?: string | null
          diagnosis_name: string
          diagnosis_type?: string
          encounter_id: string
          id?: string
          notes?: string | null
          organization_id: string
          patient_id: string
          patient_visible?: boolean
        }
        Update: {
          code_system?: string | null
          created_at?: string
          diagnosed_by?: string | null
          diagnosis_code?: string | null
          diagnosis_name?: string
          diagnosis_type?: string
          encounter_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          patient_id?: string
          patient_visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "diagnoses_diagnosed_by_fkey"
            columns: ["diagnosed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnoses_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnoses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnoses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      encounters: {
        Row: {
          appointment_id: string | null
          chief_complaint: string | null
          clinician_user_id: string | null
          created_at: string
          created_by: string | null
          department_id: string
          encounter_type: string
          ended_at: string | null
          facility_id: string
          id: string
          organization_id: string
          patient_id: string
          service_id: string | null
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          chief_complaint?: string | null
          clinician_user_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id: string
          encounter_type?: string
          ended_at?: string | null
          facility_id: string
          id?: string
          organization_id: string
          patient_id: string
          service_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          chief_complaint?: string | null
          clinician_user_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string
          encounter_type?: string
          ended_at?: string | null
          facility_id?: string
          id?: string
          organization_id?: string
          patient_id?: string
          service_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "encounters_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_clinician_user_id_fkey"
            columns: ["clinician_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          address_line: string | null
          city: string | null
          code: string
          country_code: string
          created_at: string
          district: string | null
          email: string | null
          facility_type: string
          id: string
          is_active: boolean
          is_public: boolean
          name: string
          organization_id: string
          phone: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          address_line?: string | null
          city?: string | null
          code: string
          country_code?: string
          created_at?: string
          district?: string | null
          email?: string | null
          facility_type?: string
          id?: string
          is_active?: boolean
          is_public?: boolean
          name: string
          organization_id: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          address_line?: string | null
          city?: string | null
          code?: string
          country_code?: string
          created_at?: string
          district?: string | null
          email?: string | null
          facility_type?: string
          id?: string
          is_active?: boolean
          is_public?: boolean
          name?: string
          organization_id?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facilities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          batch_tracking: boolean
          cost_price: number
          created_at: string
          department_id: string | null
          facility_id: string
          id: string
          is_active: boolean
          item_name: string
          medication_id: string | null
          on_hand_quantity: number
          organization_id: string
          reorder_level: number
          selling_price: number
          sku: string
          unit: string
          updated_at: string
        }
        Insert: {
          batch_tracking?: boolean
          cost_price?: number
          created_at?: string
          department_id?: string | null
          facility_id: string
          id?: string
          is_active?: boolean
          item_name: string
          medication_id?: string | null
          on_hand_quantity?: number
          organization_id: string
          reorder_level?: number
          selling_price?: number
          sku: string
          unit?: string
          updated_at?: string
        }
        Update: {
          batch_tracking?: boolean
          cost_price?: number
          created_at?: string
          department_id?: string | null
          facility_id?: string
          id?: string
          is_active?: boolean
          item_name?: string
          medication_id?: string | null
          on_hand_quantity?: number
          organization_id?: string
          reorder_level?: number
          selling_price?: number
          sku?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          discount_amount: number
          id: string
          invoice_id: string
          line_total: number
          medication_id: string | null
          quantity: number
          service_id: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          discount_amount?: number
          id?: string
          invoice_id: string
          line_total?: number
          medication_id?: string | null
          quantity?: number
          service_id?: string | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          discount_amount?: number
          id?: string
          invoice_id?: string
          line_total?: number
          medication_id?: string | null
          quantity?: number
          service_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          balance: number
          created_at: string
          created_by: string | null
          currency_code: string
          discount_total: number
          due_at: string | null
          encounter_id: string | null
          facility_id: string
          id: string
          invoice_number: string
          issued_at: string | null
          organization_id: string
          patient_id: string
          status: string
          subtotal: number
          tax_total: number
          total: number
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          created_by?: string | null
          currency_code?: string
          discount_total?: number
          due_at?: string | null
          encounter_id?: string | null
          facility_id: string
          id?: string
          invoice_number: string
          issued_at?: string | null
          organization_id: string
          patient_id: string
          status?: string
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          created_by?: string | null
          currency_code?: string
          discount_total?: number
          due_at?: string | null
          encounter_id?: string | null
          facility_id?: string
          id?: string
          invoice_number?: string
          issued_at?: string | null
          organization_id?: string
          patient_id?: string
          status?: string
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_order_items: {
        Row: {
          collected_at: string | null
          collected_by: string | null
          completed_at: string | null
          created_at: string
          id: string
          lab_order_id: string
          lab_test_id: string
          specimen_id: string | null
          status: string
        }
        Insert: {
          collected_at?: string | null
          collected_by?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          lab_order_id: string
          lab_test_id: string
          specimen_id?: string | null
          status?: string
        }
        Update: {
          collected_at?: string | null
          collected_by?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          lab_order_id?: string
          lab_test_id?: string
          specimen_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_order_items_collected_by_fkey"
            columns: ["collected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_order_items_lab_order_id_fkey"
            columns: ["lab_order_id"]
            isOneToOne: false
            referencedRelation: "lab_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_order_items_lab_test_id_fkey"
            columns: ["lab_test_id"]
            isOneToOne: false
            referencedRelation: "lab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_orders: {
        Row: {
          clinical_notes: string | null
          completed_at: string | null
          created_at: string
          department_id: string
          encounter_id: string
          facility_id: string
          id: string
          ordered_at: string
          ordered_by: string
          organization_id: string
          patient_id: string
          priority: string
          status: string
          updated_at: string
        }
        Insert: {
          clinical_notes?: string | null
          completed_at?: string | null
          created_at?: string
          department_id: string
          encounter_id: string
          facility_id: string
          id?: string
          ordered_at?: string
          ordered_by: string
          organization_id: string
          patient_id: string
          priority?: string
          status?: string
          updated_at?: string
        }
        Update: {
          clinical_notes?: string | null
          completed_at?: string | null
          created_at?: string
          department_id?: string
          encounter_id?: string
          facility_id?: string
          id?: string
          ordered_at?: string
          ordered_by?: string
          organization_id?: string
          patient_id?: string
          priority?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_orders_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_ordered_by_fkey"
            columns: ["ordered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_results: {
        Row: {
          abnormal_flag: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          lab_order_item_id: string
          organization_id: string
          patient_id: string
          patient_visible: boolean
          reference_range: string | null
          result_text: string | null
          result_value: string | null
          resulted_at: string | null
          resulted_by: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          abnormal_flag?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          lab_order_item_id: string
          organization_id: string
          patient_id: string
          patient_visible?: boolean
          reference_range?: string | null
          result_text?: string | null
          result_value?: string | null
          resulted_at?: string | null
          resulted_by?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          abnormal_flag?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          lab_order_item_id?: string
          organization_id?: string
          patient_id?: string
          patient_visible?: boolean
          reference_range?: string | null
          result_text?: string | null
          result_value?: string | null
          resulted_at?: string | null
          resulted_by?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_lab_order_item_id_fkey"
            columns: ["lab_order_item_id"]
            isOneToOne: true
            referencedRelation: "lab_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_resulted_by_fkey"
            columns: ["resulted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_tests: {
        Row: {
          code: string
          created_at: string
          currency_code: string
          default_unit: string | null
          department_id: string | null
          description: string | null
          id: string
          is_active: boolean
          is_public: boolean
          name: string
          organization_id: string
          price: number
          reference_range_text: string | null
          specimen_type: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          currency_code?: string
          default_unit?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          name: string
          organization_id: string
          price?: number
          reference_range_text?: string | null
          specimen_type?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          currency_code?: string
          default_unit?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          name?: string
          organization_id?: string
          price?: number
          reference_range_text?: string | null
          specimen_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_tests_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_tests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          brand_name: string | null
          code: string
          created_at: string
          dosage_form: string | null
          generic_name: string
          id: string
          is_active: boolean
          organization_id: string
          strength: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          brand_name?: string | null
          code: string
          created_at?: string
          dosage_form?: string | null
          generic_name: string
          id?: string
          is_active?: boolean
          organization_id: string
          strength?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          brand_name?: string | null
          code?: string
          created_at?: string
          dosage_form?: string | null
          generic_name?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          strength?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: string
          created_at: string
          error_message: string | null
          id: string
          message: string
          metadata: Json | null
          read_at: string | null
          recipient_email: string | null
          recipient_name: string | null
          recipient_patient_id: string | null
          sent_at: string | null
          status: string
          subject: string
          type: string
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read_at?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_patient_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          type: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read_at?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_patient_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          address_line: string | null
          city: string | null
          country_code: string
          created_at: string
          currency_code: string
          description: string | null
          district: string | null
          email: string | null
          emergency_phone: string | null
          id: string
          is_public: boolean
          legal_name: string | null
          logo_path: string | null
          name: string
          phone: string | null
          slug: string
          status: string
          timezone: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address_line?: string | null
          city?: string | null
          country_code?: string
          created_at?: string
          currency_code?: string
          description?: string | null
          district?: string | null
          email?: string | null
          emergency_phone?: string | null
          id?: string
          is_public?: boolean
          legal_name?: string | null
          logo_path?: string | null
          name: string
          phone?: string | null
          slug: string
          status?: string
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address_line?: string | null
          city?: string | null
          country_code?: string
          created_at?: string
          currency_code?: string
          description?: string | null
          district?: string | null
          email?: string | null
          emergency_phone?: string | null
          id?: string
          is_public?: boolean
          legal_name?: string | null
          logo_path?: string | null
          name?: string
          phone?: string | null
          slug?: string
          status?: string
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      organization_settings: {
        Row: {
          appointment_reminders_enabled: boolean
          brand_color: string
          booking_max_advance_days: number
          booking_min_advance_minutes: number
          cancellation_cutoff_hours: number
          created_at: string
          default_date_format: string
          default_locale: string
          default_time_format: string
          email_notifications_enabled: boolean
          in_app_notifications_enabled: boolean
          online_booking_enabled: boolean
          organization_id: string
          patient_cancellation_enabled: boolean
          reminder_hours_before: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          appointment_reminders_enabled?: boolean
          brand_color?: string
          booking_max_advance_days?: number
          booking_min_advance_minutes?: number
          cancellation_cutoff_hours?: number
          created_at?: string
          default_date_format?: string
          default_locale?: string
          default_time_format?: string
          email_notifications_enabled?: boolean
          in_app_notifications_enabled?: boolean
          online_booking_enabled?: boolean
          organization_id: string
          patient_cancellation_enabled?: boolean
          reminder_hours_before?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          appointment_reminders_enabled?: boolean
          brand_color?: string
          booking_max_advance_days?: number
          booking_min_advance_minutes?: number
          cancellation_cutoff_hours?: number
          created_at?: string
          default_date_format?: string
          default_locale?: string
          default_time_format?: string
          email_notifications_enabled?: boolean
          in_app_notifications_enabled?: boolean
          online_booking_enabled?: boolean
          organization_id?: string
          patient_cancellation_enabled?: boolean
          reminder_hours_before?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address_line: string | null
          allergies_summary: string | null
          auth_user_id: string | null
          blood_group: string | null
          city: string | null
          country_code: string
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          district: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          middle_name: string | null
          national_id: string | null
          organization_id: string
          patient_number: string
          phone: string | null
          primary_facility_id: string | null
          sex: string | null
          updated_at: string
        }
        Insert: {
          address_line?: string | null
          allergies_summary?: string | null
          auth_user_id?: string | null
          blood_group?: string | null
          city?: string | null
          country_code?: string
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          district?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          id?: string
          is_active?: boolean
          last_name: string
          middle_name?: string | null
          national_id?: string | null
          organization_id: string
          patient_number?: string
          phone?: string | null
          primary_facility_id?: string | null
          sex?: string | null
          updated_at?: string
        }
        Update: {
          address_line?: string | null
          allergies_summary?: string | null
          auth_user_id?: string | null
          blood_group?: string | null
          city?: string | null
          country_code?: string
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          district?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          middle_name?: string | null
          national_id?: string | null
          organization_id?: string
          patient_number?: string
          phone?: string | null
          primary_facility_id?: string | null
          sex?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_primary_facility_id_fkey"
            columns: ["primary_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency_code: string
          external_reference: string | null
          facility_id: string
          id: string
          invoice_id: string
          organization_id: string
          paid_at: string
          patient_id: string
          payment_method: string
          provider: string | null
          received_by: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency_code?: string
          external_reference?: string | null
          facility_id: string
          id?: string
          invoice_id: string
          organization_id: string
          paid_at?: string
          patient_id: string
          payment_method: string
          provider?: string | null
          received_by?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency_code?: string
          external_reference?: string | null
          facility_id?: string
          id?: string
          invoice_id?: string
          organization_id?: string
          paid_at?: string
          patient_id?: string
          payment_method?: string
          provider?: string | null
          received_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string
          description: string
          permission_key: string
        }
        Insert: {
          created_at?: string
          description: string
          permission_key: string
        }
        Update: {
          created_at?: string
          description?: string
          permission_key?: string
        }
        Relationships: []
      }
      prescription_items: {
        Row: {
          created_at: string
          dose: string | null
          duration_days: number | null
          frequency: string | null
          id: string
          instructions: string | null
          medication_id: string | null
          medication_name: string
          prescription_id: string
          quantity: number | null
          route: string | null
          status: string
        }
        Insert: {
          created_at?: string
          dose?: string | null
          duration_days?: number | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          medication_id?: string | null
          medication_name: string
          prescription_id: string
          quantity?: number | null
          route?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          dose?: string | null
          duration_days?: number | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          medication_id?: string | null
          medication_name?: string
          prescription_id?: string
          quantity?: number | null
          route?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          created_at: string
          department_id: string
          encounter_id: string
          facility_id: string
          id: string
          notes: string | null
          organization_id: string
          patient_id: string
          prescribed_at: string
          prescriber_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id: string
          encounter_id: string
          facility_id: string
          id?: string
          notes?: string | null
          organization_id: string
          patient_id: string
          prescribed_at?: string
          prescriber_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string
          encounter_id?: string
          facility_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          patient_id?: string
          prescribed_at?: string
          prescriber_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_prescriber_user_id_fkey"
            columns: ["prescriber_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          professional_title: string | null
          status: string
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          professional_title?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          professional_title?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      queue_entries: {
        Row: {
          checked_in_at: string
          completion_override_reason: string | null
          consult_completed_at: string | null
          consult_completed_by: string | null
          consult_started_at: string | null
          consult_started_by: string | null
          created_at: string
          created_by: string | null
          department_id: string
          encounter_id: string
          facility_id: string
          id: string
          organization_id: string
          priority: string
          ready_for_clinician_at: string | null
          status: string
          triage_completed_at: string | null
          triage_started_at: string | null
          updated_at: string
        }
        Insert: {
          checked_in_at?: string
          completion_override_reason?: string | null
          consult_completed_at?: string | null
          consult_completed_by?: string | null
          consult_started_at?: string | null
          consult_started_by?: string | null
          created_at?: string
          created_by?: string | null
          department_id: string
          encounter_id: string
          facility_id: string
          id?: string
          organization_id: string
          priority?: string
          ready_for_clinician_at?: string | null
          status?: string
          triage_completed_at?: string | null
          triage_started_at?: string | null
          updated_at?: string
        }
        Update: {
          checked_in_at?: string
          completion_override_reason?: string | null
          consult_completed_at?: string | null
          consult_completed_by?: string | null
          consult_started_at?: string | null
          consult_started_by?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string
          encounter_id?: string
          facility_id?: string
          id?: string
          organization_id?: string
          priority?: string
          ready_for_clinician_at?: string | null
          status?: string
          triage_completed_at?: string | null
          triage_started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_entries_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_entries_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: true
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_entries_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_key: string
          role_id: string
        }
        Insert: {
          permission_key: string
          role_id: string
        }
        Update: {
          permission_key?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["permission_key"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          organization_id: string | null
          role_key: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          organization_id?: string | null
          role_key: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          organization_id?: string | null
          role_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          base_price: number
          code: string
          created_at: string
          currency_code: string
          department_id: string | null
          description: string | null
          duration_minutes: number | null
          facility_id: string | null
          id: string
          is_active: boolean
          is_public: boolean
          name: string
          organization_id: string
          service_type: string
          updated_at: string
        }
        Insert: {
          base_price?: number
          code: string
          created_at?: string
          currency_code?: string
          department_id?: string | null
          description?: string | null
          duration_minutes?: number | null
          facility_id?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          name: string
          organization_id: string
          service_type?: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          code?: string
          created_at?: string
          currency_code?: string
          department_id?: string | null
          description?: string | null
          duration_minutes?: number | null
          facility_id?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          name?: string
          organization_id?: string
          service_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_department_assignments: {
        Row: {
          created_at: string
          department_id: string
          is_department_head: boolean
          is_primary: boolean
          membership_id: string
        }
        Insert: {
          created_at?: string
          department_id: string
          is_department_head?: boolean
          is_primary?: boolean
          membership_id: string
        }
        Update: {
          created_at?: string
          department_id?: string
          is_department_head?: boolean
          is_primary?: boolean
          membership_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_department_assignments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_department_assignments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "staff_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_memberships: {
        Row: {
          created_at: string
          employee_number: string | null
          id: string
          is_active: boolean
          job_title: string | null
          joined_at: string
          must_change_password: boolean
          organization_id: string
          primary_facility_id: string | null
          registration_number: string | null
          role_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          employee_number?: string | null
          id?: string
          is_active?: boolean
          job_title?: string | null
          joined_at?: string
          must_change_password?: boolean
          organization_id: string
          primary_facility_id?: string | null
          registration_number?: string | null
          role_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          employee_number?: string | null
          id?: string
          is_active?: boolean
          job_title?: string | null
          joined_at?: string
          must_change_password?: boolean
          organization_id?: string
          primary_facility_id?: string | null
          registration_number?: string | null
          role_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_memberships_primary_facility_id_fkey"
            columns: ["primary_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_memberships_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_service_assignments: {
        Row: {
          created_at: string
          is_active: boolean
          membership_id: string
          service_id: string
        }
        Insert: {
          created_at?: string
          is_active?: boolean
          membership_id: string
          service_id: string
        }
        Update: {
          created_at?: string
          is_active?: boolean
          membership_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_service_assignments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "staff_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_service_assignments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          batch_number: string | null
          created_at: string
          created_by: string | null
          expiry_date: string | null
          facility_id: string
          id: string
          inventory_item_id: string
          movement_type: string
          notes: string | null
          organization_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          facility_id: string
          id?: string
          inventory_item_id: string
          movement_type: string
          notes?: string | null
          organization_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          facility_id?: string
          id?: string
          inventory_item_id?: string
          movement_type?: string
          notes?: string | null
          organization_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vitals: {
        Row: {
          created_at: string
          diastolic_bp: number | null
          encounter_id: string
          height_cm: number | null
          id: string
          notes: string | null
          organization_id: string
          oxygen_saturation: number | null
          patient_id: string
          pulse_bpm: number | null
          recorded_at: string
          recorded_by: string | null
          respiratory_rate: number | null
          systolic_bp: number | null
          temperature_c: number | null
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          diastolic_bp?: number | null
          encounter_id: string
          height_cm?: number | null
          id?: string
          notes?: string | null
          organization_id: string
          oxygen_saturation?: number | null
          patient_id: string
          pulse_bpm?: number | null
          recorded_at?: string
          recorded_by?: string | null
          respiratory_rate?: number | null
          systolic_bp?: number | null
          temperature_c?: number | null
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          diastolic_bp?: number | null
          encounter_id?: string
          height_cm?: number | null
          id?: string
          notes?: string | null
          organization_id?: string
          oxygen_saturation?: number | null
          patient_id?: string
          pulse_bpm?: number | null
          recorded_at?: string
          recorded_by?: string | null
          respiratory_rate?: number | null
          systolic_bp?: number | null
          temperature_c?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vitals_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vitals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vitals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vitals_recorded_by_fkey"
            columns: ["recorded_by"]
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
      check_in_appointment: {
        Args: {
          p_appointment_id: string
        }
        Returns: Json
      }
      get_public_clinician_directory: {
        Args: never
        Returns: {
          accepting_appointments: boolean
          achievements: Json
          department_id: string
          department_name: string
          display_name: string
          experience_summary: string
          facility_city: string
          facility_id: string
          facility_name: string
          facility_timezone: string
          languages: string[]
          photo_path: string
          professional_title: string
          public_bio: string
          qualifications: Json
          service_duration_minutes: number
          service_id: string
          service_name: string
          slug: string
          specializations: Json
          years_experience: number
        }[]
      }
      get_public_clinician_schedule: {
        Args: {
          p_bounds_end: string
          p_bounds_start: string
          p_day_of_week: number
          p_facility_id: string
          p_slug: string
        }
        Returns: Json
      }
      replace_clinician_assignments: {
        Args: {
          p_department_ids: Json
          p_membership_id: string
          p_service_ids: Json
        }
        Returns: Json
      }
      replace_clinician_availability: {
        Args: {
          p_facility_id: string
          p_membership_id: string
          p_periods: Json
        }
        Returns: number
      }
      replace_clinician_profile: {
        Args: {
          p_achievements: Json
          p_display_name: string
          p_experience_summary: string
          p_languages: string[]
          p_membership_id: string
          p_photo_path: string
          p_professional_title: string
          p_public_bio: string
          p_qualifications: Json
          p_slug: string
          p_specializations: Json
          p_years_experience: number
        }
        Returns: string
      }
      request_patient_appointment: {
        Args: {
          p_clinician_slug: string
          p_department_id: string
          p_facility_id: string
          p_patient_id: string
          p_reason: string
          p_scheduled_start: string
          p_service_id: string
        }
        Returns: string
      }
      set_department_head: {
        Args: {
          p_department_id: string
          p_membership_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
