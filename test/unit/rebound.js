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
  });
};
