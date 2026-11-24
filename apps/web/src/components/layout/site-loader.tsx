export function SiteLoader({ label = "Loading…", compact = false }: { label?: string; compact?: boolean }) {
  return (
    <div className={`site-loader${compact ? " site-loader--compact" : ""}`} role="status" aria-label={label}>
      <div className="site-loader__stage">
        <span className="site-loader__orbit site-loader__orbit--1" aria-hidden="true" />
        <span className="site-loader__orbit site-loader__orbit--2" aria-hidden="true" />
        <span className="site-loader__orbit site-loader__orbit--3" aria-hidden="true" />
        <span className="site-loader__pulse" aria-hidden="true" />
        <span className="site-loader__cross" aria-hidden="true"><i /><i /></span>
      </div>
      <p className="site-loader__text">{label}</p>
      <div className="site-loader__bar" aria-hidden="true"><i /></div>
    </div>
  );
}
