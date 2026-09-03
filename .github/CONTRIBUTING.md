# Contributing to Bookshelf Rebound

Thank you for helping carry Bookshelf.js forward. Bookshelf Rebound values compatibility, clear tests, small changes, and respectful collaboration.

## Before contributing

- Use GitHub Discussions for usage questions.
- Search existing issues and pull requests before opening a new one.
- Report undisclosed vulnerabilities privately as described in [SECURITY.md](../SECURITY.md).
- Read [GOVERNANCE.md](../GOVERNANCE.md) for the project's scope and maintainer path.

## Compatibility expectations

The `2.x` line aims to remain a drop-in application-API replacement for `bookshelf@1.2.0` on its documented modern runtime range. Bug fixes should include a regression test. Deliberate behavior changes require a compatibility note and should avoid breaking existing model, collection, relation, event, transaction, and plugin behavior unnecessarily.

## Development setup

Requirements:

- Node.js 22 or newer
- npm
- PostgreSQL and MySQL/MariaDB test databases, or Docker with Compose

Clone your fork and install the exact locked dependencies:

```sh
git clone https://github.com/YOUR-USER/bookshelf-rebound.git
cd bookshelf-rebound
npm ci
```

The inherited integration suite expects PostgreSQL and MySQL/MariaDB databases named `bookshelf_test`. The provided Compose file starts disposable local test services:

```sh
docker compose up -d
npm test
docker compose down
```

SQLite tests use an isolated database managed by the test suite.

You may instead set `BOOKSHELF_TEST` to the path of a local configuration module. Never point the suite at an application or production database; the tests create and remove data.

## Pull requests

1. Branch from `main`.
2. Keep the change focused and preserve unrelated history.
3. Add or update tests for behavior changes.
4. Run `npm test`.
5. Explain compatibility and database-dialect implications in the pull request.

All contributors must follow [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md).

## Releases

Maintainers publish releases through the repository's protected GitHub release workflow and npm trusted publishing. Release commits must pass CI, update `CHANGELOG.md`, and use a `v<package-version>` tag. Routine releases should not depend on personal long-lived npm tokens.
