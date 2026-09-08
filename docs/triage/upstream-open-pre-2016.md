# Upstream open-issue triage: before 2016

This register covers every open `bookshelf/bookshelf` issue created before
2016-01-01. The inventory was queried on 2026-09-03 with:

```text
repo:bookshelf/bookshelf is:issue is:open created:<2016-01-01
```

The GitHub result count was 43 and this register contains 43 issue rows.
Issue bodies, maintainer comments, linked issues, the current Rebound source,
tests, and inherited history were used as evidence. An old issue was not
treated as solved merely because its original dependencies changed.

## Decision vocabulary

- **P0**: security exposure or likely data loss.
- **P1**: confirmed correctness, isolation, or common-path failure.
- **P2**: compatibility or worthwhile backward-compatible capability.
- **P3**: documentation, diagnostics, or support ergonomics.
- **P4**: stale, breaking, application-specific, or outside the maintained 2.x scope.
- **FIX**: correct an existing Rebound defect.
- **ADD**: accept a backward-compatible capability or documentation addition.
- **VERIFY**: reproduce and measure on the supported matrix before committing to a design.
- **ALREADY_FIXED**: current Rebound or its supported Knex baseline supplies the behavior.
- **DUPLICATE**: track under the cited canonical issue.
- **REJECT**: do not add to the maintained 2.x core; the rationale records the supported alternative.

## Summary

| Dimension | Counts |
| --- | --- |
| Priority | P0 0; P1 2; P2 17; P3 13; P4 11 |
| Disposition | FIX 7; ADD 10; VERIFY 1; ALREADY_FIXED 9; DUPLICATE 3; REJECT 13 |

## Register

| Upstream issue | Category | Priority | Decision | Evidence and Rebound action |
| --- | --- | --- | --- | --- |
| [#55 Update if exists, insert if it doesn't](https://github.com/bookshelf/bookshelf/issues/55) | Persistence | P2 | ALREADY_FIXED | Modern Knex provides dialect-aware `insert().onConflict().merge()/ignore()`, and `Model#query()` exposes the builder. Document that path; a second Bookshelf upsert abstraction would duplicate Knex semantics. |
| [#71 Attaching relations](https://github.com/bookshelf/bookshelf/issues/71) | Relations/docs | P3 | ADD | `project.tasks().create(data)` is the supported persisted association; assigning a fetched model to a `belongsTo` relation does not persist its foreign key. Add a concise create/associate example rather than change relation state semantics. |
| [#83 Saving model with relations](https://github.com/bookshelf/bookshelf/issues/83) | Graph persistence | P2 | DUPLICATE | This is the original request for the explicit object-graph persistence capability now specified more completely by #2104. Track one design there; ordinary `set()`/`save()` must not silently cascade writes. |
| [#127 hasMany with a different primary key](https://github.com/bookshelf/bookshelf/issues/127) | Relations | P2 | ALREADY_FIXED | Current `hasMany(Target, foreignKey, foreignKeyTarget)` supports this exact mapping and integration coverage exercises non-default targets. |
| [#141 Joins and querying off joins with related data](https://github.com/bookshelf/bookshelf/issues/141) | Queries/docs | P3 | ADD | Filtering parents by joined-table values is available through `Model#query()` and Knex joins; eager loading intentionally uses separate queries. Add a recipe, but do not introduce an implicit join relation with collision-prone projection rules. |
| [#211 Docs could include SQL for comparison](https://github.com/bookshelf/bookshelf/issues/211) | Documentation | P3 | ADD | SQL-first relation examples remain useful for a compatibility-focused ORM. Add generated SQL sketches for each supported relation without promising byte-identical dialect output. |
| [#361 Limit number of related records](https://github.com/bookshelf/bookshelf/issues/361) | Eager loading | P2 | ADD | A plain `limit()` applies to the combined eager query, not per parent. Accept a designed per-parent limit using supported window-function dialects, with explicit fallback/error behavior and regression tests. |
| [#457 Collection should sort on fetch](https://github.com/bookshelf/bookshelf/issues/457) | Collections | P3 | REJECT | Database `orderBy` is deterministic and scalable; silently applying an in-memory comparator after fetch would change established ordering and pagination behavior. Document `orderBy` and the explicit `collection.sort()` alternative. |
| [#458 Handling schemas](https://github.com/bookshelf/bookshelf/issues/458) | Database schemas | P2 | ALREADY_FIXED | Base fetch/save queries pass `options.withSchema` to Knex, so callers need not encode `schema.table` into `tableName`. This does not cover the separate automatic post-save refresh defect in #2047; cross-link that limitation in any schema example. |
| [#472 Save and destroy on collections](https://github.com/bookshelf/bookshelf/issues/472) | Bulk writes | P4 | REJECT | A bulk SQL operation cannot preserve per-model hooks, validation, returned models, and dialect behavior without surprising contract changes. Use an explicit Knex bulk query or per-model operations within a transaction. |
| [#474 Documentation on associations](https://github.com/bookshelf/bookshelf/issues/474) | Documentation | P3 | FIX | The inherited one-to-one migration tutorial can create a signed foreign key against an unsigned MySQL/MariaDB increment key. Correct the type/ordering example and execute tutorial schemas in CI. |
| [#535 UTC for created_at/updated_at](https://github.com/bookshelf/bookshelf/issues/535) | Timestamps/docs | P3 | ADD | Bookshelf creates JavaScript `Date` values; storage interpretation belongs to the driver, column type, and database/session timezone. Document an explicit UTC deployment recipe and avoid silently rewriting application dates. |
| [#571 Join tables with differing uniqueness](https://github.com/bookshelf/bookshelf/issues/571) | Relations | P2 | ALREADY_FIXED | Rebound carries the upstream duplicate-ID eager-loading correction and exposes `{merge: false, remove: false}` on eager fetches to retain repeated target IDs with distinct pivot data. Existing integration coverage exercises that opt-in. This is the canonical item for #1923 and #2039; default collection identity still deduplicates by target primary key. |
| [#650 `where` does not use `model.parse`](https://github.com/bookshelf/bookshelf/issues/650) | Parse/format | P4 | REJECT | `where` is deliberately a Knex query pass-through using database column names. Implicit parsing would break operators, qualified names, expressions, JSON paths, and existing queries. Clarify the boundary instead. |
| [#668 `format` is extremely confusing](https://github.com/bookshelf/bookshelf/issues/668) | Parse/format | P2 | ADD | Current reads still invoke `format` while constructing attribute constraints. Preserve that 2.x behavior, but accept an opt-in write-only formatter with tests and migration documentation rather than silently redefining `format`. |
| [#677 How to use join in a custom query](https://github.com/bookshelf/bookshelf/issues/677) | Support | P3 | REJECT | This is answered usage: obtain/tap the Knex builder through `query()` and express the joins there. No missing core behavior remains. |
| [#689 Expose Knex increment](https://github.com/bookshelf/bookshelf/issues/689) | Atomic updates | P2 | ALREADY_FIXED | Calling `model.query()` without arguments returns the Knex builder, including `increment()` and `decrement()`. Add an atomic-counter recipe; no wrapper is needed. |
| [#698 Update changed attributes only](https://github.com/bookshelf/bookshelf/issues/698) | Persistence/docs | P3 | ADD | `{patch: true}` persists the attributes passed to `save`; it does not infer a diff from a full input object. Document `model.changed`/an explicit patch payload and preserve the established contract. |
| [#719 Many-to-many polymorphic relations](https://github.com/bookshelf/bookshelf/issues/719) | Relations | P2 | ADD | The common workaround combines `belongsToMany` with an explicit morph discriminator. Accept a first-class, backward-compatible helper only with eager-load, attach/detach, discriminator, and multi-dialect tests. Canonical for #2073. |
| [#729 Default eager relations](https://github.com/bookshelf/bookshelf/issues/729) | Eager loading | P4 | REJECT | Recursive implicit eager loading creates cycle and unbounded-query risks and changes every fetch. Applications can override a base fetch method with an explicit bounded relation set. |
| [#730 `model.query().fetch()` does not limit the fetch query](https://github.com/bookshelf/bookshelf/issues/730) | Query correctness | P1 | FIX | The historical patch was incomplete and the current `Sync.first()` still unconditionally adds formatted model attributes to a pre-constrained query. Reproduce, define precedence, and prevent unrelated instance state from changing an explicit query. |
| [#748 Elaborate on `.through()` example](https://github.com/bookshelf/bookshelf/issues/748) | Documentation | P3 | ADD | Add end-to-end fetch and update examples for each supported through direction, including the generated join keys. This also makes unsupported mixed-direction chains explicit. |
| [#756 Extending in ES6](https://github.com/bookshelf/bookshelf/issues/756) | JavaScript compatibility | P2 | ALREADY_FIXED | A local Node 22 probe confirmed `class Account extends bookshelf.Model` constructs normally and honors getter-based `tableName`/`idAttribute`. Add that pattern to docs and CI. |
| [#773 Missing `Model#cid` documentation](https://github.com/bookshelf/bookshelf/issues/773) | Documentation | P3 | FIX | Models still receive `cid` and collections use it for unsaved identity, while generated docs reference it without defining it. Document the property and its process-local, non-persistent contract. |
| [#799 Remove collections from Bookshelf](https://github.com/bookshelf/bookshelf/issues/799) | Architecture | P4 | REJECT | Removing collections destroys drop-in compatibility and is a different ORM design. Retain collections throughout the maintained 2.x line. |
| [#802 No `change` event](https://github.com/bookshelf/bookshelf/issues/802) | Events/docs | P3 | FIX | The change event was deliberately removed, but inherited comments/options still imply Backbone-style change signaling. Remove stale claims and document which lifecycle events actually fire. |
| [#803 Proposal for API changes](https://github.com/bookshelf/bookshelf/issues/803) | Architecture | P4 | REJECT | This is a broad replacement API centered on stateless constructors and sessions. It conflicts with Rebound's drop-in objective; mine separable defects into focused issues instead. |
| [#853 Omit `returning id`](https://github.com/bookshelf/bookshelf/issues/853) | Insert compatibility | P2 | FIX | The original forced `returning id` behavior is gone, but a current no-primary-key SQLite insert still auto-refreshes with `where logs.null = 1` and fails. Skip identity refresh when no scalar ID exists, preserve the successful insert state, and add no-ID/empty-response regressions. Canonical for the overlapping response handling in #1364. |
| [#865 Multiple-column `idAttribute`](https://github.com/bookshelf/bookshelf/issues/865) | Composite keys | P4 | REJECT | Bookshelf never fully supported composite primary keys and many identity/relation APIs assume one scalar key. Do not imply partial safety in 2.x; document unsupported status and use a surrogate key or explicit Knex queries. |
| [#886 camelCase `idAttribute` with relationships](https://github.com/bookshelf/bookshelf/issues/886) | Parse/relations | P2 | ALREADY_FIXED | Later inherited fixes format IDs on save/delete and resolve parsed IDs; current integration tests cover parsed/formatted `idAttribute` behavior. Add the reported eager-relation shape as a regression before closing the inherited item. |
| [#921 Document attaching/detaching events](https://github.com/bookshelf/bookshelf/issues/921) | Events/docs | P3 | FIX | `attaching`, `attached`, `detaching`, and `detached` execute in `lib/relation.js`, but generated event documentation remains incomplete. Add event contracts, arguments, error behavior, and transaction examples. |
| [#937 Required related](https://github.com/bookshelf/bookshelf/issues/937) | Relation filtering | P2 | DUPLICATE | Requiring a parent only when a related row matches is the same relation-existence/filtering capability tracked by [#1707](https://github.com/bookshelf/bookshelf/issues/1707). Keep one canonical design and test matrix there. |
| [#941 `Model.count` clears query](https://github.com/bookshelf/bookshelf/issues/941) | Query state | P2 | ALREADY_FIXED | `Collection#clone()` now clones `_knex`, allowing count and fetch from independent clones; query reset after execution remains intentional. Add a clone/count/fetch regression and document one-shot query state. |
| [#985 Deeper `withRelated` syntax](https://github.com/bookshelf/bookshelf/issues/985) | Eager-loading docs | P3 | ALREADY_FIXED | Current API documentation explicitly supports dot-separated nested eager paths such as `posts.tags`. Object callbacks remain for query customization, not grouping syntax. |
| [#991 `destroy()` resolves empty model](https://github.com/bookshelf/bookshelf/issues/991) | Promise contract | P4 | REJECT | Changing a successful `destroy()` resolution to `null` breaks existing chains and loses access to event context. Preserve the model return in 2.x and clarify post-destroy state. |
| [#1018 Relations in a sub-object](https://github.com/bookshelf/bookshelf/issues/1018) | Model API | P4 | REJECT | Moving relation methods breaks every model and plugin and collides with the existing loaded-relations store. Keep callable relation methods in a drop-in continuation; consider metadata tooling separately. |
| [#1019 Shared schema configuration](https://github.com/bookshelf/bookshelf/issues/1019) | Architecture | P4 | REJECT | A cross-ORM schema-file standard, migration generator, and model generator are separate projects. Rebound should consume explicit models and Knex migrations rather than own a new schema language. |
| [#1025 `.through()` does not work as expected](https://github.com/bookshelf/bookshelf/issues/1025) | Relations | P2 | ADD | Existing through support assumes same-direction chains; `hasMany -> interim belongsTo -> target` is not expressible naturally. Accept an explicit mixed-direction relation design with generated-SQL and nested-eager tests, without changing current through inference. |
| [#1031 `belongsTo` combined with `through`](https://github.com/bookshelf/bookshelf/issues/1031) | Relations | P2 | DUPLICATE | This is the inverse form of the mixed-direction through limitation in [#1025](https://github.com/bookshelf/bookshelf/issues/1025). Consolidate examples and acceptance tests under #1025. |
| [#1037 Single Table Inheritance](https://github.com/bookshelf/bookshelf/issues/1037) | Model construction | P4 | REJECT | STI policy is application-specific and can be implemented with factories/plugins after fetch. Automatically changing constructors from row data would destabilize identity, relations, and events in the drop-in core. |
| [#1042 Transparent compositional relationships](https://github.com/bookshelf/bookshelf/issues/1042) | Model composition | P4 | REJECT | Flattening joined tables into one writable model requires conflict and persistence semantics outside Bookshelf's relation model. Use a database view, explicit query, or custom serializer. |
| [#1061 Large collection/relation performance](https://github.com/bookshelf/bookshelf/issues/1061) | Performance | P2 | VERIFY | The 2015 profile predates the current runtime, Lodash, Knex, and eager-loader fixes. Build a reproducible 4,000-row benchmark and flame profile on Node 22/24 before accepting targeted optimizations. |
| [#1075 Count on a `belongsToMany` relation](https://github.com/bookshelf/bookshelf/issues/1075) | Relation correctness | P1 | FIX | Current `Sync.count()` adds constraints for `hasMany` or explicit through relations but not a plain `belongsToMany`; the reported global count remains plausible in current code. Add direct and through count tests, then apply joined constraints consistently. |
