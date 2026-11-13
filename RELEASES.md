# GoAwayGo automation tests — releases

This repo has no version numbers: the product repos run its tests from the branch that matches the
environment (`develop` → dev, `test` → test, `main` → prod). Each change below is a pull request into
`develop`; "on test" and "on main" show whether it has been promoted there. Newest first; update this file
in the PR that promotes changes.

- 2026-11-14 · Security test comment: prod's website is goawaygo.com (#7) (dev only)
- 2026-11-12 · fix: app sign-in flow waits for the welcome message (#4) (on test, on main)
- 2026-11-12 · fix: keep secrets out of the test reports (#3) (on test, on main)
- 2026-11-12 · fix: run the app flows on CI (#2) (on test, on main)
- 2026-11-12 · feat: API, website and app test suites (#1) (on test, on main)
- 2026-11-12 · chore: repository base (rules, scans, tooling) (on test, on main)
