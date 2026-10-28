import { ApplicationsAdmin } from "@/components/ApplicationsAdmin";
import { FounderOnly } from "@/components/FounderOnly";
export default function Page() { return <FounderOnly><ApplicationsAdmin /></FounderOnly>; }
