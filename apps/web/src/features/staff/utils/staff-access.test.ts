import {describe,expect,it} from "vitest";
import {decideStaffPortalDestination,decideStaffRouteAccess} from "./staff-access";

const requiredPermission="appointment.read";

describe("staff route access",()=>{
  it("redirects unauthenticated visitors to staff login",()=>{expect(decideStaffRouteAccess({authenticated:false,hasActiveMembership:false,permissions:[],requiredPermission})).toBe("login");});
  it("denies an authenticated patient without a staff membership",()=>{expect(decideStaffRouteAccess({authenticated:true,hasActiveMembership:false,permissions:[],requiredPermission})).toBe("denied");});
  it("denies staff whose role lacks the required permission",()=>{expect(decideStaffRouteAccess({authenticated:true,hasActiveMembership:true,permissions:["appointment.create"],requiredPermission})).toBe("denied");});
  it("allows staff through permissions rather than a hard-coded role",()=>{expect(decideStaffRouteAccess({authenticated:true,hasActiveMembership:true,permissions:["appointment.read"],requiredPermission})).toBe("allowed");});
  it("does not special-case an organization administrator without permission",()=>{expect(decideStaffRouteAccess({authenticated:true,hasActiveMembership:true,permissions:[],requiredPermission})).toBe("denied");});
  it("keeps triage behind triage.write",()=>{expect(decideStaffRouteAccess({authenticated:true,hasActiveMembership:true,permissions:["queue.read","queue.manage"],requiredPermission:"triage.write"})).toBe("denied");expect(decideStaffRouteAccess({authenticated:true,hasActiveMembership:true,permissions:["triage.write"],requiredPermission:"triage.write"})).toBe("allowed");});
  it("requires temporary-password staff to finish setup before the portal",()=>{expect(decideStaffPortalDestination(true)).toBe("change-password");expect(decideStaffPortalDestination(false)).toBe("staff");});
});
