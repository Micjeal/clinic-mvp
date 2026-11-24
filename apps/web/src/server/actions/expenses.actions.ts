"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Permissions } from "@clinic/permissions";
import { safeServerMessage } from "@/server/errors";
import { logServerError } from "@/server/logging";
import { requirePermission } from "@/server/permissions/require-permission";
import { hasRolePermission } from "@/server/repositories/staff.repository";
import * as repo from "@/server/repositories/expenses.repository";

async function ctx(permission: import("@clinic/permissions").Permission) {
  const staff = await requirePermission(permission);
  return { orgId: staff.membership.organization_id, userId: staff.user.id, staff };
}

export async function getExpensesData() {
  const { orgId, staff } = await ctx(Permissions.EXPENSES_READ);
  const items = await repo.listExpenses(orgId);
  const canManage = await hasRolePermission(staff.membership.role_id, Permissions.EXPENSES_MANAGE);
  return { items, canManage };
}

const expenseSchema = z.object({
  facility_id: z.string().optional().or(z.literal("")), category: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(500), amount: z.coerce.number().positive(),
  currency_code: z.string().trim().max(8).optional().or(z.literal("")), expense_date: z.string().optional().or(z.literal("")),
  payment_method: z.string().trim().max(60).optional().or(z.literal("")), reference: z.string().trim().max(120).optional().or(z.literal("")),
});

export async function createExpenseAction(_prev: unknown, formData: FormData) {
  try {
    const input = expenseSchema.parse({
      facility_id: formData.get("facility_id") || "", category: formData.get("category"),
      description: formData.get("description"), amount: formData.get("amount"),
      currency_code: formData.get("currency_code") || "", expense_date: formData.get("expense_date") || "",
      payment_method: formData.get("payment_method") || "", reference: formData.get("reference") || "",
    });
    const { orgId, userId } = await ctx(Permissions.EXPENSES_MANAGE);
    await repo.createExpense({
      organizationId: orgId, facilityId: input.facility_id || null, category: input.category,
      description: input.description, amount: input.amount, currencyCode: input.currency_code || "UGX",
      expenseDate: input.expense_date || new Date().toISOString().slice(0, 10),
      paymentMethod: input.payment_method || null, reference: input.reference || null, createdBy: userId,
    });
    revalidatePath("/staff/expenses");
    return { success: true };
  } catch (error) {
    logServerError("expenses", "create-failed", error);
    return { error: safeServerMessage(error, "We couldn't record the expense.") };
  }
}

export async function updateExpenseStatusAction(_prev: unknown, formData: FormData) {
  try {
    const id = z.string().uuid().parse(formData.get("expense_id"));
    const status = z.enum(["recorded", "approved", "paid", "void"]).parse(formData.get("status"));
    const { orgId } = await ctx(Permissions.EXPENSES_MANAGE);
    await repo.updateExpenseStatus(id, orgId, status);
    revalidatePath("/staff/expenses");
    return { success: true };
  } catch (error) {
    logServerError("expenses", "status-failed", error);
    return { error: safeServerMessage(error, "We couldn't update the expense.") };
  }
}
