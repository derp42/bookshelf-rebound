# Upstream open pull-request triage

This register covers all 15 pull requests reported open in
`bookshelf/bookshelf` on 2026-09-03. Pull requests are reviewed as evidence and
possible implementation sources; nothing here is safe to merge blindly into
Rebound's newer dependency and test baseline.

| Upstream PR | Priority | Decision | Rebound treatment |
| --- | --- | --- | --- |
| [#2083 Fix default related table id name when using schemas](https://github.com/bookshelf/bookshelf/pull/2083) | P2 | REJECT PATCH | It strips a schema prefix embedded in `tableName`, while current Rebound exposes Knex's `withSchema` and should keep names/inference unambiguous. It does not fix #2047's dropped schema during automatic post-save refresh; retain only its test intent where applicable. |
| [#2093 Count on `belongsToMany`](https://github.com/bookshelf/bookshelf/pull/2093) | P1 | PORT | It directly addresses confirmed issue #1075 by joining the pivot and applying its foreign-key constraint. Port the focused source and test intent, then extend coverage to custom keys, through relations, and supported dialects. |
| [#2095 Remove development files from npm package](https://github.com/bookshelf/bookshelf/pull/2095) | P3 | ALREADY_FIXED | Rebound uses an explicit `package.json#files` allowlist and the published tarball was independently inspected. No patch is needed. |
| [#2096 Preserve `fetchPage` row count when an event adds attributes](https://github.com/bookshelf/bookshelf/pull/2096) | P2 | REDESIGN/FIX | The defect remains, but accepting the first object key is fragile. Alias the internal count to a stable private key and read that key regardless of event-added attributes; add a regression for `fetched:collection`. Coordinate this with #2092's grouped-count redesign and #2067's raw-group fixture. |
| [#2107 Fix local Docker test configuration](https://github.com/bookshelf/bookshelf/pull/2107) | P3 | ALREADY_FIXED | Rebound replaced the Compose setup with PostgreSQL 16 and MariaDB 11.8 services used by CI. |
| [#2108 Replace hijacked FlyptoX domain link](https://github.com/bookshelf/bookshelf/pull/2108) | P1 | PORT | Rebound's README still links the abandoned external domain. Replace it with the repository URL (or remove the showcase entry) so project documentation does not send users to an unsafe unrelated site. |
| [#2116 `returning` option in `save`](https://github.com/bookshelf/bookshelf/pull/2116) | P2 | REDESIGN/ADD | Selecting returned columns can be useful, but the patch clears model state and has no non-`RETURNING` contract. Design this as an explicit optimization with primary-key/state invariants and cross-dialect tests before adding it. |
| [#2119 Pass options when fetching related data](https://github.com/bookshelf/bookshelf/pull/2119) | P2 | REDESIGN/ADD | Passing bounded context to relation factories enables tenant-aware relations, but arbitrary fetch options can couple authorization to mutable request data. Define a documented context channel and prove nested eager behavior; never present it as the database authorization boundary. |
| [#2120 Update Knex version](https://github.com/bookshelf/bookshelf/pull/2120) | P0 | SUPERSEDED | Superseded by #2125/#2127/#2137 and Rebound's Knex 2.5.1 baseline. |
| [#2125 Update Knex to 2.4.2 and audit](https://github.com/bookshelf/bookshelf/pull/2125) | P0 | SUPERSEDED | Its dependency advisory goal is included in #2137/Rebound. The separate Bookshelf filter-bypass behavior from #2122 still requires a source fix. |
| [#2127 Upgrade Knex to 2.5.1](https://github.com/bookshelf/bookshelf/pull/2127) | P0 | SUPERSEDED | Rebound already pins its test peer to Knex 2.5.1. |
| [#2128 Add deprecation notice](https://github.com/bookshelf/bookshelf/pull/2128) | P4 | REJECT | Rebound exists to continue maintenance and should describe its lineage and release-candidate status, not declare itself abandoned. |
| [#2132 Add MariaDB support to README](https://github.com/bookshelf/bookshelf/pull/2132) | P3 | ALREADY_FIXED | Rebound's README and CI matrix already name and exercise MariaDB. |
| [#2133 Update dependencies and tests](https://github.com/bookshelf/bookshelf/pull/2133) | P0 | SUPERSEDED | The more complete #2137 dependency baseline was selected instead. Dependency audit alone does not close source-level security issues. |
| [#2137 Update Knex 2.5.1 and other dependencies](https://github.com/bookshelf/bookshelf/pull/2137) | P0 | ALREADY_IMPORTED | Rebound commit `da7da76` carries this modernization and commit `53bcbbd` establishes the RC. Preserve attribution; address the remaining source defects separately. |

## Immediate extraction order

1. Treat #2122's source-level filter bypass as a release-blocking fix; dependency updates do not resolve it.
2. Port and extend #2093 for `belongsToMany().count()`.
3. Remove or replace the unsafe FlyptoX URL from #2108.
4. Rework #2096 around an explicit count alias instead of object-key order.
5. Leave #2116 and #2119 as designed additions, not opportunistic merges.
