import { FounderOnly } from "@/components/FounderOnly";
import { OrderSheet } from "@/components/OrderSheet";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FounderOnly><OrderSheet id={id} /></FounderOnly>;
}
