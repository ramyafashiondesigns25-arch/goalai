import { CustomersAdmin } from "@/components/CustomersAdmin";
import { FounderOnly } from "@/components/FounderOnly";
export default function Page() { return <FounderOnly><CustomersAdmin /></FounderOnly>; }
