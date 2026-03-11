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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      credit_note_items: {
        Row: {
          cgst_amount: number | null
          created_at: string
          credit_note_id: string
          gst_rate: number | null
          hsn_code: string | null
          id: string
          igst_amount: number | null
          product_id: string | null
          product_name: string
          quantity: number
          rate: number
          sgst_amount: number | null
          taxable_amount: number | null
          total_amount: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          cgst_amount?: number | null
          created_at?: string
          credit_note_id: string
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          product_id?: string | null
          product_name: string
          quantity?: number
          rate?: number
          sgst_amount?: number | null
          taxable_amount?: number | null
          total_amount?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          cgst_amount?: number | null
          created_at?: string
          credit_note_id?: string
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          rate?: number
          sgst_amount?: number | null
          taxable_amount?: number | null
          total_amount?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_note_items_credit_note_id_fkey"
            columns: ["credit_note_id"]
            isOneToOne: false
            referencedRelation: "credit_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_notes: {
        Row: {
          cgst: number | null
          created_at: string
          created_by: string | null
          created_by_name: string | null
          credit_note_date: string
          credit_note_number: string
          customer_id: string | null
          customer_name: string
          id: string
          igst: number | null
          is_deleted: boolean | null
          misc_amount: number | null
          misc_reason: string | null
          notes: string | null
          original_invoice_id: string | null
          original_invoice_number: string | null
          reason: string | null
          sgst: number | null
          status: string | null
          subtotal: number | null
          tenant_id: string
          total: number | null
          updated_at: string
        }
        Insert: {
          cgst?: number | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          credit_note_date?: string
          credit_note_number: string
          customer_id?: string | null
          customer_name: string
          id?: string
          igst?: number | null
          is_deleted?: boolean | null
          misc_amount?: number | null
          misc_reason?: string | null
          notes?: string | null
          original_invoice_id?: string | null
          original_invoice_number?: string | null
          reason?: string | null
          sgst?: number | null
          status?: string | null
          subtotal?: number | null
          tenant_id: string
          total?: number | null
          updated_at?: string
        }
        Update: {
          cgst?: number | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          credit_note_date?: string
          credit_note_number?: string
          customer_id?: string | null
          customer_name?: string
          id?: string
          igst?: number | null
          is_deleted?: boolean | null
          misc_amount?: number | null
          misc_reason?: string | null
          notes?: string | null
          original_invoice_id?: string | null
          original_invoice_number?: string | null
          reason?: string | null
          sgst?: number | null
          status?: string | null
          subtotal?: number | null
          tenant_id?: string
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          gst_number: string | null
          id: string
          is_deleted: boolean | null
          name: string
          phone: string | null
          pincode: string | null
          state: string | null
          state_code: string | null
          tenant_id: string
          type: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          gst_number?: string | null
          id?: string
          is_deleted?: boolean | null
          name: string
          phone?: string | null
          pincode?: string | null
          state?: string | null
          state_code?: string | null
          tenant_id: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          gst_number?: string | null
          id?: string
          is_deleted?: boolean | null
          name?: string
          phone?: string | null
          pincode?: string | null
          state?: string | null
          state_code?: string | null
          tenant_id?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      debit_note_items: {
        Row: {
          cgst_amount: number | null
          created_at: string
          debit_note_id: string
          gst_rate: number | null
          hsn_code: string | null
          id: string
          igst_amount: number | null
          product_id: string | null
          product_name: string
          quantity: number
          rate: number
          sgst_amount: number | null
          taxable_amount: number | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          cgst_amount?: number | null
          created_at?: string
          debit_note_id: string
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          product_id?: string | null
          product_name: string
          quantity?: number
          rate?: number
          sgst_amount?: number | null
          taxable_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          cgst_amount?: number | null
          created_at?: string
          debit_note_id?: string
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          rate?: number
          sgst_amount?: number | null
          taxable_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debit_note_items_debit_note_id_fkey"
            columns: ["debit_note_id"]
            isOneToOne: false
            referencedRelation: "debit_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debit_note_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      debit_notes: {
        Row: {
          amount: number | null
          cgst: number | null
          created_at: string
          created_by: string | null
          created_by_name: string | null
          customer_id: string | null
          customer_name: string
          debit_note_date: string
          debit_note_number: string
          id: string
          igst: number | null
          is_deleted: boolean | null
          notes: string | null
          original_invoice_id: string | null
          original_invoice_number: string | null
          reason: string | null
          sgst: number | null
          status: string | null
          subtotal: number | null
          tenant_id: string
          total: number | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          cgst?: number | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          customer_id?: string | null
          customer_name: string
          debit_note_date?: string
          debit_note_number: string
          id?: string
          igst?: number | null
          is_deleted?: boolean | null
          notes?: string | null
          original_invoice_id?: string | null
          original_invoice_number?: string | null
          reason?: string | null
          sgst?: number | null
          status?: string | null
          subtotal?: number | null
          tenant_id: string
          total?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          cgst?: number | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          customer_id?: string | null
          customer_name?: string
          debit_note_date?: string
          debit_note_number?: string
          id?: string
          igst?: number | null
          is_deleted?: boolean | null
          notes?: string | null
          original_invoice_id?: string | null
          original_invoice_number?: string | null
          reason?: string | null
          sgst?: number | null
          status?: string | null
          subtotal?: number | null
          tenant_id?: string
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debit_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debit_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debit_notes_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debit_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          cgst_amount: number | null
          created_at: string
          discount_percent: number | null
          gst_rate: number | null
          hsn_code: string | null
          id: string
          igst_amount: number | null
          invoice_id: string
          mrp: number | null
          product_id: string | null
          product_name: string
          quantity: number
          rate: number
          selling_price: number | null
          sgst_amount: number | null
          taxable_amount: number | null
          total_amount: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          cgst_amount?: number | null
          created_at?: string
          discount_percent?: number | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          invoice_id: string
          mrp?: number | null
          product_id?: string | null
          product_name: string
          quantity?: number
          rate?: number
          selling_price?: number | null
          sgst_amount?: number | null
          taxable_amount?: number | null
          total_amount?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          cgst_amount?: number | null
          created_at?: string
          discount_percent?: number | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          invoice_id?: string
          mrp?: number | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          rate?: number
          selling_price?: number | null
          sgst_amount?: number | null
          taxable_amount?: number | null
          total_amount?: number | null
          unit?: string | null
          updated_at?: string
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
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          cgst_total: number | null
          created_at: string
          created_by: string | null
          created_by_name: string | null
          created_by_role: string | null
          customer_address: string | null
          customer_gst: string | null
          customer_id: string | null
          customer_name: string
          customer_state: string | null
          customer_state_code: string | null
          discount_total: number | null
          eway_bill: string | null
          grand_total: number
          id: string
          igst_total: number | null
          invoice_date: string
          invoice_number: string
          is_deleted: boolean | null
          is_inter_state: boolean | null
          notes: string | null
          paid_amount: number | null
          place_of_supply: string | null
          round_off: number | null
          sgst_total: number | null
          status: string | null
          subtotal: number | null
          tenant_id: string
          updated_at: string
          vehicle_number: string | null
        }
        Insert: {
          cgst_total?: number | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          created_by_role?: string | null
          customer_address?: string | null
          customer_gst?: string | null
          customer_id?: string | null
          customer_name: string
          customer_state?: string | null
          customer_state_code?: string | null
          discount_total?: number | null
          eway_bill?: string | null
          grand_total?: number
          id?: string
          igst_total?: number | null
          invoice_date?: string
          invoice_number: string
          is_deleted?: boolean | null
          is_inter_state?: boolean | null
          notes?: string | null
          paid_amount?: number | null
          place_of_supply?: string | null
          round_off?: number | null
          sgst_total?: number | null
          status?: string | null
          subtotal?: number | null
          tenant_id: string
          updated_at?: string
          vehicle_number?: string | null
        }
        Update: {
          cgst_total?: number | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          created_by_role?: string | null
          customer_address?: string | null
          customer_gst?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_state?: string | null
          customer_state_code?: string | null
          discount_total?: number | null
          eway_bill?: string | null
          grand_total?: number
          id?: string
          igst_total?: number | null
          invoice_date?: string
          invoice_number?: string
          is_deleted?: boolean | null
          is_inter_state?: boolean | null
          notes?: string | null
          paid_amount?: number | null
          place_of_supply?: string | null
          round_off?: number | null
          sgst_total?: number | null
          status?: string | null
          subtotal?: number | null
          tenant_id?: string
          updated_at?: string
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string | null
          id: string
          invoice_id: string | null
          is_deleted: boolean | null
          notes: string | null
          payment_date: string
          payment_mode: string | null
          reference_number: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          is_deleted?: boolean | null
          notes?: string | null
          payment_date?: string
          payment_mode?: string | null
          reference_number?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          is_deleted?: boolean | null
          notes?: string | null
          payment_date?: string
          payment_mode?: string | null
          reference_number?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          gst_rate: number
          hsn_code: string | null
          id: string
          is_deleted: boolean | null
          last_purchase_rate: number | null
          min_stock_level: number | null
          name: string
          price: number
          stock_quantity: number | null
          tenant_id: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          gst_rate?: number
          hsn_code?: string | null
          id?: string
          is_deleted?: boolean | null
          last_purchase_rate?: number | null
          min_stock_level?: number | null
          name: string
          price?: number
          stock_quantity?: number | null
          tenant_id: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          gst_rate?: number
          hsn_code?: string | null
          id?: string
          is_deleted?: boolean | null
          last_purchase_rate?: number | null
          min_stock_level?: number | null
          name?: string
          price?: number
          stock_quantity?: number | null
          tenant_id?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          cgst: number | null
          created_at: string
          description: string | null
          id: string
          igst: number | null
          invoice_date: string
          invoice_number: string
          is_deleted: boolean | null
          sgst: number | null
          supplier_gst: string | null
          supplier_id: string | null
          supplier_name: string
          taxable_amount: number | null
          tenant_id: string
          total: number | null
          updated_at: string
        }
        Insert: {
          cgst?: number | null
          created_at?: string
          description?: string | null
          id?: string
          igst?: number | null
          invoice_date?: string
          invoice_number: string
          is_deleted?: boolean | null
          sgst?: number | null
          supplier_gst?: string | null
          supplier_id?: string | null
          supplier_name: string
          taxable_amount?: number | null
          tenant_id: string
          total?: number | null
          updated_at?: string
        }
        Update: {
          cgst?: number | null
          created_at?: string
          description?: string | null
          id?: string
          igst?: number | null
          invoice_date?: string
          invoice_number?: string
          is_deleted?: boolean | null
          sgst?: number | null
          supplier_gst?: string | null
          supplier_id?: string | null
          supplier_name?: string
          taxable_amount?: number | null
          tenant_id?: string
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_ifsc: string | null
          bank_name: string | null
          city: string | null
          created_at: string
          email: string | null
          gst_number: string | null
          id: string
          is_deleted: boolean | null
          name: string
          opening_balance: number | null
          phone: string | null
          pin: string | null
          state: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          is_deleted?: boolean | null
          name: string
          opening_balance?: number | null
          phone?: string | null
          pin?: string | null
          state?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          is_deleted?: boolean | null
          name?: string
          opening_balance?: number | null
          phone?: string | null
          pin?: string | null
          state?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_ifsc: string | null
          bank_name: string | null
          branch_name: string | null
          city: string | null
          created_at: string
          email: string | null
          financial_year_start: number | null
          firm_name: string
          gst_number: string | null
          id: string
          invoice_copy_label: string | null
          invoice_prefix: string | null
          is_active: boolean | null
          language: string | null
          logo_url: string | null
          max_employees: number | null
          phone: string | null
          pincode: string | null
          plan: string | null
          show_bank_details: boolean | null
          show_eway_bill: boolean | null
          show_terms: boolean | null
          state: string | null
          state_code: string | null
          subscription_end: string | null
          subscription_start: string | null
          terms_conditions: string | null
          updated_at: string
          upi_id: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          branch_name?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          financial_year_start?: number | null
          firm_name: string
          gst_number?: string | null
          id?: string
          invoice_copy_label?: string | null
          invoice_prefix?: string | null
          is_active?: boolean | null
          language?: string | null
          logo_url?: string | null
          max_employees?: number | null
          phone?: string | null
          pincode?: string | null
          plan?: string | null
          show_bank_details?: boolean | null
          show_eway_bill?: boolean | null
          show_terms?: boolean | null
          state?: string | null
          state_code?: string | null
          subscription_end?: string | null
          subscription_start?: string | null
          terms_conditions?: string | null
          updated_at?: string
          upi_id?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          branch_name?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          financial_year_start?: number | null
          firm_name?: string
          gst_number?: string | null
          id?: string
          invoice_copy_label?: string | null
          invoice_prefix?: string | null
          is_active?: boolean | null
          language?: string | null
          logo_url?: string | null
          max_employees?: number | null
          phone?: string | null
          pincode?: string | null
          plan?: string | null
          show_bank_details?: boolean | null
          show_eway_bill?: boolean | null
          show_terms?: boolean | null
          state?: string | null
          state_code?: string | null
          subscription_end?: string | null
          subscription_start?: string | null
          terms_conditions?: string | null
          updated_at?: string
          upi_id?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          language: string | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          language?: string | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          language?: string | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          role: string
          show_stock_to_employee: boolean | null
          tenant_id: string
          updated_at: string
          username: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          role?: string
          show_stock_to_employee?: boolean | null
          tenant_id: string
          updated_at?: string
          username: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          role?: string
          show_stock_to_employee?: boolean | null
          tenant_id?: string
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_tenant_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
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
    Enums: {},
  },
} as const
