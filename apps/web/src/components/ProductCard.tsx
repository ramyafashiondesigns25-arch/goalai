import Link from "next/link";
import { comparePrices, offPct, rupee } from "@goalai/core/lib/pricing";
import type { Product, StoreSettings } from "@goalai/core/lib/types";
import { ProductVisual } from "@goalai/core/components/ProductVisual";
import { BuyButton } from "./BuyButton";
import { WishButton } from "./WishButton";
import { ShareButton } from "./ShareButton";
import { SITE } from "@goalai/core/lib/site";

export function ProductCard({ p, s }: { p: Product; s: StoreSettings }) {
  const off = offPct(p);
  const online = comparePrices(p, s)[1]!.price;
  return (
    <article className={`prod lit${p.stock === 0 ? " prod--oos" : ""}`}>
      <WishButton id={p.id} name={p.name} />
      <ShareButton variant="icon" url={`${SITE.url}/product/${p.id}`} name={p.name} size={p.size} price={p.price} mrp={p.mrp} />
      <Link className={`prod__stage${p.img ? " prod__stage--ph" : ""}`} href={`/product/${p.id}`} aria-label={`View ${p.name}`}>
        {off > 0 && <span className="prod__off">{off}% OFF</span>}
        {p.isNew && <span className="prod__new">NEW</span>}
        <span className="prod__org">Organic</span>
        <ProductVisual p={p} />
      </Link>
      <h3><Link href={`/product/${p.id}`}>{p.name}</Link></h3>
      <div className="ta">{p.ta}</div>
      <div className="prod__size">{p.size}</div>
      <div className="prod__buy">
        <span className="price"><b>{rupee(p.price)}</b>{p.mrp > p.price && <s>MRP {rupee(p.mrp)}</s>}</span>
        <span className="buy"><BuyButton p={p} /></span>
      </div>
      <div className="cmp">
        {online > p.price
          ? <span className="cmp__save">{rupee(online - p.price)} less than online marts</span>
          : <span className="cmp__save cmp__save--even">Fair price</span>}
        <Link className="cmp__btn" href={`/product/${p.id}`}>Details &amp; compare</Link>
      </div>
    </article>
  );
}
