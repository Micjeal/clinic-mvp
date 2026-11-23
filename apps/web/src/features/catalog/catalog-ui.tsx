import Link from "next/link";
import type {ReactNode} from "react";

export function StatusBadge({active, public: isPublic}: {active: boolean; public?: boolean}) {
  return <span className="staff-catalog-badges">
    <span className={`staff-member-status ${active ? "is-active" : "is-inactive"}`}>{active ? "Active" : "Inactive"}</span>
    {isPublic !== undefined ? <span className={`staff-catalog-visibility ${isPublic ? "is-public" : ""}`}>{isPublic ? "Public" : "Private"}</span> : null}
  </span>;
}

export function CatalogPagination({page, pageSize, total, basePath, params}: {page: number; pageSize: number; total: number; basePath: string; params?: Record<string, string>}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (target: number) => {
    const search = new URLSearchParams({...(params ?? {}), page: String(target)});
    return `${basePath}?${search.toString()}`;
  };
  return <nav aria-label="Pagination" className="staff-catalog-pagination">
    {page > 1 ? <Link className="btn btn-secondary" href={href(page - 1)}>Previous</Link> : <span className="btn btn-secondary is-disabled" aria-disabled="true">Previous</span>}
    <span>Page {page} of {pages} · {total} record{total === 1 ? "" : "s"}</span>
    {page < pages ? <Link className="btn btn-secondary" href={href(page + 1)}>Next</Link> : <span className="btn btn-secondary is-disabled" aria-disabled="true">Next</span>}
  </nav>;
}

export function CatalogStats({items}: {items: {label: string; value: ReactNode; hint?: string}[]}) {
  return <dl className="staff-stat-strip" aria-label="Summary statistics">
    {items.map((item) => <div className="staff-stat" key={item.label}>
      <dt>{item.label}</dt>
      <dd><strong>{item.value}</strong>{item.hint ? <small>{item.hint}</small> : null}</dd>
    </div>)}
  </dl>;
}

export function CatalogEmpty({title, description, action}: {title: string; description: string; action?: ReactNode}) {
  return <div className="staff-empty staff-directory-empty"><h2>{title}</h2><p>{description}</p>{action}</div>;
}
