"use client";

import { useEffect, useState } from "react";
import { browserClient } from "@goalai/core/lib/supabase/browser";
import { rupee } from "@goalai/core/lib/pricing";

interface LeadRow { id: string; lead_code: string; contact_name: string; phone: string | null; title: string | null; status: string; source: string | null; notes: string | null; expected_value: number | null; created_at: string; assigned_to: string | null }

export function LeadsAdmin() {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    browserClient().from("leads").select("id,lead_code,contact_name,phone,title,status,source,notes,expected_value,created_at,assigned_to")
      .like("source", "Website%").order("created_at", { ascending: false }).limit(200)
      .then(({ data, error }) => { setLoading(false); if (error) setErr(error.message); else setRows((data ?? []) as LeadRow[]); });
  }, []);
  return (
    <div className="admcard">
      <div className="admbar"><h2>Website leads <small>orders and enquiries filed into the GOALAI CRM</small></h2></div>
      {err && <p className="form-err">{err}</p>}
      <div className="admtable"><table>
        <thead><tr><th>Lead</th><th>Contact</th><th>About</th><th>Value</th><th>Status</th></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={5} className="empty">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={5} className="empty">No website leads yet.</td></tr> : rows.map((l) => (
            <tr key={l.id}>
              <td><b>{l.lead_code}</b><small>{new Date(l.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</small><small>{l.source?.replace("Website · ", "")}</small></td>
              <td><b>{l.contact_name}</b>{l.phone && <small><a href={`tel:+91${l.phone}`}>{l.phone}</a> · <a href={`https://wa.me/91${l.phone}`} target="_blank" rel="noopener">WhatsApp</a></small>}</td>
              <td>{l.title}<small style={{ whiteSpace: "pre-line" }}>{l.notes?.slice(0, 220)}</small></td>
              <td>{l.expected_value ? rupee(Number(l.expected_value)) : "—"}</td>
              <td><span className={`pill${l.status === "WON" ? " pill--done" : l.status === "NEW" ? " pill--new" : ""}`}>{l.status.replace("_", " ")}</span>{!l.assigned_to && <small>Unassigned</small>}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <p className="muted" style={{ fontSize: ".8rem" }}>Assign, call and update these leads in the GOALAI CRM. Leads from a team member&apos;s referral link are assigned to them automatically.</p>
    </div>
  );
}
