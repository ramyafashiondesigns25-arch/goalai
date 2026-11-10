import type { Product, Review } from "@goalai/core/lib/types";
import { Stars } from "./Stars";
import { ReviewForm } from "./ReviewForm";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** Customer reviews for one product. Only real reviews from customers who ordered it appear here. */
export function ReviewsSection({ p, reviews }: { p: Product; reviews: Review[] }) {
  const counts = [5, 4, 3, 2, 1].map((s) => ({ s, n: reviews.filter((r) => r.rating === s).length }));
  return (
    <section className="rv" id="reviews" aria-labelledby="rvT">
      <h2 id="rvT">Customer reviews</h2>
      <div className="rv__grid">
        <div className="rv__sum">
          {p.ratingCount > 0 ? (
            <>
              <div className="rv__avg"><b>{p.ratingAvg.toFixed(1)}</b><span>out of 5</span></div>
              <Stars value={p.ratingAvg} size={22} />
              <p className="rv__n">{p.ratingCount} review{p.ratingCount === 1 ? "" : "s"}</p>
              <ul className="rv__bars">{counts.map(({ s, n }) => <li key={s}><span>{s}★</span><i><b style={{ width: `${reviews.length ? (n / reviews.length) * 100 : 0}%` }} /></i><span>{n}</span></li>)}</ul>
            </>
          ) : <p className="rv__n">No reviews yet. Be the first to review {p.name}.</p>}
          <ReviewForm productId={p.id} productName={p.name} />
        </div>
        <div className="rv__list">
          {reviews.map((r) => (
            <article key={r.id} className="rv__item">
              <div className="rv__head"><Stars value={r.rating} /><b>{r.author}</b><span className="rv__badge">Verified buyer</span><time dateTime={r.createdAt}>{fmt(r.createdAt)}</time></div>
              {r.title && <h3>{r.title}</h3>}
              {r.body && <p>{r.body}</p>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
