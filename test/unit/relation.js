var path = require('path');
var basePath = process.cwd();

module.exports = function() {
  const knex = require('knex')({
    client: 'sqlite3',
    connection: {filename: ':memory:'},
    useNullAsDefault: true
  });
  const bookshelf = require(path.resolve(basePath, 'bookshelf'))(knex);
  const Helpers = require(path.resolve(basePath, 'lib/helpers'));
  const Target = bookshelf.Model.extend({tableName: 'targets'});
  const Parent = bookshelf.Model.extend({
    tableName: 'parents',
    targets: function() {
      return this.belongsToMany(Target);
    }
  });
  const CustomTarget = bookshelf.Model.extend({tableName: 'custom_targets', idAttribute: 'slug'});
  const CustomParent = bookshelf.Model.extend({
    tableName: 'custom_parents',
    idAttribute: 'code',
    targets: function() {
      return this.belongsToMany(CustomTarget, 'custom_links', 'owner_code', 'target_slug', 'code', 'slug');
    }
  });
  const Right = bookshelf.Model.extend({tableName: 'rights'});
  const Join = bookshelf.Model.extend({tableName: 'lefts_rights'});
  var destroyingCount = 0;
  var destroyedCount = 0;
  const HookJoin = Join.extend({
    initialize: function() {
      this.on('destroying', function() {
        destroyingCount++;
      });
      this.on('destroyed', function() {
        destroyedCount++;
      });
    }
  });
  const Left = bookshelf.Model.extend({
    tableName: 'lefts',
    rights: function() {
      return this.belongsToMany(Right).through(Join);
    }
  });
  const HookLeft = Left.extend({
    rights: function() {
      return this.belongsToMany(Right).through(HookJoin);
    }
  });
  var Cat;
  const Tail = bookshelf.Model.extend({
    tableName: 'tails',
    cat: function() {
      return this.belongsTo(Cat, 'id_cat');
    }
  });
  Cat = bookshelf.Model.extend({
    tableName: 'cats',
    tail: function() {
      return this.hasOne(Tail, 'id_cat');
    }
  });

  before(function() {
    return knex.schema
      .createTable('targets', function(table) {
        table.increments();
        table.string('name');
      })
      .createTable('parents_targets', function(table) {
        table.integer('parent_id').notNullable();
        table.integer('target_id').notNullable();
      })
      .createTable('custom_targets', function(table) {
        table.string('slug').primary();
        table.string('name');
      })
      .createTable('custom_links', function(table) {
        table.string('owner_code').notNullable();
        table.string('target_slug').notNullable();
      })
      .createTable('rights', function(table) {
        table.increments();
        table.string('name');
      })
      .createTable('lefts_rights', function(table) {
        table.increments();
        table.integer('left_id').notNullable();
        table.integer('right_id').notNullable();
      })
      .createTable('cats', function(table) {
        table.increments();
        table.string('name');
      })
      .createTable('tails', function(table) {
        table.increments();
        table.integer('id_cat').notNullable();
        table.string('color');
      })
      .then(function() {
        return knex('targets').insert([{id: 10}, {id: 11}, {id: 12}]);
      })
      .then(function() {
        return knex('parents_targets').insert([
          {parent_id: 1, target_id: 10},
          {parent_id: 1, target_id: 11},
          {parent_id: 2, target_id: 12}
        ]);
      })
      .then(function() {
        return knex('custom_targets').insert([{slug: 'a'}, {slug: 'b'}, {slug: 'c'}]);
      })
      .then(function() {
        return knex('custom_links').insert([
          {owner_code: 'owner-a', target_slug: 'a'},
          {owner_code: 'owner-a', target_slug: 'b'},
          {owner_code: 'owner-b', target_slug: 'c'}
        ]);
      })
      .then(function() {
        return knex('rights').insert([{id: 10}, {id: 11}, {id: 12}]);
      });
  });

  after(function() {
    return knex.destroy();
  });

  describe('Relation', function() {
    it('only adds distinct to joined PostgreSQL relations', function() {
      const pgKnex = require('knex')({client: 'pg'});
      const pgBookshelf = require(path.resolve(basePath, 'bookshelf'))(pgKnex);
      const CompletionDate = pgBookshelf.Model.extend({tableName: 'completion_dates'});
      const Role = pgBookshelf.Model.extend({tableName: 'roles'});
      const Applicant = pgBookshelf.Model.extend({
        tableName: 'applicants',
        completionDate: function() {
          return this.hasOne(CompletionDate, 'applicant_id');
        },
        roles: function() {
          return this.belongsToMany(Role);
        }
      });
      const relation = new Applicant({id: 7}).completionDate();
      const query = relation.query();

      relation.relatedData.selectConstraints(query, {});

      expect(query.toSQL().sql).to.equal(
        'select "completion_dates".* from "completion_dates" where "completion_dates"."applicant_id" = ? limit ?'
      );

      const joinedRelation = new Applicant({id: 7}).roles();
      const joinedQuery = joinedRelation.query();
      joinedRelation.relatedData.selectConstraints(joinedQuery, {});
      expect(joinedQuery.toSQL().sql).to.match(/^select distinct /);

      return pgKnex.destroy();
    });

    it('accepts an actual Knex transaction handle', function() {
      return knex.transaction(function(transaction) {
        expect(function() {
          Helpers.validateTransactionOptions({transacting: transaction});
        }).not.to.throw();
        return Promise.resolve();
      });
    });

    it('rejects a misspelled transaction option before a pivot write', function() {
      return new Parent({id: 1})
        .targets()
        .attach(2, {transaction: {}})
        .then(
          function() {
            throw new Error('Expected the misspelled transaction option to be rejected');
          },
          function(error) {
            expect(error).to.be.instanceOf(TypeError);
            expect(error.message).to.equal('Unknown option "transaction". Use "transacting" instead.');
          }
        );
    });

    describe('relation counts', function() {
      it('constrains a belongsToMany count through its join table', function() {
        return new Parent({id: 1})
          .targets()
          .count()
          .then(function(count) {
            expect(count).to.equal(2);
          });
      });

      it('uses custom belongsToMany keys for the count constraint', function() {
        return new CustomParent({code: 'owner-a'})
          .targets()
          .count()
          .then(function(count) {
            expect(count).to.equal(2);
          });
      });

      it('constrains a through relation count', function() {
        return knex('lefts_rights')
          .del()
          .then(function() {
            return knex('lefts_rights').insert([
              {left_id: 1, right_id: 10},
              {left_id: 1, right_id: 11},
              {left_id: 2, right_id: 12}
            ]);
          })
          .then(function() {
            return new Left({id: 1}).rights().count();
          })
          .then(function(count) {
            expect(count).to.equal(2);
          });
      });

      ['pg', 'mysql'].forEach(function(client) {
        it('compiles the belongsToMany count constraint for ' + client, function() {
          const dialectKnex = require('knex')({client: client});
          let sql;
          dialectKnex.client.runner = function(builder) {
            return {
              run: function() {
                sql = builder.toSQL().sql;
                return Promise.resolve([{count: 2}]);
              }
            };
          };
          const dialectBookshelf = require(path.resolve(basePath, 'bookshelf'))(dialectKnex);
          const DialectTarget = dialectBookshelf.Model.extend({tableName: 'targets'});
          const DialectParent = dialectBookshelf.Model.extend({
            tableName: 'parents',
            targets: function() {
              return this.belongsToMany(DialectTarget);
            }
          });

          return new DialectParent({id: 1})
            .targets()
            .count()
            .then(function(count) {
              expect(count).to.equal(2);
              expect(sql).to.match(/inner join [`"]parents_targets[`"] on/);
              expect(sql).to.match(/where [`"]parents_targets[`"].[`"]parent_id[`"] = \?/);
            })
            .finally(function() {
              return dialectKnex.destroy();
            });
        });
      });
    });

    describe('through detach', function() {
      beforeEach(function() {
        destroyingCount = 0;
        destroyedCount = 0;
        return knex('lefts_rights')
          .del()
          .then(function() {
            return knex('lefts_rights').insert([
              {left_id: 1, right_id: 10},
              {left_id: 1, right_id: 11}
            ]);
          });
      });

      it('detaches every matching row with one delete query', function() {
        var queries = [];
        var onQuery = function(query) {
          queries.push(query.sql);
        };
        knex.on('query', onQuery);

        return new Left({id: 1})
          .rights()
          .detach()
          .finally(function() {
            knex.removeListener('query', onQuery);
          })
          .then(function() {
            expect(queries).to.have.length(1);
            expect(queries[0]).to.match(/^delete from /i);
            return knex('lefts_rights').where({left_id: 1});
          })
          .then(function(rows) {
            expect(rows).to.have.length(0);
          });
      });

      it('detaches a specified id and leaves a missing id as a no-op', function() {
        var rights = new Left({id: 1}).rights();
        rights.add([{id: 10}, {id: 11}]);

        return rights
          .detach(10)
          .then(function() {
            expect(rights.pluck('id')).to.eql([11]);
            return rights.detach(99);
          })
          .then(function() {
            return knex('lefts_rights').where({left_id: 1}).orderBy('right_id');
          })
          .then(function(rows) {
            expect(rows.map(function(row) {
              return row.right_id;
            })).to.eql([11]);
          });
      });

      it('treats an empty id list and an unmatched parent as no-ops', function() {
        return new Left({id: 1})
          .rights()
          .detach([])
          .then(function() {
            return new Left({id: 2}).rights().detach();
          })
          .then(function() {
            return knex('lefts_rights').where({left_id: 1});
          })
          .then(function(rows) {
            expect(rows).to.have.length(2);
          });
      });

      it('preserves through-model destroy hooks', function() {
        return new HookLeft({id: 1})
          .rights()
          .detach()
          .then(function() {
            expect(destroyingCount).to.equal(1);
            expect(destroyedCount).to.equal(1);
          });
      });

      it('uses the supplied transaction for the delete', function() {
        var rollback = new Error('rollback issue 1135');

        return knex
          .transaction(function(transaction) {
            return new Left({id: 1})
              .rights()
              .detach(null, {transacting: transaction})
              .then(function() {
                return transaction('lefts_rights').where({left_id: 1});
              })
              .then(function(rows) {
                expect(rows).to.have.length(0);
                throw rollback;
              });
          })
          .catch(function(error) {
            expect(error).to.equal(rollback);
          })
          .then(function() {
            return knex('lefts_rights').where({left_id: 1});
          })
          .then(function(rows) {
            expect(rows).to.have.length(2);
          });
      });
    });

    it('saves a hasOne model loaded through a parent collection', function() {
      return knex('tails')
        .del()
        .then(function() {
          return knex('cats').del();
        })
        .then(function() {
          return knex('cats').insert([
            {id: 1, name: 'Felix'},
            {id: 2, name: 'Milo'}
          ]);
        })
        .then(function() {
          return knex('tails').insert([
            {id: 1, id_cat: 1, color: 'black'},
            {id: 2, id_cat: 2, color: 'orange'}
          ]);
        })
        .then(function() {
          return Cat.fetchAll({withRelated: ['tail']});
        })
        .then(function(cats) {
          const felixTail = cats.at(0).related('tail');
          const miloTail = cats.at(1).related('tail');
          expect(felixTail.relatedData.parentFk).to.equal(1);
          expect(miloTail.relatedData.parentFk).to.equal(2);
          return Promise.all([felixTail.save({color: 'white'}), miloTail.save({color: 'brown'})]);
        })
        .then(function(tails) {
          expect(tails[0].attributes).to.eql({id: 1, id_cat: 1, color: 'white'});
          expect(tails[1].attributes).to.eql({id: 2, id_cat: 2, color: 'brown'});
        });
    });
  });
};
