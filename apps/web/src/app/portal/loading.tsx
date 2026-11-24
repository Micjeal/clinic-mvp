export default function PortalLoading() {
  return (
    <div className="portal-loader" role="status" aria-label="Loading">
      <div className="portal-loader__cross">
        <span /><span />
      </div>
      <p className="portal-loader__text">Preparing your portal…</p>
    </div>
  );
}
