# Rebound project direction

Decision snapshot: 2026-09-08.

This document reconciles the complete upstream issue/PR registers with a
second review of issue comments, adoption complaints, usability requests, and
capabilities missing from the initial implementation queue.

## Product principles

Evaluate work in this order:

1. **Simplicity:** preserve Bookshelf's small, understandable model and its
   direct Knex escape hatch.
2. **Performance:** do not introduce hidden queries, row multiplication, or
   abstraction with unmeasured cost.
3. **Ease of use:** make common correct behavior obvious and provide clear
   errors for unsupported behavior.
4. **Scope discipline:** a longer feature list is not inherently better. Keep
   application policy in applications and broad/niche behavior in plugins or
   a future major.

The upstream history indicates that Bookshelf primarily lost trust through
maintainer concentration, backlog growth, stale documentation, and release
silence—not because it failed to match every full-stack ORM feature. See the
[future-of-Bookshelf discussion](https://github.com/bookshelf/bookshelf/issues/1600)
and the later
[maintenance-status report](https://github.com/bookshelf/bookshelf/issues/2121).

## Before a stable 2.x release

### 1. Finish supported-path correctness

The P0/P1 implementation queue in
[the consolidated index](upstream-open-index.md) is complete for the current
release candidate. Keep its focused regressions in the release gate. For new
reports, retain one canonical defect per commit and require a reproduction plus
regression test before changing behavior.

### 2. Prove the compatibility claim

The declared compatibility range is now exercised by the full integration
suite:

| Surface | Current proof |
| --- | --- |
| Knex | Exactly 2.5.1 and 3.3.0 |
| PostgreSQL | PostgreSQL 16 through `pg` |
| MariaDB | MariaDB 11.8 through Knex's legacy `mysql` client |
| MySQL server | MySQL 8.4 through `mysql2` |
| SQLite | `sqlite3` in memory |

Keep this matrix intact and run a compatibility spike before widening any
declared range:

1. Retain the Knex 2.5.1 + `mysql` + MariaDB baseline.
2. Retain Knex 2.5.1 and 3.3.0 with `mysql2` against MySQL 8.4.
3. Retain both Knex lines with PostgreSQL/`pg` and SQLite/`sqlite3`.
4. Test `mysql2` against MariaDB before recommending that pairing.
5. Test Knex's native `mariadb` client separately before declaring it
   supported.

Rebound supports Knex 3.3.x because the declared paths now pass. It still
observes private Knex statement state in several internals, so do not broaden
the range automatically; MySQL driver changes can alter large-number, date,
authentication, pool, and result behavior.

### 3. Replace inherited documentation drift

The README and generated documentation currently disagree. Generated content
still points at the upstream repository, Travis, Freenode, `bookshelfjs.org`,
browser adaptation, and an abandoned third-party link. The tutorials are also
incomplete and the published package excludes them.

Before stable:

- choose one canonical source and one Rebound-owned publishing target;
- remove `docs/CNAME` unless Rebound controls the domain;
- remove stale upstream/browser/support claims;
- add link and executable-snippet checks;
- fix the invalid `Posts` starter example under canonical #1239/#2042; and
- add an executable cookbook for relations, pivots, transactions, and safe
  multi-connection factories.

The cookbook addresses repeated confusion in
[#71](https://github.com/bookshelf/bookshelf/issues/71),
[#748](https://github.com/bookshelf/bookshelf/issues/748),
[#1110](https://github.com/bookshelf/bookshelf/issues/1110),
[#1219](https://github.com/bookshelf/bookshelf/issues/1219),
[#1347](https://github.com/bookshelf/bookshelf/issues/1347),
[#1519](https://github.com/bookshelf/bookshelf/issues/1519), and
[#1895](https://github.com/bookshelf/bookshelf/issues/1895) without expanding
the runtime API.

### 4. Establish performance evidence

Old reports measured significant hydration/eager-pairing overhead, but used
obsolete runtimes and dependencies. Add repeatable Node 22+ benchmarks for
hydration, eager pairing, serialization, concurrent queries, and approximately
4,000-row workloads. Record advisory baselines before optimizing or making
performance checks blocking. Canonical evidence:
[#1061](https://github.com/bookshelf/bookshelf/issues/1061) and
[#1774](https://github.com/bookshelf/bookshelf/issues/1774).

### 5. Curate rather than absorb the plugin ecosystem

Publish a small compatibility registry containing maintenance state, tested
Rebound/Node/Knex versions, known limitations, and security posture. Clearly
mark abandoned plugins. Do not move every old plugin into core.

## After stable 2.x

Rank additive work as follows:

1. **Consistent model-level `require*` policy**
   ([#1946](https://github.com/bookshelf/bookshelf/issues/1946)): add
   `requireSave` and `requireDestroy` while retaining current defaults and
   per-call overrides.
2. **First-party TypeScript declarations**
   ([#2112](https://github.com/bookshelf/bookshelf/issues/2112),
   [#2118](https://github.com/bookshelf/bookshelf/issues/2118)): ship
   compile-tested declarations without rewriting the runtime.
3. **Write-only formatting hook**
   ([#668](https://github.com/bookshelf/bookshelf/issues/668)): consider an
   additive `formatForWrite` hook while preserving legacy `format` semantics.
4. **Relation-existence predicates**
   ([#1707](https://github.com/bookshelf/bookshelf/issues/1707)): design a
   narrow `whereHas`/`whereDoesntHave` API using `EXISTS`; do not make eager
   callbacks implicitly filter parents.
5. **Automatic eager-pairing keys**
   ([#2037](https://github.com/bookshelf/bookshelf/issues/2037)): delivered for
   ordinary direct projections in `3f31377`; internally retain only the required
   key without leaking it through model state or serialization.
6. **Path-scoped relation visibility**
   ([#2038](https://github.com/bookshelf/bookshelf/issues/2038)): avoid global
   nested overrides that can expose parent secrets.
7. **Per-parent eager limits**
   ([#361](https://github.com/bookshelf/bookshelf/issues/361)): spike an
   explicitly named, deterministically ordered window-function API. Never
   silently redefine ordinary `.limit()`.

## Future major or separately versioned plugin

These are valid problems but do not fit a drop-in 2.x maintenance release:

- composite primary keys (#865/#1664/#2105);
- implicit transactional graph persistence (#83/#1979/#2104);
- mixed-direction multi-hop relations (#1025/#1031);
- polymorphic many-to-many relations (#719/#2073); and
- removing observable Bluebird/callback behavior or redesigning the package as
  native ESM.

Document present limits and explicit Knex/transaction recipes now. Do not ship
partial core implementations.

## Deliberately outside core

- MongoDB or JSON-document databases: incompatible with the Knex-backed SQL
  identity and relation model.
- Application authorization and mandatory domain validation: policy varies by
  actor and operation; keep the mass-assignment warning prominent.
- Upsert wrappers: use Knex `onConflict()`.
- Bulk save/delete/truncate conveniences: use explicit Knex or intentional
  per-model operations in a transaction.
- Automatic recursive eager loading: cycles and query explosion require
  bounded paths or a database recursive CTE.
- Counter caches: core hooks cannot observe writes made outside Bookshelf; use
  database enforcement or a scoped plugin.

## Sustainability

The maintenance model is part of the product. Work toward two release-capable
maintainers, a public triage cadence, explicit ownership of supported
dialects/versions, and reviewed releases. Do not promise an SLA the maintainer
team cannot sustain.
