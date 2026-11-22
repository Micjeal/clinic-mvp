"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check, CircleAlert, ImagePlus, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { saveClinicianProfileAction } from "@/server/actions/staff-management.actions";
import { DOCTOR_PHOTO_ACCEPT, validateDoctorPhoto } from "@/features/staff/utils/clinician-profile";

type Profile = {
  display_name: string;
  professional_title: string | null;
  public_bio: string | null;
  photo_path: string | null;
  years_experience?: number | null;
  experience_summary?: string | null;
  languages?: string[] | null;
  is_public: boolean;
  accepting_appointments: boolean;
};

type Specialization = { id: string; name: string; description: string | null };
type Qualification = {
  id: string;
  qualification_type: string;
  qualification: string;
  institution: string;
  country: string | null;
  year: number | null;
};
type Achievement = {
  id: string;
  title: string;
  description: string | null;
  year: number | null;
};
type EditableSpec = { name: string; description: string };
type EditableQualification = {
  qualification_type: string;
  qualification: string;
  institution: string;
  country: string;
  year: string | number;
};
type EditableAchievement = { title: string; description: string; year: string | number };
type ActionState = { error?: string; success?: boolean; photoPath?: string | null } | null;

type ProfileSnapshot = {
  name: string;
  title: string;
  photoPath: string;
  bio: string;
  yearsExperience: string;
  experienceSummary: string;
  specs: EditableSpec[];
  quals: EditableQualification[];
  awards: EditableAchievement[];
  languages: string[];
};

type Props = {
  membershipId: string;
  profile: Profile | null;
  specializations: Specialization[];
  qualifications: Qualification[];
  achievements: Achievement[];
};

function initialSnapshot(
  profile: Profile | null,
  specializations: Specialization[],
  qualifications: Qualification[],
  achievements: Achievement[],
): ProfileSnapshot {
  return {
    name: profile?.display_name ?? "",
    title: profile?.professional_title ?? "",
    photoPath: profile?.photo_path ?? "",
    bio: profile?.public_bio ?? "",
    yearsExperience: profile?.years_experience?.toString() ?? "",
    experienceSummary: profile?.experience_summary ?? "",
    specs: specializations.map(({ name, description }) => ({
      name,
      description: description ?? "",
    })),
    quals: qualifications.map(
      ({ qualification_type, qualification, institution, country, year }) => ({
        qualification_type,
        qualification,
        institution,
        country: country ?? "",
        year: year ?? "",
      }),
    ),
    awards: achievements.map(({ title, description, year }) => ({
      title,
      description: description ?? "",
      year: year ?? "",
    })),
    languages: profile?.languages ?? [],
  };
}

export function PublicProfileEditor({
  membershipId,
  profile,
  specializations,
  qualifications,
  achievements,
}: Props) {
  const router = useRouter();
  const [result, setResult] = useState<ActionState>(null);
  const [isPending, startTransition] = useTransition();
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    initialSnapshot(profile, specializations, qualifications, achievements),
  );
  const [name, setName] = useState(savedSnapshot.name);
  const [title, setTitle] = useState(savedSnapshot.title);
  const [photoPath, setPhotoPath] = useState(savedSnapshot.photoPath);
  const [bio, setBio] = useState(savedSnapshot.bio);
  const [yearsExperience, setYearsExperience] = useState(savedSnapshot.yearsExperience);
  const [experienceSummary, setExperienceSummary] = useState(savedSnapshot.experienceSummary);
  const [specs, setSpecs] = useState<EditableSpec[]>(savedSnapshot.specs);
  const [quals, setQuals] = useState<EditableQualification[]>(savedSnapshot.quals);
  const [awards, setAwards] = useState<EditableAchievement[]>(savedSnapshot.awards);
  const [languages, setLanguages] = useState<string[]>(savedSnapshot.languages);
  const [language, setLanguage] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const previewObjectUrlRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
  }, []);

  const snapshotObject = useMemo<ProfileSnapshot>(
    () => ({
      name,
      title,
      photoPath,
      bio,
      yearsExperience,
      experienceSummary,
      specs,
      quals,
      awards,
      languages,
    }),
    [awards, bio, experienceSummary, languages, name, photoPath, quals, specs, title, yearsExperience],
  );
  const snapshot = JSON.stringify(snapshotObject);
  const dirty = snapshot !== JSON.stringify(savedSnapshot) || Boolean(selectedPhoto) || removePhoto;
  const previewPhoto = removePhoto ? null : localPreview || photoPath || null;
  const initials = name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "DR";

  function choosePhoto(file: File | null) {
    if (!file) return;
    const validationError = validateDoctorPhoto(file);
    if (validationError) {
      setPhotoError(validationError);
      return;
    }
    if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    previewObjectUrlRef.current = objectUrl;
    setLocalPreview(objectUrl);
    setPhotoError(null);
    setSelectedPhoto(file);
    setRemovePhoto(false);
  }

  function addLanguage() {
    const value = language.trim();
    if (
      value &&
      !languages.some((item) => item.toLocaleLowerCase() === value.toLocaleLowerCase())
    ) {
      setLanguages((items) => [...items, value]);
    }
    setLanguage("");
  }

  function reset() {
    setName(savedSnapshot.name);
    setTitle(savedSnapshot.title);
    setPhotoPath(savedSnapshot.photoPath);
    setBio(savedSnapshot.bio);
    setYearsExperience(savedSnapshot.yearsExperience);
    setExperienceSummary(savedSnapshot.experienceSummary);
    setSpecs(savedSnapshot.specs);
    setQuals(savedSnapshot.quals);
    setAwards(savedSnapshot.awards);
    setLanguages(savedSnapshot.languages);
    if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
    previewObjectUrlRef.current = null;
    setLocalPreview(null);
    setSelectedPhoto(null);
    setRemovePhoto(false);
    setPhotoError(null);
  }

  function submit(formData: FormData) {
    const submitted = snapshotObject;
    if (selectedPhoto) formData.set("doctor_photo", selectedPhoto);
    if (removePhoto) formData.set("remove_photo", "on");
    startTransition(async () => {
      try {
        const nextResult = await saveClinicianProfileAction(null, formData);
        setResult(nextResult);
        if (nextResult.success) {
          const savedPhotoPath = nextResult.photoPath ?? null;
          setPhotoPath(savedPhotoPath ?? "");
          if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
          previewObjectUrlRef.current = null;
          setLocalPreview(null);
          setSelectedPhoto(null);
          setRemovePhoto(false);
          setSavedSnapshot({ ...submitted, photoPath: savedPhotoPath ?? "" });
          router.refresh();
        }
      } catch {
        setResult({ error: "We couldn't save the clinician profile." });
      }
    });
  }

  return (
    <div className="doctor-profile-editor">
      <header className="staff-editor-heading doctor-section-heading">
        <p className="doctor-section-kicker">02 · Public profile</p>
        <h2>Professional profile</h2>
        <p>Manage the verified information patients see on the hospital website.</p>
      </header>

      <form action={submit}>
        <input name="membership_id" type="hidden" value={membershipId} />

        <section className="profile-editor-section">
          <div className="staff-editor-section-heading">
            <h3>Profile identity</h3>
            <p>Use verified identity and professional information.</p>
          </div>
          <div className="staff-form-grid">
            <label>
              Display name
              <input name="display_name" onChange={(event) => setName(event.target.value)} required value={name} />
            </label>
            <label>
              Professional title
              <small className="form-help">Shown beneath the Doctor&apos;s name.</small>
              <input name="professional_title" onChange={(event) => setTitle(event.target.value)} required value={title} />
            </label>
            <div className="profile-editor-wide doctor-photo-field">
              <span className="doctor-photo-field__label">Doctor photo</span>
              <div className="doctor-photo-editor">
                <div className="doctor-photo-preview" aria-label="Doctor photo preview">
                  {previewPhoto ? <img alt={`${name || "Doctor"} preview`} src={previewPhoto} /> : <span>{initials}</span>}
                </div>
                <div
                  className={`doctor-photo-dropzone${isDraggingPhoto ? " is-dragging" : ""}`}
                  onDragEnter={(event) => { event.preventDefault(); setIsDraggingPhoto(true); }}
                  onDragLeave={(event) => { event.preventDefault(); setIsDraggingPhoto(false); }}
                  onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; setIsDraggingPhoto(true); }}
                  onDrop={(event) => { event.preventDefault(); setIsDraggingPhoto(false); choosePhoto(event.dataTransfer.files[0] ?? null); }}
                >
                  <Upload aria-hidden="true" />
                  <strong>{isDraggingPhoto ? "Drop image to upload" : "Drop Doctor photo here"}</strong>
                  <span>or</span>
                  <button className="btn btn--secondary" disabled={isPending} onClick={() => photoInputRef.current?.click()} type="button">
                    <ImagePlus aria-hidden="true" /> {previewPhoto ? "Replace image" : "Select image"}
                  </button>
                  <small>JPG, PNG or WebP · maximum 5 MB</small>
                  <input
                    accept={DOCTOR_PHOTO_ACCEPT}
                    className="doctor-photo-input"
                    onChange={(event) => choosePhoto(event.target.files?.[0] ?? null)}
                    ref={photoInputRef}
                    type="file"
                  />
                </div>
              </div>
              {previewPhoto ? <button className="doctor-photo-remove" disabled={isPending} onClick={() => { if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current); previewObjectUrlRef.current = null; setLocalPreview(null); setSelectedPhoto(null); setRemovePhoto(Boolean(photoPath)); setPhotoError(null); }} type="button"><Trash2 aria-hidden="true" /> Remove image</button> : null}
              {photoError ? <small className="error" role="alert">{photoError}</small> : null}
            </div>
          </div>
        </section>

        <section className="profile-editor-section">
          <div className="staff-editor-section-heading">
            <h3>Professional background</h3>
            <p>Give patients a concise overview of clinical background and care focus.</p>
          </div>
          <label>
            Biography
            <textarea maxLength={2000} name="public_bio" onChange={(event) => setBio(event.target.value)} rows={5} value={bio} />
          </label>
        </section>

        <section className="profile-editor-section">
          <div className="profile-editor-section__heading">
            <div className="staff-editor-section-heading">
              <h3>Areas of specialization</h3>
              <p>Keep department placement separate from clinical expertise.</p>
            </div>
            <button className="staff-table-action" onClick={() => setSpecs((items) => [...items, { name: "", description: "" }])} type="button">+ Add specialization</button>
          </div>
          {specs.length ? (
            <div className="profile-repeat-list">
              {specs.map((item, index) => (
                <div className="profile-repeat-row" key={`spec-${index}`}>
                  <div className="profile-repeat-fields">
                    <label>
                      Specialization
                      <input aria-label={`Specialization ${index + 1}`} onChange={(event) => setSpecs((items) => items.map((entry, itemIndex) => itemIndex === index ? { ...entry, name: event.target.value } : entry))} value={item.name} />
                    </label>
                    <label>
                      Description
                      <input aria-label={`Specialization explanation ${index + 1}`} onChange={(event) => setSpecs((items) => items.map((entry, itemIndex) => itemIndex === index ? { ...entry, description: event.target.value } : entry))} value={item.description} />
                    </label>
                  </div>
                  <button className="btn btn--secondary" onClick={() => setSpecs((items) => items.filter((_, itemIndex) => itemIndex !== index))} type="button">Remove</button>
                </div>
              ))}
            </div>
          ) : <p className="doctor-empty-inline">No specializations added yet.</p>}
        </section>

        <section className="profile-editor-section">
          <div className="profile-editor-section__heading">
            <div className="staff-editor-section-heading">
              <h3>Professional qualifications</h3>
              <p>Add verified qualifications as compact entries.</p>
            </div>
            <button className="staff-table-action" onClick={() => setQuals((items) => [...items, { qualification_type: "Degree", qualification: "", institution: "", country: "", year: "" }])} type="button">+ Add qualification</button>
          </div>
          {quals.length ? (
            <div className="profile-repeat-list">
              {quals.map((item, index) => (
                <div className="profile-repeat-row profile-repeat-row--qualification" key={`qual-${index}`}>
                  <div className="profile-repeat-fields">
                    <label>
                      Type
                      <select aria-label={`Qualification type ${index + 1}`} onChange={(event) => setQuals((items) => items.map((entry, itemIndex) => itemIndex === index ? { ...entry, qualification_type: event.target.value } : entry))} value={item.qualification_type}>
                        {["Degree", "Masters", "Residency", "Fellowship", "Certification", "Other"].map((option) => <option key={option}>{option}</option>)}
                      </select>
                    </label>
                    <label>
                      Qualification
                      <input aria-label={`Qualification ${index + 1}`} onChange={(event) => setQuals((items) => items.map((entry, itemIndex) => itemIndex === index ? { ...entry, qualification: event.target.value } : entry))} value={item.qualification} />
                    </label>
                    <label>
                      Institution
                      <input aria-label={`Institution ${index + 1}`} onChange={(event) => setQuals((items) => items.map((entry, itemIndex) => itemIndex === index ? { ...entry, institution: event.target.value } : entry))} value={item.institution} />
                    </label>
                    <label>
                      Country
                      <input aria-label={`Qualification country ${index + 1}`} onChange={(event) => setQuals((items) => items.map((entry, itemIndex) => itemIndex === index ? { ...entry, country: event.target.value } : entry))} value={item.country} />
                    </label>
                    <label>
                      Year
                      <input aria-label={`Qualification year ${index + 1}`} inputMode="numeric" onChange={(event) => setQuals((items) => items.map((entry, itemIndex) => itemIndex === index ? { ...entry, year: event.target.value } : entry))} value={item.year} />
                    </label>
                  </div>
                  <button className="btn btn--secondary" onClick={() => setQuals((items) => items.filter((_, itemIndex) => itemIndex !== index))} type="button">Remove</button>
                </div>
              ))}
            </div>
          ) : <p className="doctor-empty-inline">No qualifications added yet.</p>}
        </section>

        <section className="profile-editor-section">
          <div className="staff-editor-section-heading">
            <h3>Experience</h3>
            <p>Only add verified professional details.</p>
          </div>
          <div className="staff-form-grid">
            <label>
              Years of practice
              <input inputMode="numeric" max="100" min="0" name="years_experience" onChange={(event) => setYearsExperience(event.target.value)} type="number" value={yearsExperience} />
            </label>
            <label className="profile-editor-wide">
              Experience summary
              <textarea maxLength={1200} name="experience_summary" onChange={(event) => setExperienceSummary(event.target.value)} rows={3} value={experienceSummary} />
            </label>
          </div>
        </section>

        <section className="profile-editor-section">
          <div className="profile-editor-section__heading">
            <div className="staff-editor-section-heading">
              <h3>Professional achievements</h3>
              <p>Only include verified achievements.</p>
            </div>
            <button className="staff-table-action" onClick={() => setAwards((items) => [...items, { title: "", description: "", year: "" }])} type="button">+ Add achievement</button>
          </div>
          {awards.length ? (
            <div className="profile-repeat-list">
              {awards.map((item, index) => (
                <div className="profile-repeat-row" key={`achievement-${index}`}>
                  <div className="profile-repeat-fields">
                    <label>
                      Achievement
                      <input aria-label={`Achievement ${index + 1}`} onChange={(event) => setAwards((items) => items.map((entry, itemIndex) => itemIndex === index ? { ...entry, title: event.target.value } : entry))} value={item.title} />
                    </label>
                    <label>
                      Description
                      <input aria-label={`Achievement description ${index + 1}`} onChange={(event) => setAwards((items) => items.map((entry, itemIndex) => itemIndex === index ? { ...entry, description: event.target.value } : entry))} value={item.description} />
                    </label>
                    <label>
                      Year
                      <input aria-label={`Achievement year ${index + 1}`} inputMode="numeric" onChange={(event) => setAwards((items) => items.map((entry, itemIndex) => itemIndex === index ? { ...entry, year: event.target.value } : entry))} value={item.year} />
                    </label>
                  </div>
                  <button className="btn btn--secondary" onClick={() => setAwards((items) => items.filter((_, itemIndex) => itemIndex !== index))} type="button">Remove</button>
                </div>
              ))}
            </div>
          ) : <p className="doctor-empty-inline">No achievements added yet.</p>}
        </section>

        <section className="profile-editor-section">
          <div className="staff-editor-section-heading">
            <h3>Languages</h3>
            <p>Languages shown on the public profile.</p>
          </div>
          <div className="profile-language-chips">
            {languages.map((item) => (
              <button aria-label={`Remove ${item}`} className="profile-language-chip" key={item} onClick={() => setLanguages((items) => items.filter((value) => value !== item))} type="button">{item} ×</button>
            ))}
            {!languages.length ? <span className="form-help">No languages added.</span> : null}
          </div>
          <div className="profile-language-add">
            <input aria-label="Add language" onChange={(event) => setLanguage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addLanguage(); } }} placeholder="Add a language" value={language} />
            <button className="btn btn--secondary" onClick={addLanguage} type="button">+ Add language</button>
          </div>
        </section>

        <input name="languages_json" type="hidden" value={JSON.stringify(languages)} />
        <input name="specializations_json" type="hidden" value={JSON.stringify(specs)} />
        <input name="qualifications_json" type="hidden" value={JSON.stringify(quals)} />
        <input name="achievements_json" type="hidden" value={JSON.stringify(awards)} />

        {dirty || result ? (
          <footer className={`clinical-save-footer${dirty ? " is-dirty" : ""}`}>
            <div aria-live="polite" className="clinical-save-status">
              {result?.error ? (
                <div className="clinical-feedback is-error" role="alert"><CircleAlert aria-hidden="true" /><span><strong>We couldn&apos;t save the profile.</strong><small>{result.error}</small></span></div>
              ) : dirty ? (
                <div className="clinical-feedback is-dirty"><span aria-hidden="true" className="clinical-unsaved-dot" /><span><strong>Unsaved profile changes</strong><small>Publishing controls are saved separately.</small></span></div>
              ) : result?.success ? (
                <div className="clinical-feedback is-success" role="status"><Check aria-hidden="true" /><strong>Profile updated.</strong></div>
              ) : null}
            </div>
            {dirty ? <div className="clinical-save-actions"><button className="btn btn--secondary" disabled={isPending} onClick={reset} type="button">Discard</button><button className="btn" disabled={isPending} type="submit">{isPending ? "Saving…" : "Save profile"}</button></div> : null}
          </footer>
        ) : null}
      </form>
    </div>
  );
}
