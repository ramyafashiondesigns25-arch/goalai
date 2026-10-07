import { comparePrices, rupee } from "../lib/pricing";
import type { Product, StoreSettings } from "../lib/types";

export function PriceCheck({ p, s }: { p: Product; s: StoreSettings }) {
  const rows = comparePrices(p, s);
  const max = Math.max(...rows.map((r) => r.price));
  const save = rows[1]!.price - p.price;
  return (
    <div className="cmpbox">
      <div className="cmpbox__head"><b>Price check</b>{save > 0 && <span className="cmp__save">Save {rupee(save)} vs online marts</span>}</div>
      <ol className="rows" aria-label="Price compared with other channels">
        {rows.map((r) => (
          <li key={r.id} className={`row${r.us ? " row--us" : ""}`}>
            <div className="row__name">{r.name}<small>{r.note}</small></div>
            <div className="row__track"><div className="row__bar" style={{ width: `${((r.price / max) * 100).toFixed(1)}%` }} /></div>
            <div className="row__price">{rupee(r.price)}</div>
            <div className={`row__diff${r.us ? "" : " more"}`}>{r.us ? "you pay" : `+${rupee(r.price - p.price)}`}</div>
          </li>
        ))}
      </ol>
      <p className="cmpbox__note">Comparison prices are typical figures for the same quantity{s.capMrp ? ", never above the printed MRP" : ""}.</p>
    </div>
  );
}
