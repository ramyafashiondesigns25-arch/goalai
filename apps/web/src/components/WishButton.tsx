"use client";

import { useWish } from "./WishProvider";

/** Heart toggle. `inline` renders the labelled version used on the product page. */
export function WishButton({ id, name, inline = false }: { id: string; name: string; inline?: boolean }) {
  const { has, toggle } = useWish();
  const on = has(id);
  return (
    <button type="button" className={`wish${inline ? " wish--inline" : ""}`} aria-pressed={on}
      aria-label={on ? `Remove ${name} from saved items` : `Save ${name} for later`} onClick={() => toggle(id, name)}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.2-9.4C1.7 7.9 3.6 4.8 6.9 4.8c1.9 0 3.5 1 4.4 2.5.2.3.6.3.8 0 .9-1.5 2.5-2.5 4.4-2.5 3.3 0 5.2 3.1 4.1 6.3-1.7 4.8-9.2 9.4-9.2 9.4Z" /></svg>
      {inline && <span>{on ? "Saved" : "Save for later"}</span>}
    </button>
  );
}
