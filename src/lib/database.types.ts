/**
 * Hand-authored types mirroring the membership-app schema in Supabase.
 * Regenerate with the Supabase MCP `generate_typescript_types` or the CLI
 * (`supabase gen types typescript`) once the schema stabilises.
 *
 * NOTE: only the tables/functions this app touches are typed here. The
 * existing staff / time-clock tables (users, time_logs, schedules, ...)
 * live in the same project but are intentionally omitted.
 */

export type MembershipStatus =
  | "pending"
  | "active"
  | "paused"
  | "cancelled"
  | "expired";

export type SaleType = "wash" | "membership" | "retail";

export interface MembershipPlan {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  billing_period: "monthly" | "annual" | "one_time";
  wash_tier: string | null;
  features: string[];
  drb_plan_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Customer {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar: string | null;
  rewards_points: number;
  last_login_at: string | null;
  drb_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  customer_id: string;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  license_plate: string | null;
  nickname: string | null;
  rfid_tag: string | null;
  created_at: string;
}

export interface Membership {
  id: string;
  customer_id: string;
  plan_id: string | null;
  vehicle_id: string | null;
  status: MembershipStatus;
  started_at: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  drb_membership_id: string | null;
  sold_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RewardTransaction {
  id: string;
  customer_id: string;
  points: number;
  reason: string;
  sale_id: string | null;
  created_at: string;
}

/** Non-sensitive employee identity returned by csa_verify_pin. */
export interface CsaEmployee {
  id: string;
  name: string;
  role: string;
  site: string | null;
  is_approved: boolean;
}

/** Today's sales aggregate for a CSA, returned by csa_shift_summary. */
export interface ShiftSummary {
  employee_id: string;
  employee_name: string;
  sale_count: number;
  total_cents: number;
  wash_count: number;
  membership_count: number;
}

/**
 * Minimal Database interface so the typed supabase-js client compiles.
 * Rows are loosely typed as the interfaces above; expand as needed.
 */
export interface Database {
  public: {
    Tables: {
      membership_plans: { Row: MembershipPlan; Insert: Partial<MembershipPlan>; Update: Partial<MembershipPlan> };
      customers: { Row: Customer; Insert: Partial<Customer>; Update: Partial<Customer> };
      vehicles: { Row: Vehicle; Insert: Partial<Vehicle>; Update: Partial<Vehicle> };
      memberships: { Row: Membership; Insert: Partial<Membership>; Update: Partial<Membership> };
      reward_transactions: { Row: RewardTransaction; Insert: Partial<RewardTransaction>; Update: Partial<RewardTransaction> };
    };
    Views: Record<string, never>;
    Functions: {
      csa_verify_pin: {
        Args: { p_pin: string };
        Returns: CsaEmployee[];
      };
      csa_record_sale: {
        Args: {
          p_pin: string;
          p_sale_type: SaleType;
          p_amount_cents: number;
          p_item?: string | null;
          p_customer_id?: string | null;
          p_vehicle_id?: string | null;
          p_plan_id?: string | null;
          p_payment_method?: string;
          p_points?: number;
          p_first_name?: string | null;
          p_last_name?: string | null;
          p_phone?: string | null;
          p_email?: string | null;
          p_license_plate?: string | null;
        };
        Returns: string;
      };
      award_daily_login: {
        Args: { p_points?: number };
        Returns: number;
      };
      csa_shift_summary: {
        Args: { p_pin: string };
        Returns: ShiftSummary[];
      };
    };
    Enums: Record<string, never>;
  };
}
