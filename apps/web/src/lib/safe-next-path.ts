export function safeNextPath(value:FormDataEntryValue|string|null,fallback:string){const path=String(value??"");return path.startsWith("/")&&!path.startsWith("//")?path:fallback;}
