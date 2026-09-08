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

  before(function() {
    return knex.schema.createTable('lefts_rights', function(table) {
      table.increments();
      table.integer('left_id').notNullable();
      table.integer('right_id').notNullable();
    });
  });

  after(function() {
    return knex.destroy();
  });

  describe('Relation', function() {
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
  });
};
