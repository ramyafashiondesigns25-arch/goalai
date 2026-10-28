import { OppAdmin } from "@/components/OppAdmin";
import { FounderOnly } from "@/components/FounderOnly";
export default function Page() { return <FounderOnly><OppAdmin /></FounderOnly>; }
