# SAT Sharks — notes for Claude

Start every session by reading `docs/project-context.md`: current state, decisions already made,
facts about the reference site, traps already hit, and the change log.

**Keep that file current.** After any change to the project (code, data, decisions, findings),
before ending the session:
- add a dated entry to its change log (§10);
- correct any section above that is no longer true (state, Git status, open items);
- update "Last updated".

Working rules for this project:
- Secrets only in `.env` (never `.env.example`); never commit `.env`, `data/`, `*.har`, `docs/purposal/`.
- Ask before committing or pushing.
- When Umair says "do not test", only run the type check — no logins or browser runs.
- Test with temporary `phase1-test-*@example.com` accounts and delete them afterwards; never touch
  Umair's own accounts.
- Run commands through PowerShell when the Bash tool is missing tools; call CLIs directly with
  `npx tsx …` (PowerShell drops `--` arguments to npm scripts).
