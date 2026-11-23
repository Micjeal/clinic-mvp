"use client";

import {Pencil} from "lucide-react";
import {useState} from "react";

import PatientProfileForm from "@/components/forms/patient-profile-form";

type PatientProfile = {
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  patient_number?: string | null;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  sex: string | null;
  address_line: string | null;
  city: string | null;
  district: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
};

function display(value: string | null | undefined) {
  return value?.trim() ? value : "Not provided";
}

function formatDateOfBirth(value: string | null | undefined) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${Number(match[3])} ${months[Number(match[2]) - 1]} ${match[1]}`;
}

function capitalize(value: string | null | undefined) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function Field({label, value, wide = false}: { label: string; value: string | null | undefined; wide?: boolean }) {
  return (
    <div className={wide ? "patient-profile-field--wide" : undefined}>
      <dt>{label}</dt>
      <dd className={value?.trim() ? undefined : "is-empty"}>{display(value)}</dd>
    </div>
  );
}

export function PatientProfileSection({ patient }: { patient: PatientProfile }) {
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fullName = [patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(" ");
  const address = [patient.address_line, patient.city, patient.district].filter(Boolean).join(", ");

  return (
    <section aria-labelledby="profile-title" className="patient-profile-card">
      <div className="patient-profile-card__heading">
        <div>
          <p className="eyebrow">Patient information</p>
          <h2 id="profile-title">{editing ? "Edit profile" : "Your details"}</h2>
        </div>
        {editing
          ? <button className="btn btn--secondary" onClick={() => setEditing(false)} type="button">Cancel</button>
          : <button className="btn btn--secondary" onClick={() => { setNotice(null); setEditing(true); }} type="button"><Pencil aria-hidden="true" />Edit profile</button>}
      </div>
      {editing ? (
        <PatientProfileForm onSaved={() => { setEditing(false); setNotice("Profile updated successfully."); }} patient={patient} />
      ) : (
        <>
          {notice ? <p className="success" role="status">{notice}</p> : null}
          <dl>
            <Field label="Full name" value={fullName} />
            <Field label="Patient number" value={patient.patient_number} />
            <Field label="Phone" value={patient.phone} />
            <Field label="Email" value={patient.email} />
            <Field label="Date of birth" value={formatDateOfBirth(patient.date_of_birth)} />
            <Field label="Sex" value={capitalize(patient.sex)} />
            <Field label="Address" value={address} wide />
            <Field label="Emergency contact" value={patient.emergency_contact_name} />
            <Field label="Emergency contact phone" value={patient.emergency_contact_phone} />
          </dl>
        </>
      )}
    </section>
  );
}
