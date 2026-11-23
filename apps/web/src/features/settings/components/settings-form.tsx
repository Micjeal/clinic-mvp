"use client";

import { useActionState, useEffect, useRef, useState } from "react";

type FieldOption = { value: string; label: string };

export type SettingsField = {
  name: string;
  label: string;
  type?: "text" | "email" | "url" | "number" | "select" | "checkbox" | "textarea";
  hint?: string;
  placeholder?: string;
  options?: FieldOption[];
  defaultValue?: string | number | boolean | null;
  required?: boolean;
  wide?: boolean;
  min?: number;
  max?: number;
  step?: number;
};

export type SettingsSection = {
  eyebrow?: string;
  title: string;
  description?: string;
  fields: SettingsField[];
};

type ActionState = { error?: string; success?: boolean } | null;

export function SettingsForm({
  action,
  sections,
  submitLabel = "Save changes",
  cancelHref,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  sections: SettingsSection[];
  submitLabel?: string;
  cancelHref?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [dirty, setDirty] = useState(false);
  const [prevSuccess, setPrevSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const success = state?.success ?? false;

  if (success !== prevSuccess) {
    setPrevSuccess(success);
    if (success) setDirty(false);
  }

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  return (
    <form
      action={formAction}
      className="staff-editor-sections"
      onChange={() => setDirty(true)}
      ref={formRef}
    >
      {sections.map((section) => (
        <section className="staff-editor-section" key={section.title}>
          {section.eyebrow ? <p className="eyebrow">{section.eyebrow}</p> : null}
          <h2>{section.title}</h2>
          {section.description ? <p className="staff-section-description">{section.description}</p> : null}
          <div className="staff-form-grid">
            {section.fields.map((field) => {
              const wide = field.wide || field.type === "textarea" ? " staff-form-grid__wide" : "";
              if (field.type === "checkbox") {
                return (
                  <label className={`staff-catalog-check staff-form-grid__wide${wide}`} key={field.name}>
                    <input
                      defaultChecked={Boolean(field.defaultValue)}
                      name={field.name}
                      onChange={() => setDirty(true)}
                      type="checkbox"
                      value="true"
                    />
                    <span>
                      <strong>{field.label}</strong>
                      {field.hint ? <small>{field.hint}</small> : null}
                    </span>
                  </label>
                );
              }
              return (
                <label className={wide.trim() || undefined} key={field.name}>
                  <span>
                    {field.label}
                    {field.required ? null : <span className="staff-label-optional"> Optional</span>}
                  </span>
                  {field.type === "select" ? (
                    <select defaultValue={String(field.defaultValue ?? "")} name={field.name} required={field.required}>
                      {(field.options ?? []).map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea defaultValue={String(field.defaultValue ?? "")} name={field.name} placeholder={field.placeholder} rows={3} />
                  ) : (
                    <input
                      defaultValue={field.defaultValue == null ? "" : String(field.defaultValue)}
                      max={field.max}
                      min={field.min}
                      name={field.name}
                      placeholder={field.placeholder}
                      required={field.required}
                      step={field.step}
                      type={field.type === "number" ? "number" : field.type === "email" ? "email" : field.type === "url" ? "url" : "text"}
                    />
                  )}
                  {field.hint ? <small className="staff-field-hint">{field.hint}</small> : null}
                </label>
              );
            })}
          </div>
        </section>
      ))}
      {state?.error ? <p className="staff-form-message staff-form-message--error" role="alert">{state.error}</p> : null}
      {state?.success ? <p className="staff-form-message staff-form-message--success" role="status">Settings saved.</p> : null}
      <div className="staff-form-actions">
        {cancelHref ? <a className="btn btn-secondary" href={cancelHref}>Cancel</a> : null}
        <button className="btn" disabled={pending} type="submit">
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
