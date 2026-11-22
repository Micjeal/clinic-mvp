import "server-only";
import {listPublicFacilities} from "@/server/repositories/facility.repository";
export async function getPublicFacilities(){try{return await listPublicFacilities();}catch{return [];}}
