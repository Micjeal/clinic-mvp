import "server-only";
import {requireUser} from "@/server/auth/require-user";
import {findActiveMembership} from "@/server/repositories/staff.repository";
import {AuthorizationError} from "@/server/errors";
export async function requireStaff(){const user=await requireUser();const membership=await findActiveMembership(user.id);if(!membership)throw new AuthorizationError("Staff access required");return {user,membership};}
