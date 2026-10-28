import { StoreCategoriesAdmin } from "@/components/StoreCategoriesAdmin";
import { FounderOnly } from "@/components/FounderOnly";
export default function Page() { return <FounderOnly><StoreCategoriesAdmin /></FounderOnly>; }
