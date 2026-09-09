# Upstream open-issue triage: consolidated index

Snapshot date: 2026-09-03. Rebound disposition status is current through 2026-09-08.

This index consolidates every issue and pull request still open in
`bookshelf/bookshelf` at the snapshot. The four issue registers contain 224
unique issue numbers, exactly matching the GitHub Search API inventory. The PR
register contains all 15 open pull requests. No upstream issue or pull request
was changed during this review.

## Source registers

| Created | Issues | Register |
| --- | ---: | --- |
| Before 2016 | 43 | [pre-2016](upstream-open-pre-2016.md) |
| 2016 | 69 | [2016](upstream-open-2016.md) |
| 2017-2018 | 59 | [2017-2018](upstream-open-2017-2018.md) |
| 2019-present | 53 | [2019-present](upstream-open-2019-present.md) |
| Open pull requests | 15 | [pull requests](upstream-open-prs.md) |

## Issue totals

| Priority | Count | Disposition | Count |
| --- | ---: | --- | ---: |
| P0 | 3 | FIX | 24 |
| P1 | 37 | ADD | 27 |
| P2 | 64 | VERIFY | 9 |
| P3 | 85 | ALREADY_FIXED | 44 |
| P4 | 35 | DUPLICATE | 35 |
| **Total** | **224** | REJECT | 85 |
| | | **Total** | **224** |

Priority expresses impact; disposition expresses what Rebound should do. A P0
can therefore be rejected when the reported pattern is inherently unsafe, or
marked already fixed when current code and dependencies remove it.

## Security decision

All three P0 security decisions are resolved for the current release candidate:

- [#2122](https://github.com/bookshelf/bookshelf/issues/2122) is resolved by
  commits `324d628` and `1780d92`. `Sync.first` now rejects object/array model
  attributes before they can be silently dropped into an unconstrained first-row
  query, while preserving scalar-primary-key refresh and explicit query constraints.
  Dialect-neutral unit regressions plus PostgreSQL JSON integration coverage
  exercise the security boundary.
- [#2115](https://github.com/bookshelf/bookshelf/issues/2115) is resolved by
  Rebound's Lodash 4.18.1 baseline. Both production-only and full `npm audit`
  report zero findings as of 2026-09-08.
- [#1843](https://github.com/bookshelf/bookshelf/issues/1843) is rejected. It
  embeds a direct database connection and credentials in a browser bundle;
  database access must remain behind a server-side API.

The related documentation-takeover item from
[#2108](https://github.com/bookshelf/bookshelf/pull/2108) is resolved by
commit `8b0eae4`, including a CI/prepublish regression guard.

## Ranked implementation queue

The order below ranks canonical work, not every duplicate report.

### 0. Release blockers

None currently identified. Keep the #2122 filter-bypass and PR #2108
documentation guards in the release gate.

### 1. Persistence and transaction safety

1. #2091: prevent arbitrary/undefined auto-refresh after a non-identity or
   multi-row update; includes #2086, #2100, and #2101.
2. #1571: reject the common `transaction` typo and invalid `transacting`
   handles so writes do not silently escape the intended transaction.
3. #730: stop model attributes from polluting an explicitly constrained fetch.
4. #1135: fix detach-all and missing-ID behavior for through models; includes
   #1104 and #2009.
5. #853: preserve successful inserts for models without a scalar primary key;
   includes #1364's response-handling fixture.
6. #2046: fix invalid relation constraint state when saving a model loaded
   through a collection relation.

### 2. Query, PostgreSQL, and pagination correctness

1. #1941: do not apply an unconditional `DISTINCT table.*` that breaks
   PostgreSQL `json` columns.
2. #2047: retain `withSchema` through automatic post-save refresh.
3. #1442: honor projections added by fetch event handlers.
4. #2092: count a cloned grouped subquery for pagination; includes #2067's
   `groupByRaw` crash, and should coordinate with PR #2096.
5. #1461: return the defined empty grouped-count result instead of dereferencing
   a missing row.
6. #1075: apply the pivot constraint to plain `belongsToMany().count()`; port
   and extend PR #2093.

### 3. Relation and model lifecycle correctness

1. #1159: repair parsed/formatted `morphTo` type lookup.
2. #1325: resolved by `924ab03` and guarded by `daf5a4e`; eager `morphTo`
   targets now retain per-owner relation constraints for fetch and refresh.
3. #1844: resolved by `924ab03` and guarded by the exact nested
   `User -> devices.subscription` refresh regression; each nested relation now
   retains metadata from its owning model.
4. #1939: serialize empty to-one relations consistently as `null`; includes
   #2016 and #2061.
5. #1961: retain `_handler` when cloning a `belongsToMany` collection.

### 4. Verification and documented safety contracts

1. #1495: verify BIGINT/string identity preservation with the supported MySQL
   driver modes.
2. #2089: reproduce typed catches on real zero-row update/delete paths.
3. #1519 and #2111: resolved by the transaction-event rollback regression and
   guide; save events occur inside the transaction, while post-commit side
   effects belong after the outer transaction resolves.
4. #1823: resolved by documenting the mutable same-instance contract and
   testing that a later overlapping `load()` replaces the earlier path.
5. #1895: resolved by the tested per-Bookshelf-instance model factory; never
   hot-swap a shared model's Knex reference.

P2-P4 additions and documentation work remain in the source registers and
should start only after the release blockers and supported-path P1 defects are
resolved.

## Canonical groups

| Canonical | Consolidated reports | Decision |
| --- | --- | --- |
| #55 atomic conflict upsert | #1333, #1481 | Already supplied through Knex `onConflict`; #2033's MySQL `REPLACE` request remains rejected. |
| #571 repeated target IDs/pivot rows | #1412, #1923, #2039 | Already supported with eager options `{merge: false, remove: false}`; default collection identity remains target-PK based. |
| #719 polymorphic many-to-many | #2073 | Add only as a fully designed relation type. |
| #853 no-scalar-ID insert | #1364 | Fix insert completion/refresh without claiming composite-key or MSSQL support. |
| #865 composite IDs | #1664, #2105 | Reject partial support in compatible 2.x; park a complete redesign for a future major. |
| #921 attach/detach event docs | #1436 | Complete the receiver, arguments, errors, and transaction examples. |
| #1075 relation count | #1416, #1440; PR #2093 | Fix plain `belongsToMany` pivot scoping. |
| #1110 `.related()` lifecycle docs | #1698 | Explain cached relation objects and that access itself performs no I/O. |
| #1135 through detach | #1104, #2009 | One fix and idempotency/transaction regression matrix. |
| #1239 invalid `Posts` README example | #2042 | One docs fix plus runnable snippet coverage. |
| #1480 unbounded recursive eager load | #2071 | Reject; use bounded eager paths or a database recursive CTE. |
| #1707 parent-by-child filtering | #937, #1675, #2090 | Add a deliberate relation-existence API; current workaround is explicit `EXISTS`/JOIN SQL. |
| #1895 connection-independent model definitions | #1408, #1881 | Add a safe per-instance factory pattern, not mutable global connection state. |
| #1939 empty to-one serialization | #2016, #2061 | Fix consistently in the 2.x line. |
| #2037 eager projections and pairing keys | #1808 | Resolved for ordinary direct projections by `3f31377`; the internal key is stripped before application-visible model state. |
| #2091 non-identity update refresh | #2086, #2100, #2101 | Enforce a stable-identity contract before automatic refresh. |
| #2092 grouped pagination count | #2067; related PR #2096 | Replace Knex private-statement reconstruction with a grouped subquery design. |
| #2104 explicit graph persistence | #83, #1979 | Future explicit transactional API only; no silent cascading `save()`. |

Related but distinct refresh/metadata fixtures #1325, #1844, and #2046 should be
implemented as one hardening wave while retaining separate regression tests.
