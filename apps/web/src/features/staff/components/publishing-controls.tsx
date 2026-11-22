"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, CircleAlert, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveClinicianPublishingAction } from "@/server/actions/staff-management.actions";

type Profile = {
  slug?: string | null;
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

type Props = {
  membershipId: string;
  profile: Profile | null;
  departmentCount: number;
  serviceCount: number;
  hasAvailability: boolean;
};

type ActionState = { error?: string; success?: boolean; missingRequirements?: string[] } | null;

export function PublishingControls({
  membershipId,
  profile,
  departmentCount,
  serviceCount,
  hasAvailability,
}: Props) {
  const router = useRouter();
  const [result, setResult] = useState<ActionState>(null);
  const [isPending, startTransition] = useTransition();
  const [published, setPublished] = useState(profile?.is_public ?? false);
  const [accepting, setAccepting] = useState(profile?.accepting_appointments ?? false);
  const [savedState, setSavedState] = useState({
    published: profile?.is_public ?? false,
    accepting: profile?.accepting_appointments ?? false,
  });
  const currentState = useMemo(
    () => JSON.stringify({ published, accepting }),
    [accepting, published],
  );
  const dirty = currentState !== JSON.stringify(savedState);
  const profileReady = Boolean(
    profile?.display_name.trim() && profile.professional_title?.trim() && departmentCount,
  );
  const bookingReady = Boolean(profileReady && serviceCount && hasAvailability);

  function discard() {
    setPublished(savedState.published);
    setAccepting(savedState.accepting);
  }

  function submit(formData: FormData) {
    const next = { published, accepting };
    startTransition(async () => {
      try {
        const nextResult = await saveClinicianPublishingAction(null, formData);
        setResult(nextResult);
        if (nextResult.success) {
          setSavedState(next);
          router.refresh();
        }
      } catch {
        setResult({ error: "We couldn't update publishing." });
      }
    });
  }

  return (
    <div className="doctor-publishing-editor">
      <header className="doctor-section-heading">
        <p className="doctor-section-kicker">05 · Website &amp; online booking</p>
        <h2>Visibility and booking</h2>
        <p>
          Website visibility and online booking are separate states. A published Doctor can remain
          visible while online booking is paused.
        </p>
      </header>

      <form action={submit}>
        <input name="membership_id" type="hidden" value={membershipId} />

        <div className="doctor-publishing-controls">
          <label className="doctor-switch-row">
            <input
              checked={published}
              disabled={isPending}
              name="is_public"
              onChange={(event) => {
                setPublished(event.target.checked);
                if (!event.target.checked) setAccepting(false);
              }}
              type="checkbox"
            />
            <span>
              <strong>Show Doctor on website</strong>
              <small>Makes the public profile visible in the Doctor directory.</small>
            </span>
            <em>{published ? "Published" : "Hidden"}</em>
          </label>

          <label className="doctor-switch-row">
            <input
              checked={accepting}
              disabled={isPending}
              name="accepting_appointments"
              onChange={(event) => setAccepting(event.target.checked)}
              type="checkbox"
            />
            <span>
              <strong>Accept online appointments</strong>
              <small>Allows patients to see available times and submit appointment requests.</small>
            </span>
            <em>{accepting ? "Enabled" : "Paused"}</em>
          </label>
        </div>

        {!bookingReady ? (
          <div className="doctor-publishing-requirements" aria-label="Online booking requirements">
            <p>Online booking requires:</p>
            <ul>
              <li className={profileReady ? "is-complete" : ""}>Completed public profile</li>
              <li className={serviceCount ? "is-complete" : ""}>At least one service</li>
              <li className={hasAvailability ? "is-complete" : ""}>Weekly availability</li>
            </ul>
          </div>
        ) : null}

        {profile?.slug ? (
          <Link className="doctor-publishing-preview" href={`/doctors/${profile.slug}`} target="_blank">
            Preview public profile
            <ExternalLink aria-hidden="true" />
          </Link>
        ) : null}

        {dirty || result ? (
          <footer className={`clinical-save-footer${dirty ? " is-dirty" : ""}`}>
            <div aria-live="polite" className="clinical-save-status">
              {result?.error ? (
                <div className="clinical-feedback is-error" role="alert">
                  <CircleAlert aria-hidden="true" />
                  <span>
                    <strong>{result.error}</strong>
                    {result.missingRequirements?.length ? (
                      <small>Complete: {result.missingRequirements.join(", ")}.</small>
                    ) : <small>Review the requirements and try again.</small>}
                  </span>
                </div>
              ) : dirty ? (
                <div className="clinical-feedback is-dirty">
                  <span aria-hidden="true" className="clinical-unsaved-dot" />
                  <span>
                    <strong>Unsaved publishing changes</strong>
                    <small>Profile edits are saved separately.</small>
                  </span>
                </div>
              ) : result?.success ? (
                <div className="clinical-feedback is-success" role="status">
                  <Check aria-hidden="true" />
                  <strong>Publishing updated.</strong>
                </div>
              ) : null}
            </div>
            {dirty ? (
              <div className="clinical-save-actions">
                <button className="btn btn--secondary" disabled={isPending} onClick={discard} type="button">
                  Discard
                </button>
                <button className="btn" disabled={isPending} type="submit">
                  {isPending ? "Saving…" : "Save publishing"}
                </button>
              </div>
            ) : null}
          </footer>
        ) : null}
      </form>
    </div>
  );
}
