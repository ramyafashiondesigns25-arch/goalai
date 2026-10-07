import { OrdersAdmin } from "@/components/OrdersAdmin";
import { FounderOnly } from "@/components/FounderOnly";
export default function Page() { return <FounderOnly><OrdersAdmin /></FounderOnly>; }
