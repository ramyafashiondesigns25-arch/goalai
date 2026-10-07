import type { Metadata } from "next";
import { RequestDetail } from "@/components/RequestDetail";

export const metadata: Metadata = { title: "My request", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <section className="section glow" style={{ paddingTop: "clamp(28px,5vw,56px)" }}>
      <div className="wrap"><RequestDetail id={Number(id)} /></div>
    </section>
  );
}
