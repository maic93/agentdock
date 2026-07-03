# AgentDock Documentation

| Section | Purpose |
|---|---|
| [architecture/](./architecture/README.md) | The approved system architecture and repository foundation — the source of truth for "why is it built this way." |
| [adr/](./adr/README.md) | Immutable, numbered records of significant decisions and why they were made. |
| [rfcs/](./rfcs/0000-template.md) | Proposals for changes to public APIs, dependency rules, or governance, discussed before implementation. |
| [plugin-guide/](./plugin-guide/README.md) | How to build, test, and publish a plugin. |
| [contributing/](../CONTRIBUTING.md) | Practical contribution mechanics (setup, workflow, PR process). |
| [api-reference/](./api-reference/README.md) | Generated API documentation — not hand-maintained. |
| [tutorials/](./tutorials/README.md) | Task-oriented, runnable walkthroughs. |

## How these relate

Architecture docs describe the **current, approved** state of the system.
ADRs describe **why** a specific decision was made, preserved even after the
system evolves further. RFCs are **proposals** — a change becomes an ADR
(and gets reflected in the architecture docs) only once accepted and
implemented.
