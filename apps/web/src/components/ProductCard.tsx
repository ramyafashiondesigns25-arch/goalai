import Link from "next/link";
import { comparePrices, offPct, rupee } from "@goalai/core/lib/pricing";
import { priceRange } from "@goalai/core/lib/mappers";
import type { Product, StoreSettings } from "@goalai/core/lib/types";
import { ProductVisual } from "@goalai/core/components/ProductVisual";
import { Stars } from "./Stars";
import { BuyButton } from "./BuyButton";
import { WishButton } from "./WishButton";
import { ShareButton } from "./ShareButton";
import { SITE } from "@goalai/core/lib/site";

export function ProductCard({ p, s }: { p: Product; s: StoreSettings }) {
  const pr = priceRange(p);
  const off = offPct({ price: pr.min, mrp: pr.mrp });
  const online = comparePrices({ ...p, price: pr.min, mrp: pr.mrp }, s)[1]!.price;
  return (
    <article className={`prod lit${p.stock === 0 ? " prod--oos" : ""}`}>
      <WishButton id={p.id} name={p.name} />
      <ShareButton variant="icon" url={`${SITE.url}/product/${p.id}`} name={p.name} size={p.size} price={p.price} mrp={p.mrp} />
      <Link className={`prod__stage${p.img ? " prod__stage--ph" : ""}`} href={`/product/${p.id}`} aria-label={`View ${p.name}`}>
        {off > 0 && <span className="prod__off">{off}% OFF</span>}
        {p.isNew && <span className="prod__new">NEW</span>}
        {p.organic && <span className="prod__org">Organic</span>}
        <ProductVisual p={p} />
      </Link>
      <h3><Link href={`/product/${p.id}`}>{p.name}</Link></h3>
      <div className="ta">{p.ta}</div>
      {p.ratingCount > 0 && <Link className="prod__rate" href={`/product/${p.id}#reviews`}><Stars value={p.ratingAvg} size={14} /><span>{p.ratingAvg.toFixed(1)} ({p.ratingCount})</span></Link>}
      <div className="prod__size">{p.variants.length ? `${p.variants.length} options` : p.size}</div>
      <div className="prod__buy">
        <span className="price"><b>{pr.min < pr.max ? "from " : ""}{rupee(pr.min)}</b>{pr.mrp > pr.min && <s>MRP {rupee(pr.mrp)}</s>}</span>
        <span className="buy"><BuyButton p={p} /></span>
      </div>
      <div className="cmp">
        {online > pr.min
          ? <span className="cmp__save">{rupee(online - pr.min)} less than online marts</span>
          : <span className="cmp__save cmp__save--even">Fair price</span>}
        <Link className="cmp__btn" href={`/product/${p.id}`}>Details &amp; compare</Link>
      </div>
    </article>
  );
}
