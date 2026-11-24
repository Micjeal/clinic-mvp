import "server-only";
import { Permissions } from "@clinic/permissions";
import { NotFoundError } from "@/server/errors";
import { requirePermission } from "@/server/permissions/require-permission";
import { createClient } from "@/lib/supabase/server";

const untyped = async () => (await createClient()) as unknown as import("@supabase/supabase-js").SupabaseClient;

export async function listPatients(search?: string) {
  const staff = await requirePermission(Permissions.PATIENT_READ);
  const orgId = staff.membership.organization_id;
  const supabase = await untyped();
  let query = supabase.from("patients").select("id,patient_number,first_name,last_name,phone,email,date_of_birth,sex,is_active").eq("organization_id", orgId).eq("is_active", true).order("last_name").limit(100);
  if (search?.trim()) {
    const term = search.trim().replace(/[%_]/g, "");
    query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,patient_number.ilike.%${term}%,phone.ilike.%${term}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getPatientRecord(id: string) {
  const staff = await requirePermission(Permissions.PATIENT_READ);
  const orgId = staff.membership.organization_id;
  const supabase = await untyped();
  const { data: patient, error } = await supabase.from("patients").select("*").eq("id", id).eq("organization_id", orgId).maybeSingle();
  if (error) throw error;
  if (!patient) throw new NotFoundError("Patient not found");

  const [appointments, encounters, diagnoses, notes, labResults, imagingReports, invoices, admissions, prescriptions] = await Promise.all([
    supabase.from("appointments").select("id,scheduled_start,status,reason,departments(name),services(name)").eq("patient_id", id).eq("organization_id", orgId).order("scheduled_start", { ascending: false }).limit(50),
    supabase.from("encounters").select("id,started_at,status,chief_complaint,departments(name)").eq("patient_id", id).eq("organization_id", orgId).order("started_at", { ascending: false }).limit(50),
    supabase.from("diagnoses").select("id,diagnosis_name,diagnosis_code,diagnosis_type,created_at,patient_visible").eq("patient_id", id).eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50),
    supabase.from("clinical_notes").select("id,note_type,content,patient_visible,created_at,profiles!clinical_notes_author_user_id_fkey(full_name)").eq("patient_id", id).eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50),
    supabase.from("lab_results").select("id,result_value,result_unit,abnormal_flag,patient_visible,resulted_at,lab_tests(name,code)").eq("patient_id", id).eq("organization_id", orgId).order("resulted_at", { ascending: false }).limit(50),
    supabase.from("imaging_reports").select("id,findings,impression,status,approved_at,patient_visible,imaging_orders!inner(imaging_tests(name,modality))").eq("patient_id", id).eq("organization_id", orgId).order("approved_at", { ascending: false }).limit(50),
    supabase.from("invoices").select("id,invoice_number,status,total,balance,currency_code,created_at").eq("patient_id", id).eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50),
    supabase.from("admissions").select("id,admission_number,status,reason_for_admission,diagnosis_on_admission,admitted_at,discharged_at,wards(name)").eq("patient_id", id).eq("organization_id", orgId).order("admitted_at", { ascending: false }).limit(50),
    supabase.from("prescriptions").select("id,status,created_at,prescription_items(medication_name,dose,frequency,duration,quantity,status)").eq("patient_id", id).eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50),
  ]);

  return {
    patient,
    timeline: {
      appointments: appointments.data ?? [],
      encounters: encounters.data ?? [],
      diagnoses: diagnoses.data ?? [],
      notes: notes.data ?? [],
      labResults: labResults.data ?? [],
      imagingReports: imagingReports.data ?? [],
      invoices: invoices.data ?? [],
      admissions: admissions.data ?? [],
      prescriptions: prescriptions.data ?? [],
    },
  };
}
