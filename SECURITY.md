# Security Policy

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report privately via GitHub's
[private vulnerability reporting](https://github.com/maic93/agentdock/security/advisories/new)
feature on this repository. If that's unavailable to you, email
`security@agentdock.dev`.

Include, as available:

- A description of the vulnerability and its potential impact.
- Steps to reproduce (a minimal repro is very helpful).
- Which package(s) or plugin(s) are affected, and their versions.
- Whether the issue affects the core kernel/foundation packages, a
  first-party reference plugin, or the plugin sandboxing model itself.

## Response process

- We aim to acknowledge new reports within **3 business days**.
- We aim to provide an initial assessment (severity, affected versions,
  planned timeline) within **10 business days**.
- Fixes for confirmed vulnerabilities are released as soon as they are ready
  and verified; we do not hold fixes for a scheduled release cadence.
- Once a fix is released, we will coordinate disclosure timing with the
  reporter and credit them in the advisory unless they prefer otherwise.

## Supported versions

Only the latest minor version of each publishable package receives security
fixes, in line with the deprecation policy in
[docs/architecture](./docs/architecture/README.md). Given the project's
current pre-alpha status, this policy will be revisited and formalized with
version numbers once the first packages are published.

## Scope

This policy covers the packages, apps, and first-party plugins in this
repository. Vulnerabilities in community/third-party plugins hosted outside
this repository should be reported to that plugin's own maintainers; if a
vulnerability in a third-party plugin stems from a flaw in the plugin SDK or
sandboxing model itself (`packages/shared/sdk`), please report it here.

## Plugin sandboxing disclaimer

AgentDock's plugin sandboxing model is documented in
[docs/architecture](./docs/architecture/README.md#security-philosophy). As
with any sandboxing system, we treat sandbox-escape reports as high severity
and prioritize them accordingly — please flag these explicitly in your
report.
