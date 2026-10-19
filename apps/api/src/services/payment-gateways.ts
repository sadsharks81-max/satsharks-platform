// Card payment gateways. SAT Sharks has not chosen its gateway(s) yet (proposal 4.1: "gateways
// confirmed by SAT Sharks"), so only a test gateway exists: it lets the whole flow (checkout →
// payment → instant upgrade → receipt → admin alert) be tried without money, and is refused in
// production.
//
// Adding the real gateway: implement PaymentGateway (create the hosted checkout, return its URL and
// the gateway's payment id), add a webhook route that verifies the gateway's signature and calls
// paymentService.markPaid(paymentId, { gateway, reference }), and return it from cardGateway().
import type { Currency } from "@satsharks/types";
import { env, isProduction } from "../config/env";

export interface GatewayCheckoutInput {
  paymentId: string;
  amount: number;
  currency: Currency;
  description: string;
  customer: { name: string; email: string };
  // Where the gateway sends the student back (the Billing page).
  returnUrl: string;
}

export interface PaymentGateway {
  name: string;
  currencies: readonly Currency[];
  createCheckout(input: GatewayCheckoutInput): Promise<{ redirectUrl: string; reference: string }>;
}

// A pretend checkout page on this site (/checkout/test) with a "Pay" button. No money moves.
const testGateway: PaymentGateway = {
  name: "test",
  currencies: ["PKR", "USD"],
  async createCheckout({ paymentId }) {
    return { redirectUrl: `/checkout/test?payment=${paymentId}`, reference: `test_${paymentId}` };
  },
};

export function isTestGatewayOn(): boolean {
  return env.PAYMENTS_TEST_GATEWAY === "on" && !isProduction;
}

// The gateway card payments use right now, or null when cards are not offered.
export function cardGateway(): PaymentGateway | null {
  if (isTestGatewayOn()) return testGateway;
  return null;
}
