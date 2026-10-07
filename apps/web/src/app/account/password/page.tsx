import type { Metadata } from "next";
import { PasswordForm } from "@/components/PasswordForm";

export const metadata: Metadata = { title: "Change password", robots: { index: false } };

export default function PasswordPage() {
  return (
    <section className="section glow" style={{ paddingTop: "clamp(28px,5vw,56px)" }}>
      <div className="wrap"><PasswordForm /></div>
    </section>
  );
}
