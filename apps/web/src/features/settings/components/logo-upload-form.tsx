"use client";

import { useActionState, useRef, useState } from "react";
import { uploadOrganizationLogoAction } from "@/server/actions/settings.actions";

export function LogoUploadForm({ currentUrl, orgName }: { currentUrl: string | null; orgName: string }) {
  const [state, formAction, pending] = useActionState(uploadOrganizationLogoAction, null);
  const [preview, setPreview] = useState<string | null>(null);
  const [hasFile, setHasFile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const shown = preview ?? currentUrl;

  return (
    <form action={formAction} className="staff-logo-form">
      <div className="staff-logo-preview" aria-label={`${orgName} logo preview`}>
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={`${orgName} logo`} src={shown} />
        ) : (
          <span className="staff-logo-preview__empty">No logo uploaded</span>
        )}
      </div>
      <div className="staff-logo-controls">
        <label className="btn btn-secondary" htmlFor="org-logo-input">
          {currentUrl ? "Replace logo" : "Upload logo"}
        </label>
        <input
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          id="org-logo-input"
          name="logo"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setHasFile(Boolean(file));
            if (file) setPreview(URL.createObjectURL(file));
          }}
          ref={fileRef}
          style={{ display: "none" }}
          type="file"
        />
        <p className="staff-field-hint">JPG, PNG, WebP or SVG, upmax 2 MB. The logo appears on the public website header and footer.</p>
        <div className="staff-form-actions">
          <button className="btn" disabled={pending || !hasFile} type="submit">
            {pending ? "Uploading…" : "Save logo"}
          </button>
          {currentUrl ? (
            <button
              className="btn btn-secondary"
              disabled={pending}
              name="remove_logo"
              type="submit"
              value="true"
            >
              Remove logo
            </button>
          ) : null}
        </div>
        {state?.error ? <p className="staff-form-message staff-form-message--error" role="alert">{state.error}</p> : null}
        {state?.success ? <p className="staff-form-message staff-form-message--success" role="status">Logo updated.</p> : null}
      </div>
    </form>
  );
}
