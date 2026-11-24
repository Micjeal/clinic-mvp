export default function PortalLoading() {
  return (
    <div className="portal-loader" role="status" aria-label="Loading">
      <div className="portal-loader__mark">
        <span className="portal-loader__ring portal-loader__ring--1" />
        <span className="portal-loader__ring portal-loader__ring--2" />
        <span className="portal-loader__ring portal-loader__ring--3" />
        <div className="portal-loader__cross"><i /><i /></div>
      </div>
      <p className="portal-loader__text">Preparing your portal…</p>
      <div className="portal-loader__dots"><span /><span /><span /></div>
    </div>
  );
}
