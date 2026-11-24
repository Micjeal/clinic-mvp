import "server-only";
import { Permissions } from "@clinic/permissions";
import { ValidationError } from "@/server/errors";
import { requirePermission } from "@/server/permissions/require-permission";
import * as repo from "@/server/repositories/clinical.repository";

async function orgContext(permission: import("@clinic/permissions").Permission) {
  const staff = await requirePermission(permission);
  return { orgId: staff.membership.organization_id, userId: staff.user.id };
}

export async function getEncounterClinical(encounterId: string, patientId: string) {
  const { orgId } = await orgContext(Permissions.ENCOUNTER_READ);
  const [notes, diagnoses] = await Promise.all([repo.listEncounterNotes(encounterId, orgId), repo.listEncounterDiagnoses(encounterId, orgId)]);
  return { notes, diagnoses, patientId };
}

export async function addClinicalNote(input: { encounterId: string; patientId: string; noteType: string; content: string; patientVisible: boolean }) {
  const { orgId, userId } = await orgContext(Permissions.CLINICAL_NOTE_WRITE);
  if (!input.content.trim()) throw new ValidationError("Note content is required.");
  return repo.insertClinicalNote({ organizationId: orgId, encounterId: input.encounterId, patientId: input.patientId, authorUserId: userId, noteType: input.noteType, content: input.content.trim(), patientVisible: input.patientVisible });
}

export async function addDiagnosis(input: { encounterId: string; patientId: string; codeSystem: string | null; diagnosisCode: string | null; diagnosisName: string; diagnosisType: string; notes: string | null; patientVisible: boolean }) {
  const { orgId, userId } = await orgContext(Permissions.DIAGNOSIS_WRITE);
  if (!input.diagnosisName.trim()) throw new ValidationError("Diagnosis name is required.");
  return repo.insertDiagnosis({ organizationId: orgId, encounterId: input.encounterId, patientId: input.patientId, diagnosedBy: userId, codeSystem: input.codeSystem, diagnosisCode: input.diagnosisCode, diagnosisName: input.diagnosisName.trim(), diagnosisType: input.diagnosisType, notes: input.notes, patientVisible: input.patientVisible });
}
