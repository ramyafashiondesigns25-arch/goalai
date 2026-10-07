import { SettingsAdmin } from "@/components/SettingsAdmin";
import { FounderOnly } from "@/components/FounderOnly";
export default function Page() { return <FounderOnly><SettingsAdmin /></FounderOnly>; }
