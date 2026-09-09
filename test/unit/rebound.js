var assert = require('assert');
var Knex = require('knex');

module.exports = function () {
  describe('Bookshelf Rebound package boundary', function () {
    it('exports the library factory through the package main entry', function () {
      assert.strictEqual(require('../..'), require('../../bookshelf'));
    });

    it('retains the Bookshelf CommonJS initialization contract', function () {
      var knex = Knex({client: 'sqlite3', useNullAsDefault: true});
      var bookshelf = require('../..')(knex);

      assert.strictEqual(bookshelf.knex, knex);
      assert.strictEqual(typeof bookshelf.Model, 'function');
      assert.strictEqual(typeof bookshelf.Collection, 'function');
      assert.strictEqual(typeof bookshelf.model, 'function');
      assert.strictEqual(typeof bookshelf.collection, 'function');
      assert.strictEqual(typeof bookshelf.plugin, 'function');
      assert.strictEqual(bookshelf.VERSION, require('../../package.json').version);

      return knex.destroy();
    });

    it('fires created events before the surrounding transaction commits', function () {
      var knex = Knex({client: 'sqlite3', connection: {filename: ':memory:'}, useNullAsDefault: true});
      var bookshelf = require('../..')(knex);
      var Record = bookshelf.Model.extend({tableName: 'transaction_event_records'});
      var createdFired = false;
      var rollback = new Error('rollback after created');

      return knex.schema
        .createTable('transaction_event_records', function (table) {
          table.increments();
          table.string('name');
        })
        .then(function () {
          return bookshelf.transaction(function (transacting) {
            var record = new Record();
            record.on('created', function (model, options) {
              createdFired = true;
              assert.strictEqual(model, record);
              assert.strictEqual(options.transacting, transacting);
            });

            return record.save({name: 'not committed'}, {transacting: transacting}).then(function () {
              throw rollback;
            });
          });
        })
        .then(
          function () {
            assert.fail('Expected the transaction to roll back');
          },
          function (error) {
            assert.strictEqual(error, rollback);
          }
        )
        .then(function () {
          assert.strictEqual(createdFired, true);
          return knex('transaction_event_records');
        })
        .then(function (rows) {
          assert.deepStrictEqual(rows, []);
        })
        .finally(function () {
          return knex.destroy();
        });
    });

    it('keeps model registries isolated in per-connection factories', function () {
      var firstKnex = Knex({client: 'pg'});
      var secondKnex = Knex({client: 'pg'});

      function createModels(knex) {
        var bookshelf = require('../..')(knex);
        var Account = bookshelf.model('Account', {tableName: 'accounts'});
        return {bookshelf: bookshelf, Account: Account};
      }

      var first = createModels(firstKnex);
      var second = createModels(secondKnex);

      assert.notStrictEqual(first.bookshelf, second.bookshelf);
      assert.notStrictEqual(first.Account, second.Account);
      assert.strictEqual(first.bookshelf.knex, firstKnex);
      assert.strictEqual(second.bookshelf.knex, secondKnex);
      assert.strictEqual(first.bookshelf.model('Account'), first.Account);
      assert.strictEqual(second.bookshelf.model('Account'), second.Account);

      return Promise.all([firstKnex.destroy(), secondKnex.destroy()]);
    });
  });
};
