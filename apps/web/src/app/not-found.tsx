import Link from "next/link";
import { PageHeader } from "@/components/ui";

export default function NotFound() {
  return (
    <div>
      <PageHeader title="Page not found" subtitle="That address does not exist." />
      <Link href="/" className="text-sm font-medium text-brand-500 hover:underline">
        Back to home
      </Link>
    </div>
  );
}
