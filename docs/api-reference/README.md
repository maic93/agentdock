# API Reference

Per the documentation strategy in
[docs/architecture/002-repository-foundation.md](../architecture/002-repository-foundation.md#6-documentation-strategy),
this directory holds **generated** API documentation, not hand-written prose
— generated from TSDoc comments in each package's public entry point and
(for `apps/api`) from an OpenAPI specification.

## Current status

Empty: there are no publishable package APIs yet to generate documentation
from. The generation tooling (a documentation build step wired into CI) will
be added alongside the first package that exports a real public API, so that
it's validated against real content from the start rather than configured
speculatively.

## What never belongs here

Hand-written API documentation that duplicates what TSDoc/OpenAPI generation
would produce — that duplication is exactly what causes docs to drift from
the code they describe at scale.
