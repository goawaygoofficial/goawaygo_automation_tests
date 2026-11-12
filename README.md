# GoAwayGo automation tests

Automated tests of GoAwayGo (MVP 2, 5.5): the **API** and the **website** with [Playwright](https://playwright.dev),
the **Android app** with [Maestro](https://maestro.mobile.dev) on an emulator. The product repos run them after every
deployment, and the results are evidence: a version moves up (dev → test → prod) only after these tests and the
performance tests passed in the environment below.

The suites are being added (5.5): this is the repository's base.
