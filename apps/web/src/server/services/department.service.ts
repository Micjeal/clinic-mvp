import "server-only";
import {listPublicDepartments,findPublicDepartment} from "@/server/repositories/department.repository";
export async function getPublicDepartments(){try{return await listPublicDepartments();}catch{return [];}}
export async function getPublicDepartment(id:string){try{return await findPublicDepartment(id);}catch{return null;}}
