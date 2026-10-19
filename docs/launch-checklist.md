# Launch checklist (proposal Week 4, checkpoint 4.4)

What has to happen outside the code before SAT Sharks goes live on its own domain. Tick each item
and note who did it. Hosting today: web on Vercel (`satsharks-platform`, root `apps/web`), API on
Railway (`@satsharks/api`), database on MongoDB Atlas (Mumbai). See `docs/project-context.md` §2
"Deployment".

## Decisions SAT Sharks must make

- [ ] **Card payment gateway** (proposal 4.1: "gateways confirmed by SAT Sharks"). Until then
      students pay by bank transfer / JazzCash / Easypaisa and an admin approves. Adding a gateway
      = one adapter in `apps/api/src/services/payment-gateways.ts` plus its webhook route; the
      checkout, plan, receipt and alert flow is already built and tested with the test gateway.
- [ ] Final **prices** (Admin → Settings → Pricing) and the **refund policy** line.
- [ ] **Payment accounts** to show students (Admin → Settings → Payments) and the **alert email**.
- [ ] Which exams are **free**, **paid only** or **invite code**, and the **free daily drill
      limit** (Admin → Access; the proposal says 2 free papers and 20 drill questions a day).
      Nothing is locked until that page is saved.
- [ ] **Exit offer** on or off, and its percentage.
- [ ] A **legal contact email** for Terms / Privacy (`LEGAL_CONTACT_EMAIL` in
      `apps/web/src/components/legal-page.tsx`), and a lawyer's look at Terms, Privacy and Refund.
- [ ] Real **conversion tables** (Admin → Settings), or keep the built-in estimate.

## Domain and hosting

- [ ] Add the domain in Vercel (project → Settings → Domains) and set the DNS records it shows.
- [ ] Vercel environment: `NEXT_PUBLIC_SITE_URL=https://<domain>` (no trailing slash), `API_URL`
      (Railway URL). Redeploy after changing them (read at build time).
- [ ] Railway environment: `CLIENT_URL=https://<domain>`, `NODE_ENV=production`, `JWT_SECRET`,
      `MONGODB_URI`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (on a domain verified in Resend),
      `PAYMENT_ALERT_EMAIL` (optional), and **not** `PAYMENTS_TEST_GATEWAY=on`.
- [ ] Move the Railway service to **Southeast Asia (Singapore)**, next to the Mumbai database
      (each database round trip from the US region costs ~300 ms).
- [ ] Atlas: automated backups on; network access as Railway needs.
- [ ] Only one API instance runs the scheduler and emails; any extra instance gets
      `SCHEDULER=off` and `ENGAGEMENT_EMAILS=off`.

## Search and analytics (checkpoint 4.3)

- [ ] Google Search Console: add the domain property, copy the HTML-tag code into Vercel as
      `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, redeploy, press Verify, then submit
      `https://<domain>/sitemap.xml`.
- [ ] Google Analytics 4: create a web stream, put its `G-…` ID in `NEXT_PUBLIC_GA_ID`, redeploy.
- [ ] Lighthouse (Chrome DevTools) on `/`, `/pricing`, `/faq`, a guide: SEO 95+ on each.
- [ ] Check `https://<domain>/robots.txt`, `/sitemap.xml` and `/llms.txt` open and use the domain.
- [ ] Share `https://<domain>` on WhatsApp once to see the preview image and title.

## Final testing (checkpoint 4.4)

- [ ] Browsers: Chrome, Safari, Edge, Firefox; laptop, tablet, phone. A full test start to finish
      on each kind of device; drills; results; pricing; checkout; billing.
- [ ] Payments: with `PAYMENTS_TEST_GATEWAY=on` on a staging copy, a test card payment in PKR and
      in USD upgrades the account at once; a transfer is approved and rejected; the alert email
      arrives within a minute and the sidebar shows (1).
- [ ] Load: `node apps/api/test/load/load-test.mjs --url <staging API> --users 200 --seconds 120
      --email <test account> --password <…>` from a couple of machines; median and p95 times
      stay low and nothing fails.
- [ ] Security: `npm audit` reviewed; admin accounts use strong passwords; the hidden developer
      accounts are kept or removed as SAT Sharks prefers.

## Handover

- [ ] GitHub repository, Vercel project, Railway project, Atlas cluster, Resend account and the
      domain are owned by SAT Sharks' accounts; passwords handed over privately.
- [ ] `docs/admin-guide.md` given to the people who run the site.
- [ ] 30 days of bug fixing after launch start on the launch date.
