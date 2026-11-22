"use client";

import { Check, CircleAlert, Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { DepartmentIcon } from "@/components/ui/department-icon";
import {
  addClinicalDepartment,
  clinicalSelectionKey,
  makeClinicalDepartmentPrimary,
  removeClinicalDepartment,
  toggleClinicalService,
} from "@/features/staff/utils/clinical-setup";
import { saveClinicianAssignmentsAction } from "@/server/actions/staff-management.actions";

type ActionState = { error?: string; success?: boolean; warning?: string } | null;
type Department = { id: string; name: string; description: string | null };
type Service = {
  id: string;
  name: string;
  description: string | null;
  department_id: string | null;
  duration_minutes: number | null;
};

type Props = {
  membershipId: string;
  initialDepartmentIds: string[];
  initialServiceIds: string[];
  departments: Department[];
  services: Service[];
};

const unsafeDescriptionPattern = /\b(test|placeholder|lorem|sample|demo|dummy|tbd)\b/i;

function safeDescription(description: string | null) {
  if (!description?.trim() || unsafeDescriptionPattern.test(description)) return null;
  return description.trim();
}

export function ClinicalSetupEditor({
  membershipId,
  initialDepartmentIds,
  initialServiceIds,
  departments,
  services,
}: Props) {
  const router = useRouter();
  const [departmentIds, setDepartmentIds] = useState(initialDepartmentIds);
  const [serviceIds, setServiceIds] = useState(initialServiceIds);
  const [savedSelection, setSavedSelection] = useState({
    departmentIds: initialDepartmentIds,
    serviceIds: initialServiceIds,
  });
  const [result, setResult] = useState<ActionState>(null);
  const [search, setSearch] = useState("");
  const [pendingDepartmentIds, setPendingDepartmentIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const assignButtonRef = useRef<HTMLButtonElement>(null);

  const assignedDepartments = useMemo(
    () =>
      departmentIds
        .map((id) => departments.find((department) => department.id === id))
        .filter((department): department is Department => Boolean(department)),
    [departmentIds, departments],
  );
  const filteredDepartments = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return departments.filter(
      (department) => !query || department.name.toLocaleLowerCase().includes(query),
    );
  }, [departments, search]);
  const sharedServices = services.filter((service) => !service.department_id);
  const eligibleServices = services.filter(
    (service) => !service.department_id || departmentIds.includes(service.department_id),
  );
  const dirty =
    clinicalSelectionKey(departmentIds, serviceIds) !==
    clinicalSelectionKey(savedSelection.departmentIds, savedSelection.serviceIds);

  function clearFeedback() {
    if (result) setResult(null);
  }

  function openDepartmentDialog() {
    setSearch("");
    setPendingDepartmentIds([]);
    dialogRef.current?.showModal();
    window.setTimeout(() => searchRef.current?.focus(), 0);
  }

  function closeDepartmentDialog() {
    setPendingDepartmentIds([]);
    dialogRef.current?.close();
  }

  function togglePendingDepartment(departmentId: string, checked: boolean) {
    setPendingDepartmentIds((current) =>
      checked
        ? addClinicalDepartment(current, departmentId)
        : current.filter((id) => id !== departmentId),
    );
  }

  function assignSelectedDepartments() {
    if (!pendingDepartmentIds.length) return;
    clearFeedback();
    setDepartmentIds((current) =>
      pendingDepartmentIds.reduce(
        (assigned, departmentId) => addClinicalDepartment(assigned, departmentId),
        current,
      ),
    );
    closeDepartmentDialog();
  }

  function makePrimary(departmentId: string) {
    clearFeedback();
    setDepartmentIds((current) => makeClinicalDepartmentPrimary(current, departmentId));
  }

  function removeDepartment(departmentId: string) {
    clearFeedback();
    const next = removeClinicalDepartment(departmentIds, serviceIds, departmentId, services);
    setDepartmentIds(next.departmentIds);
    setServiceIds(next.serviceIds);
  }

  function updateService(serviceId: string, checked: boolean) {
    clearFeedback();
    setServiceIds((current) => toggleClinicalService(current, serviceId, checked));
  }

  function discardChanges() {
    setDepartmentIds(savedSelection.departmentIds);
    setServiceIds(savedSelection.serviceIds);
    setResult(null);
  }

  function submit(formData: FormData) {
    const submittedDepartments = [...departmentIds];
    const submittedServices = [...serviceIds];
    startTransition(async () => {
      try {
        const nextResult = await saveClinicianAssignmentsAction(null, formData);
        setResult(nextResult);
        if (nextResult.success) {
          setSavedSelection({
            departmentIds: submittedDepartments,
            serviceIds: submittedServices,
          });
          router.refresh();
        }
      } catch {
        setResult({ error: "Clinical setup update failed." });
      }
    });
  }

  return (
    <section className="staff-panel doctor-work-panel clinical-setup-editor">
      <header className="clinical-setup-heading">
        <p className="doctor-section-kicker">01 · Clinical assignment</p>
        <h2>Departments &amp; bookable services</h2>
        <p>
          Configure where this Doctor practices and which services patients can request when booking
          an appointment.
        </p>
      </header>

      <form action={submit}>
        <input name="membership_id" type="hidden" value={membershipId} />
        <input name="department_ids" type="hidden" value={JSON.stringify(departmentIds)} />
        <input name="service_ids" type="hidden" value={JSON.stringify(serviceIds)} />

        <section aria-labelledby="clinical-departments-title" className="clinical-editor-section">
          <div className="clinical-section-heading">
            <div>
              <h3 id="clinical-departments-title">Departments</h3>
            </div>
            <button
              className="btn btn--secondary btn--compact clinical-assign-button"
              disabled={departmentIds.length === departments.length}
              onClick={openDepartmentDialog}
              ref={assignButtonRef}
              type="button"
            >
              <Plus aria-hidden="true" />
              {departmentIds.length === departments.length && departments.length
                ? "All departments assigned"
                : "Assign department"}
            </button>
          </div>

          {assignedDepartments.length ? (
            <div className="clinical-department-list" role="list">
              {assignedDepartments.map((department, index) => (
                <article className="clinical-department-row" key={department.id} role="listitem">
                  <span className="clinical-department-icon">
                    <DepartmentIcon name={department.name} />
                  </span>
                  <div className="clinical-department-copy">
                    <div className="clinical-department-name">
                      <strong>{department.name}</strong>
                      {index === 0 ? (
                        <span aria-label="Primary department" className="clinical-primary-status">
                          Primary
                        </span>
                      ) : null}
                    </div>
                    {department.description ? <p>{department.description}</p> : null}
                  </div>
                  <div className="clinical-department-actions">
                    {index > 0 ? (
                      <button
                        className="staff-table-action"
                        onClick={() => makePrimary(department.id)}
                        type="button"
                      >
                        Make primary
                      </button>
                    ) : null}
                    <button
                      className="staff-table-action clinical-remove-action"
                      onClick={() => removeDepartment(department.id)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="doctor-empty-inline clinical-empty-state">
              <strong>No departments assigned</strong>
              <small>Assign a department before choosing bookable services.</small>
            </div>
          )}
        </section>

        <section
          aria-labelledby="clinical-services-title"
          className="clinical-editor-section clinical-services-section"
        >
          <div className="clinical-section-heading">
            <div>
              <h3 id="clinical-services-title">Bookable services</h3>
              <p>
                Select which services patients can request with this Doctor. Only services from
                assigned departments are shown.
              </p>
            </div>
            <span>
              {eligibleServices.length} service{eligibleServices.length === 1 ? "" : "s"} available
            </span>
          </div>

          {!departmentIds.length ? (
            <div className="doctor-empty-inline clinical-empty-state">
              <strong>Assign a department first</strong>
              <small>Compatible services will appear here.</small>
            </div>
          ) : (
            <div className="clinical-service-groups">
              {assignedDepartments.map((department) => {
                const departmentServices = services.filter(
                  (service) => service.department_id === department.id,
                );
                return (
                  <fieldset className="clinical-service-group" key={department.id}>
                    <legend>{department.name}</legend>
                    {departmentServices.length ? (
                      <div className="clinical-service-list">
                        {departmentServices.map((service) => {
                          const description = safeDescription(service.description);
                          return (
                            <label className="clinical-service-row" key={service.id}>
                              <input
                                checked={serviceIds.includes(service.id)}
                                onChange={(event) =>
                                  updateService(service.id, event.target.checked)
                                }
                                type="checkbox"
                                value={service.id}
                              />
                              <span className="clinical-service-copy">
                                <strong>{service.name}</strong>
                                {description ? <small>{description}</small> : null}
                              </span>
                              {service.duration_minutes ? (
                                <span className="clinical-service-duration">
                                  {service.duration_minutes} minutes
                                </span>
                              ) : null}
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="form-help">No bookable services are configured for this department.</p>
                    )}
                  </fieldset>
                );
              })}
              {sharedServices.length ? (
                <fieldset className="clinical-service-group">
                  <legend>General services</legend>
                  <div className="clinical-service-list">
                    {sharedServices.map((service) => {
                      const description = safeDescription(service.description);
                      return (
                        <label className="clinical-service-row" key={service.id}>
                          <input
                            checked={serviceIds.includes(service.id)}
                            onChange={(event) => updateService(service.id, event.target.checked)}
                            type="checkbox"
                            value={service.id}
                          />
                          <span className="clinical-service-copy">
                            <strong>{service.name}</strong>
                            {description ? <small>{description}</small> : null}
                          </span>
                          {service.duration_minutes ? (
                            <span className="clinical-service-duration">
                              {service.duration_minutes} minutes
                            </span>
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ) : null}
            </div>
          )}
        </section>

        {dirty || result ? (
          <footer className={`clinical-save-footer${dirty ? " is-dirty" : ""}`}>
            <div aria-live="polite" className="clinical-save-status">
              {result?.error ? (
                <div className="clinical-feedback is-error" role="alert">
                  <CircleAlert aria-hidden="true" />
                  <span>
                    <strong>We couldn&apos;t update the clinical setup.</strong>
                    <small>Please review the selected departments and services.</small>
                  </span>
                </div>
              ) : result?.success && !dirty ? (
                <div className="clinical-feedback is-success" role="status">
                  <Check aria-hidden="true" />
                  <strong>Clinical setup updated.</strong>
                </div>
              ) : dirty ? (
                <div className="clinical-feedback is-dirty">
                  <span aria-hidden="true" className="clinical-unsaved-dot" />
                  <span>
                    <strong>Unsaved changes</strong>
                    <small>Your changes will apply to patient booking eligibility after saving.</small>
                  </span>
                </div>
              ) : null}
            </div>
            {dirty ? (
              <div className="clinical-save-actions">
                <button
                  className="btn btn--secondary"
                  disabled={isPending}
                  onClick={discardChanges}
                  type="button"
                >
                  Discard
                </button>
                <button className="btn" disabled={isPending} type="submit">
                  {isPending ? "Saving…" : "Save clinical setup"}
                </button>
              </div>
            ) : null}
          </footer>
        ) : null}
      </form>

      <dialog
        aria-describedby="department-dialog-description"
        aria-labelledby="department-dialog-title"
        className="clinical-department-dialog"
        onCancel={() => setPendingDepartmentIds([])}
        onClose={() => {
          setSearch("");
          setPendingDepartmentIds([]);
          window.requestAnimationFrame(() => assignButtonRef.current?.focus());
        }}
        ref={dialogRef}
      >
        <div className="clinical-dialog-heading">
          <div>
            <h2 id="department-dialog-title">Assign department</h2>
            <p id="department-dialog-description">
              Select one or more departments available to this organization.
            </p>
          </div>
          <button
            aria-label="Close department dialog"
            className="clinical-dialog-close"
            onClick={closeDepartmentDialog}
            type="button"
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <label className="clinical-department-search">
          <span className="sr-only">Search departments</span>
          <span className="clinical-search-field">
            <Search aria-hidden="true" />
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search departments…"
              ref={searchRef}
              type="search"
              value={search}
            />
          </span>
        </label>
        <div className="clinical-dialog-list">
          {filteredDepartments.length ? (
            filteredDepartments.map((department) => {
              const assigned = departmentIds.includes(department.id);
              return (
                <label className={assigned ? "is-assigned" : ""} key={department.id}>
                  <input
                    checked={assigned || pendingDepartmentIds.includes(department.id)}
                    disabled={assigned}
                    onChange={(event) =>
                      togglePendingDepartment(department.id, event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span>{department.name}</span>
                  {assigned ? <small>Assigned</small> : null}
                </label>
              );
            })
          ) : (
            <p className="clinical-dialog-empty">No departments match your search.</p>
          )}
        </div>
        <div className="clinical-dialog-actions">
          <button className="btn btn--secondary" onClick={closeDepartmentDialog} type="button">
            Cancel
          </button>
          <button
            className="btn"
            disabled={!pendingDepartmentIds.length}
            onClick={assignSelectedDepartments}
            type="button"
          >
            Assign selected
          </button>
        </div>
      </dialog>
    </section>
  );
}
