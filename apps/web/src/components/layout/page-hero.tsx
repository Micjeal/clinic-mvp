import Link from "next/link";

type Breadcrumb = { label: string; href?: string };

export function PageHero({ eyebrow, title, description, breadcrumbs }: { eyebrow: string; title: string; description: string; breadcrumbs?: Breadcrumb[] }) {
  return (
    <section className="page-hero" aria-labelledby="page-title">
      <div className="site-container">
        {breadcrumbs ? (
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <ol>{breadcrumbs.map((item, index) => <li key={item.label}>{item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}{index < breadcrumbs.length - 1 ? <span aria-hidden="true">/</span> : null}</li>)}</ol>
          </nav>
        ) : null}
        <p className="eyebrow">{eyebrow}</p>
        <h1 id="page-title">{title}</h1>
        <p>{description}</p>
      </div>
    </section>
  );
}
