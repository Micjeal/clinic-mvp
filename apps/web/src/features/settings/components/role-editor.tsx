"use client";

import { useActionState, useState } from "react";
import { PermissionPicker, type PermissionItem } from "@/features/settings/components/permission-picker";

type ActionState = { error?: string; success?: boolean } | null;

export function RoleEditorForm({
  action,
  roleId,
  permissions,
  initialName,
  initialDescription,
  initialPermissions,
}: {
  action: (roleId: string, prev: ActionState, formData: FormData) => Promise<ActionState>;
  roleId: string;
  permissions: PermissionItem[];
  initialName: string;
  initialDescription: string | null;
  initialPermissions: string[];
}) {
  const bound = action.bind(null, roleId);
  const [state, formAction, pending] = useActionState(bound, null);
  const [dirty, setDirty] = useState(false);

  return (
    <form
      action={formAction}
      className="staff-role-editor"
      onChange={() => setDirty(true)}
    >
      <div className="staff-form-grid">
        <label>
          <span>Role name</span>
          <input defaultValue={initialName} name="name" required />
        </label>
        <label className="staff-form-grid__wide">
          <span>Description</span>
          <input defaultValue={initialDescription ?? ""} name="description" placeholder="What this role is for" />
        </label>
      </div>
      <PermissionPicker permissions={permissions} selected={initialPermissions} />
      <div className="staff-form-actions">
        {state?.error ? <p className="staff-form-message staff-form-message--error" role="alert">{state.error}</p> : null}
        {state?.success ? <p className="staff-form-message staff-form-message--success" role="status">Role saved.</p> : null}
        <button className="btn" disabled={pending} type="submit">{pending ? "Saving…" : "Save role"}</button>
        {dirty ? <span className="staff-settings-hint">Unsaved changes</span> : null}
      </div>
    </form>
  );
}

export function CreateRoleForm({
  action,
  permissions,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  permissions: PermissionItem[];
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [open, setOpen] = useState(false);

  if (!open) {
    return <button className="btn btn--secondary" onClick={() => setOpen(true)} type="button">+ New custom role</button>;
  }

  return (
    <form action={formAction} className="staff-role-editor">
      <div className="staff-form-grid">
        <label>
          <span>Role name</span>
          <input name="name" placeholder="e.g. Night-shift nurse" required />
        </label>
        <label className="staff-form-grid__wide">
          <span>Description</span>
          <input name="description" placeholder="What this role is for" />
        </label>
      </div>
      <PermissionPicker permissions={permissions} selected={[]} />
      <div className="staff-form-actions">
        {state?.error ? <p className="staff-form-message staff-form-message--error" role="alert">{state.error}</p> : null}
        <button className="btn" disabled={pending} type="submit">{pending ? "Creating…" : "Create role"}</button>
        <button className="btn btn--secondary" onClick={() => setOpen(false)} type="button">Cancel</button>
      </div>
    </form>
  );
}
