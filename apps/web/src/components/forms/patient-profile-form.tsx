"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { updatePatientProfileAction } from "@/server/actions/patient-profile.actions";

function Submit() {
  const { pending } = useFormStatus();
  return <button className="btn auth-submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>;
}

export default function PatientProfileForm({ patient }: { patient: any }) {
  const [state, action] = useActionState(updatePatientProfileAction, null);
  return (
    <form action={action} className="auth-form">
      <div className="form-grid">
        <label>First name<input autoComplete="given-name" defaultValue={patient.first_name} name="first_name" required /></label>
        <label>Middle name<input autoComplete="additional-name" defaultValue={patient.middle_name || ""} name="middle_name" /></label>
        <label>Last name<input autoComplete="family-name" defaultValue={patient.last_name} name="last_name" required /></label>
      </div>
      <div className="form-grid">
        <label>Phone<input autoComplete="tel" defaultValue={patient.phone || ""} name="phone" /></label>
        <label>Email<input autoComplete="email" defaultValue={patient.email || ""} name="email" type="email" /></label>
      </div>
      <div className="form-grid">
        <label>Date of birth<input autoComplete="bday" defaultValue={patient.date_of_birth || ""} name="date_of_birth" type="date" /></label>
        <label>Sex
          <select defaultValue={patient.sex || ""} name="sex">
            <option value="">Select</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="intersex">Intersex</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
      </div>
      <label>Address<input autoComplete="street-address" defaultValue={patient.address_line || ""} name="address_line" /></label>
      <div className="form-grid">
        <label>City<input autoComplete="address-level2" defaultValue={patient.city || ""} name="city" /></label>
        <label>District<input autoComplete="address-level3" defaultValue={patient.district || ""} name="district" /></label>
      </div>
      <div className="form-grid">
        <label>Emergency contact name<input autoComplete="off" defaultValue={patient.emergency_contact_name || ""} name="emergency_contact_name" /></label>
        <label>Emergency contact phone<input autoComplete="off" defaultValue={patient.emergency_contact_phone || ""} name="emergency_contact_phone" /></label>
      </div>
      {state?.error ? <p className="error" role="alert">{state.error}</p> : null}
      {state?.success ? <p className="success" role="status">{state.success}</p> : null}
      <Submit />
    </form>
  );
}
