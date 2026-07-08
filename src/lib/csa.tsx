import React, { createContext, useContext, useMemo, useState } from "react";
import { supabase } from "./supabase";
import type { CsaEmployee, SaleType, ShiftSummary } from "./database.types";

interface RecordSaleInput {
  saleType: SaleType;
  amountCents: number;
  item?: string;
  customerId?: string | null;
  vehicleId?: string | null;
  planId?: string | null;
  paymentMethod?: string;
  points?: number;
}

interface CsaState {
  employee: CsaEmployee | null;
  /** Verify a PIN against public.users; returns the employee or null. */
  verifyPin: (pin: string) => Promise<CsaEmployee | null>;
  recordSale: (input: RecordSaleInput) => Promise<string>;
  shiftSummary: () => Promise<ShiftSummary | null>;
  endShift: () => void;
}

const CsaContext = createContext<CsaState | undefined>(undefined);

export function CsaProvider({ children }: { children: React.ReactNode }) {
  const [employee, setEmployee] = useState<CsaEmployee | null>(null);
  // Held only in memory for the POS session; required to authorize each sale.
  const [pin, setPin] = useState<string | null>(null);

  const value = useMemo<CsaState>(
    () => ({
      employee,
      verifyPin: async (candidate) => {
        const { data, error } = await supabase.rpc("csa_verify_pin", {
          p_pin: candidate,
        });
        if (error) throw error;
        const emp = Array.isArray(data) ? data[0] : (data as CsaEmployee | null);
        if (emp) {
          setEmployee(emp);
          setPin(candidate);
          return emp;
        }
        return null;
      },
      recordSale: async (input) => {
        if (!pin) throw new Error("No active CSA session.");
        const { data, error } = await supabase.rpc("csa_record_sale", {
          p_pin: pin,
          p_sale_type: input.saleType,
          p_amount_cents: input.amountCents,
          p_item: input.item ?? null,
          p_customer_id: input.customerId ?? null,
          p_vehicle_id: input.vehicleId ?? null,
          p_plan_id: input.planId ?? null,
          p_payment_method: input.paymentMethod ?? "card",
          p_points: input.points ?? 0,
        });
        if (error) throw error;
        return data as string;
      },
      shiftSummary: async () => {
        if (!pin) return null;
        const { data, error } = await supabase.rpc("csa_shift_summary", {
          p_pin: pin,
        });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : (data as ShiftSummary | null);
        return row ?? null;
      },
      endShift: () => {
        setEmployee(null);
        setPin(null);
      },
    }),
    [employee, pin],
  );

  return <CsaContext.Provider value={value}>{children}</CsaContext.Provider>;
}

export function useCsa(): CsaState {
  const ctx = useContext(CsaContext);
  if (!ctx) throw new Error("useCsa must be used within a CsaProvider");
  return ctx;
}
