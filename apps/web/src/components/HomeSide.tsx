import Link from "next/link";
import { mainCats, subsOf, type StoreCategory } from "@goalai/core/lib/catalog";
import type { Product } from "@goalai/core/lib/types";

/** Amazon-style category column for the home page. Desktop: left column with a hover/focus fly-out of sub-categories.
 *  Mobile: a swipeable row of shelf chips. Pure links, so it works with no JavaScript. */
export function HomeSide({ cats, products }: { cats: StoreCategory[]; products: Product[] }) {
  const mains = mainCats(cats);
  const count = (id: string) => products.filter((p) => p.cat === id).length;
  return (
    <>
      <nav className="hside" aria-label="Shop by category">
        <h2 className="hside__h">Shop by category</h2>
        <ul>
          <li><Link href="/shop" className="hside__row"><span className="side__dot" style={{ background: "var(--pink)" }} /><span className="side__n">All items</span><small>{products.length}</small></Link></li>
          {mains.map((c) => {
            const kids = subsOf(cats, c.id);
            return (
              <li key={c.id} className="hside__li">
                <Link href={`/shop?cat=${c.id}`} className="hside__row">
                  <span className="side__dot" style={{ background: c.color }} />
                  <span className="side__n">{c.name}{c.ta ? <em>{c.ta}</em> : null}</span>
                  {kids.length > 0 ? <span className="hside__chev" aria-hidden="true">›</span> : <small>{count(c.id)}</small>}
                </Link>
                {kids.length > 0 && (
                  <div className="hside__fly">
                    <b>{c.name}</b>
                    {kids.map((k) => <Link key={k.id} href={`/shop?cat=${c.id}&sub=${k.id}`}>{k.name}{k.ta ? ` · ${k.ta}` : ""}</Link>)}
                    <Link href={`/shop?cat=${c.id}`} className="hside__all">See all {c.name} →</Link>
                  </div>
                )}
              </li>
            );
          })}
          <li className="hside__sep"><Link href="/opportunities" className="hside__row"><span className="side__n">Jobs &amp; Opportunities</span></Link></li>
          <li><Link href="/services" className="hside__row"><span className="side__n">Services</span></Link></li>
        </ul>
      </nav>
      <div className="hchips" role="navigation" aria-label="Shop by category">
        <Link href="/shop">All items</Link>
        {mains.map((c) => <Link key={c.id} href={`/shop?cat=${c.id}`}><i style={{ background: c.color }} />{c.name}</Link>)}
      </div>
    </>
  );
}
