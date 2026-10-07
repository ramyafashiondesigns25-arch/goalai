import { LeadsAdmin } from "@/components/LeadsAdmin";
import { FounderOnly } from "@/components/FounderOnly";
export default function Page() { return <FounderOnly><LeadsAdmin /></FounderOnly>; }
