"use client";

export default function StaffError({reset}:{error:Error;reset:()=>void}){return <section className="staff-panel staff-error-state" role="alert"><p className="eyebrow">Unable to load</p><h1>Something went wrong.</h1><p>We could not load the staff workspace. No changes were made.</p><button className="btn" onClick={reset} type="button">Try again</button></section>;}
