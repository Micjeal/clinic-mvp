import "server-only";
import {listPublicServices,listPublicServicesForDepartment} from "@/server/repositories/service.repository";
export async function getPublicServices(){try{return await listPublicServices();}catch{return [];}}
export async function getPublicServicesForDepartment(id:string){try{return await listPublicServicesForDepartment(id);}catch{return [];}}
