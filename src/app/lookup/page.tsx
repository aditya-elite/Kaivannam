import { LookupView } from "@/components/views/LookupView";

// Fully public. A consumer scanning a tag in a shop is NEVER asked to sign in.
export default function LookupPage() {
  return <LookupView />;
}
