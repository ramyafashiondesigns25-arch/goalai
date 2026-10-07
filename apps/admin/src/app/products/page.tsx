import { ProductsAdmin } from "@/components/ProductsAdmin";
import { FounderOnly } from "@/components/FounderOnly";
export default function Page() { return <FounderOnly><ProductsAdmin /></FounderOnly>; }
