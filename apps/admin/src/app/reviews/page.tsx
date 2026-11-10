import { FounderOnly } from "@/components/FounderOnly";
import { ReviewsAdmin } from "@/components/ReviewsAdmin";
export default function Page() { return <FounderOnly><ReviewsAdmin /></FounderOnly>; }
