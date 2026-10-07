import { GoalaiMark } from "@goalai/core/components/Logo";

/** Letterhead used on printable order and customer sheets. */
export function SheetHeader({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="sheet__head">
      <div style={{ display: "flex", gap: ".7rem", alignItems: "center" }}>
        <GoalaiMark />
        <div><h1>{title}</h1>{sub && <p className="muted" style={{ margin: 0 }}>{sub}</p>}</div>
      </div>
      <div style={{ textAlign: "right", fontSize: ".85rem", lineHeight: 1.5 }}>
        <b>Goalai</b><br />Kodungaiyur, Chennai<br />WhatsApp +91 63801 50117
        {right}
      </div>
    </div>
  );
}
