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
  });
};
