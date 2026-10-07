import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section glow"><div className="wrap empty">
      <b>We couldn&apos;t find that page</b>
      <p>It may have moved, or the product is no longer listed.</p>
      <Link className="btn btn--pink" href="/shop">Go to the store</Link>
    </div></section>
  );
}
