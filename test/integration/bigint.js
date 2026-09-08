var Knex = require('knex');

module.exports = function(Bookshelf) {
  describe('MySQL BIGINT relations', function() {
    var storageId = '6227351521051279360';
    var connection = Bookshelf.knex.client.config.connection;
    var mysqlClient = Bookshelf.knex.client.config.client;
    var bigNumberKnex = Knex({
      client: mysqlClient,
      connection: Object.assign({}, connection, {
        supportBigNumbers: true,
        bigNumberStrings: false
      })
    });
    var stringOnlyKnex = Knex({
      client: mysqlClient,
      connection: Object.assign({}, connection, {
        supportBigNumbers: false,
        bigNumberStrings: true
      })
    });
    var bigNumberStringKnex = Knex({
      client: mysqlClient,
      connection: Object.assign({}, connection, {
        supportBigNumbers: true,
        bigNumberStrings: true
      })
    });
    var bigNumberBookshelf = require('../../bookshelf')(bigNumberKnex);
    var stringOnlyBookshelf = require('../../bookshelf')(stringOnlyKnex);
    var bigNumberStringBookshelf = require('../../bookshelf')(bigNumberStringKnex);

    function modelsFor(bookshelf) {
      var StorageDetail = bookshelf.Model.extend({
        tableName: 'storage_details_1495'
      });
      var Storage = bookshelf.Model.extend({
        tableName: 'storages_1495',
        idAttribute: 'storage_rec_id',
        details: function() {
          return this.hasMany(StorageDetail, 'storage_rec_id');
        }
      });

      return {Storage: Storage};
    }

    before(function() {
      return Bookshelf.knex.schema
        .dropTableIfExists('storage_details_1495')
        .dropTableIfExists('storages_1495')
        .createTable('storages_1495', function(table) {
          table.bigInteger('storage_rec_id').primary();
          table.string('name');
        })
        .createTable('storage_details_1495', function(table) {
          table.increments();
          table.bigInteger('storage_rec_id').notNullable();
          table.string('name');
        })
        .then(function() {
          return Bookshelf.knex('storages_1495').insert({storage_rec_id: storageId, name: 'primary'});
        })
        .then(function() {
          return Bookshelf.knex('storage_details_1495').insert({
            storage_rec_id: storageId,
            name: 'detail'
          });
        });
    });

    after(function() {
      return Bookshelf.knex.schema
        .dropTableIfExists('storage_details_1495')
        .dropTableIfExists('storages_1495')
        .then(function() {
          return Promise.all([
            bigNumberKnex.destroy(),
            stringOnlyKnex.destroy(),
            bigNumberStringKnex.destroy()
          ]);
        });
    });

    it('shows that the mysql driver loses precision with its default settings', function() {
      var Storage = modelsFor(Bookshelf).Storage;

      return new Storage({storage_rec_id: storageId})
        .fetch({withRelated: ['details']})
        .then(function(storage) {
          expect(storage.get('storage_rec_id')).to.equal(Number(storageId));
          expect(storage.related('details')).to.have.length(0);
        });
    });

    it('preserves an unsafe BIGINT with supportBigNumbers enabled', function() {
      var Storage = modelsFor(bigNumberBookshelf).Storage;

      return new Storage({storage_rec_id: storageId})
        .fetch({withRelated: ['details']})
        .then(function(storage) {
          expect(storage.get('storage_rec_id')).to.equal(storageId);
          expect(storage.related('details')).to.have.length(1);
          expect(storage.related('details').at(0).get('storage_rec_id')).to.equal(storageId);
        });
    });

    it('shows that bigNumberStrings alone is ignored by the mysql driver', function() {
      var Storage = modelsFor(stringOnlyBookshelf).Storage;

      return new Storage({storage_rec_id: storageId})
        .fetch({withRelated: ['details']})
        .then(function(storage) {
          expect(storage.get('storage_rec_id')).to.equal(Number(storageId));
          expect(storage.related('details')).to.have.length(0);
        });
    });

    it('preserves BIGINT values as strings with both mysql big-number settings', function() {
      var Storage = modelsFor(bigNumberStringBookshelf).Storage;

      return new Storage({storage_rec_id: storageId})
        .fetch({withRelated: ['details']})
        .then(function(storage) {
          expect(storage.get('storage_rec_id')).to.equal(storageId);
          expect(storage.related('details')).to.have.length(1);
          expect(storage.related('details').at(0).get('storage_rec_id')).to.equal(storageId);
        });
    });
  });
};
