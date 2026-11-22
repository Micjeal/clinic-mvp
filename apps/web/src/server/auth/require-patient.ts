import "server-only";
import {requireUser} from "@/server/auth/require-user";
import {findPatientByAuthUserId} from "@/server/repositories/patient.repository";
import {NotFoundError} from "@/server/errors";
export async function requirePatient(){const user=await requireUser();const patient=await findPatientByAuthUserId(user.id);if(!patient)throw new NotFoundError("Patient profile not found");return {user,patient};}
