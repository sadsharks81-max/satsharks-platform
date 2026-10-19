"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Card, Notice, PageHeader, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { ME_QUERY_KEY } from "@/lib/auth";
import { BILLING_QUERY_KEY } from "@/lib/billing";

// The test card gateway's pretend payment page (PAYMENTS_TEST_GATEWAY=on, never in production).
// It stands in for the real gateway's hosted page until SAT Sharks chooses one. No money moves.
function TestGateway() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const payment = useSearchParams().get("payment") ?? "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish(outcome: "paid" | "failed") {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/billing/test-gateway/${payment}`, { method: "POST", body: { outcome } });
      await Promise.all([queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY }), queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY })]);
      router.replace(`/billing?payment=${payment}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not finish the test payment");
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto max-w-lg">
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">Test mode: this is not a real card page and no money is taken.</p>
      <p className="mt-4 text-sm text-slate-600">Choose what the card gateway would answer.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button disabled={busy || !payment} onClick={() => finish("paid")}>
          Pay (test)
        </Button>
        <Button variant="outline" disabled={busy || !payment} onClick={() => finish("failed")}>
          Decline (test)
        </Button>
      </div>
      {error && (
        <div className="mt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
    </Card>
  );
}

export default function TestGatewayPage() {
  return (
    <>
      <PageHeader title="Card payment (test)" />
      <Suspense fallback={<Spinner label="Loading" />}>
        <TestGateway />
      </Suspense>
    </>
  );
}
