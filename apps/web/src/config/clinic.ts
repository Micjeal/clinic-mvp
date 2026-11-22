import "server-only";

function requiredServerUuid(name:string){
  const value=process.env[name]?.trim();
  if(!value||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))throw new Error(`${name} must be configured with a valid UUID for patient provisioning.`);
  return value;
}

export function clinicOrganizationId(){return requiredServerUuid("CLINIC_ORGANIZATION_ID");}
export function clinicDefaultFacilityId(){const value=process.env.CLINIC_DEFAULT_FACILITY_ID?.trim();return value&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)?value:null;}
