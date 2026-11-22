const steps = [
  "Choose your care location",
  "Select a department and service",
  "Choose a preferred date and time",
  "Sign in or provide patient details",
  "Clinic reviews your request",
  "Track it from your patient portal",
] as const;

export function PatientJourney() {
  return (
    <section className="section" aria-labelledby="journey-title">
      <div className="site-container">
        <div className="section-heading section-heading--center"><p className="eyebrow">Your patient journey</p><h2 id="journey-title">From care discovery to request tracking.</h2><p>Submitting a preferred time creates an appointment request. It is not a confirmed booking until the clinic reviews and confirms it.</p></div>
        <ol className="journey-grid">{steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><p>{step}</p></li>)}</ol>
      </div>
    </section>
  );
}
