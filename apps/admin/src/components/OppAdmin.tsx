"use client";

import { useState } from "react";
import { OppCategoriesAdmin } from "./OppCategoriesAdmin";
import { OppListingsAdmin } from "./OppListingsAdmin";

/** Opportunities console: categories first, then the openings inside them. */
export function OppAdmin() {
  const [tab, setTab] = useState<"openings" | "categories">("openings");
  const [bump, setBump] = useState(0);
  return (
    <>
      <div className="admbar" style={{ marginBottom: ".8rem" }} role="tablist" aria-label="Opportunities">
        <div style={{ display: "flex", gap: ".5rem" }}>
          <button role="tab" aria-selected={tab === "openings"} className={`btn btn--sm ${tab === "openings" ? "btn--pink" : "btn--white"}`} type="button" onClick={() => setTab("openings")}>Openings</button>
          <button role="tab" aria-selected={tab === "categories"} className={`btn btn--sm ${tab === "categories" ? "btn--pink" : "btn--white"}`} type="button" onClick={() => setTab("categories")}>Categories</button>
        </div>
      </div>
      {tab === "categories" ? <OppCategoriesAdmin onChange={() => setBump((n) => n + 1)} /> : <OppListingsAdmin refreshKey={bump} />}
    </>
  );
}
