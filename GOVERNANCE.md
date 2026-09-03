# Bookshelf Rebound Governance

Bookshelf Rebound is an independent, community-maintained continuation of Bookshelf.js. It exists to preserve Bookshelf's straightforward model API while keeping its runtime, Knex integration, dependencies, tests, and security posture current.

## Project principles

- Preserve API compatibility unless a change is necessary for correctness or security.
- Keep the library small and allow applications to drop down to Knex.
- Support maintained Node.js releases and explicitly tested database versions.
- Require tests for behavior changes and publish compatibility notes for breaking changes.
- Credit the original Bookshelf.js project and contributors.

## Maintainers wanted

The project welcomes co-maintainers, particularly people with production experience using Bookshelf, Knex, PostgreSQL, MySQL/MariaDB, or SQLite. Sustained contributors can be nominated for triage and maintainer access through a public issue. No single company should be required to carry the project indefinitely.

Until a broader maintainer group forms, `derp42` is the initial release maintainer. Maintainer changes and release authority will be recorded publicly in this repository.

## Scope

The initial `2.x` line focuses on a drop-in application API for users moving from `bookshelf@1.2.0`, with a modern Node.js baseline and a tested Knex compatibility range. New features should be considered only after compatibility, security, documentation, and release automation are dependable.
