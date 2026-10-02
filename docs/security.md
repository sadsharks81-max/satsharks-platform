# Security

## Password hashing

- bcrypt (`bcryptjs`), cost factor 12.
- Passwords are limited to 8–72 characters. bcrypt ignores input beyond 72 bytes, so longer
  passwords are rejected instead of being silently truncated.
- `passwordHash` is excluded from queries by default and is never part of an API response.
- Login compares against a dummy hash when the email is unknown, so both failure cases take the
  same time and return the same message.

## Authentication

- A JWT (HS256, 7 days) in a cookie: `httpOnly`, `sameSite=lax`, `secure` in production.
  JavaScript cannot read it.
- The token carries only the user ID. Role and status are read from the database on every
  request, so blocking a user or changing a role takes effect immediately.
- `JWT_SECRET` must be at least 32 characters; the API refuses to start otherwise.
- The algorithm is pinned on both sign and verify.

Not yet implemented: password reset, email verification, Google sign-in, session revocation
(a stolen token stays valid until it expires or the user is blocked).

## Authorization

- Permission-based. `packages/types` holds the only role → permission map.
- Routes use `requirePermission("papers:read")`; no route checks a role name.
- Self-registration always creates a `student`. Staff and admin accounts are created with
  `npm run create:admin`, which takes the password from an environment variable.
- The web app hides pages a user cannot use, but that is presentation only. The API enforces
  every rule.

## Input validation

- Request bodies are parsed with Zod schemas; unknown fields are dropped before a controller runs.
- IDs in URLs are validated as ObjectIds.
- JSON bodies are limited to 100 kB.
- Imported data passes the same kind of schema validation before it is written.

## Injection

- Validated inputs are strings, so an operator object such as `{ "$ne": null }` fails validation.
- Mongoose `sanitizeFilter` is on as a second layer, and `strictQuery` drops unknown filter fields.
- No query is built by string concatenation, and nothing is passed to a shell or `eval`.
- React escapes rendered text. No `dangerouslySetInnerHTML` is used. Question prompts contain
  LaTeX and may later contain HTML; the Phase 2 renderer must sanitize them.

## CORS

Only `CLIENT_URL` is allowed, with credentials. In normal use the browser does not make
cross-origin calls at all, because the web app proxies `/api/*`.

## CSRF

The cookie is `sameSite=lax`, so browsers do not send it on cross-site POSTs, and the API only
changes state on POST with a JSON body. If a state-changing GET or a form-encoded endpoint is
ever added, add a CSRF token.

## Rate limiting

- 20 requests per 15 minutes per IP on register and login.
- 300 requests per minute per IP on the rest of `/api/*`.
- The counter is in memory, which is correct for one API instance. Use a Redis store when
  running more than one.
- Later: per-account lockout after repeated failures, and stricter limits on import endpoints.

## Environment secrets

- All secrets come from environment variables. `.env` is git-ignored; `.env.example` has names only.
- Production secrets are set in the Vercel and Railway dashboards.
- The import does not use or store any credential for the source site.

## Database

- Use a dedicated Atlas user with read/write on the application database only.
- Restrict Atlas network access to the API and worker.
- TLS is on by default with `mongodb+srv://`.
- `correctAnswer` and `explanation` are excluded from queries by default, so an endpoint has to
  opt in to return them.

## Logging

- Request logs contain method, path, status and timing. Bodies, cookies and headers are not logged.
- The logger redacts keys matching password, secret, token, authorization, cookie or API key.
- Unexpected errors are logged with a stack trace; the client receives a generic message.

## HTTP headers

`helmet` defaults are applied and `X-Powered-By` is removed.

## Answer keys

- `correctAnswer` and `explanation` are excluded from database queries by default.
- The practice API returns them only for a question the student has checked, or after the
  attempt has ended. Verified by test: questions fetched during an attempt carry no key.
- Checking a question locks its answer, so the key cannot be used to change it.
- A student can only load their own attempts; another user's attempt answers 404.

## Timers

Remaining time is computed on the server from the attempt's start time. The browser's countdown
is display only. An attempt whose time has run out is closed the next time it is touched, and
answers sent afterwards are refused.

## Hosted images

Question images are SVG files from a third party, and SVG can contain scripts. They are only
embedded with `<img>`, which does not run scripts, and the asset route additionally sends
`Content-Security-Policy: default-src 'none'; sandbox` and `X-Content-Type-Options: nosniff`, so
one opened directly in a tab cannot run anything either.

## Question content

Question text is rendered through a small parser into React elements; it is never inserted as
HTML. The one exception is KaTeX's output for formulas, which escapes its input.

## Server-built query operators

`sanitizeFilter` rejects operators in query filters. Code that needs `$in` wraps it in
`trusted()`, and only ever with values produced by the server or already validated as strings.

## Imported recordings

HAR files can contain cookies and tokens. Chrome's sanitized export removes headers but **keeps
response bodies, including the token-refresh response**. `*.har` is git-ignored for that reason;
the one tracked recording was checked and holds no session token. The
importer reads request and response bodies only and writes no headers to disk. The site's public
API key appears in the existing HAR's URLs and headers; it is a publishable key, not a user secret.
