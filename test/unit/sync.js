var _ = require('lodash');
var path = require('path');
var basePath = process.cwd();

module.exports = function() {
  var Sync = require(path.resolve(basePath + '/lib/sync'));

  describe('Sync', function() {
    var stubModel = function(idAttribute) {
      var qd = [];

      return {
        idAttribute: idAttribute || 'id',
        id: 'pk',
        attributes: {
          idAttribute: 'pk'
        },
        tableName: 'testtable',
        format: _.identity,
        isNew: function() {
          return true;
        },
        queryData: qd,
        operation: null,
        query: function() {
          return this._query;
        },
        _query: {
          _statements: qd,
          where: function(where) {
            qd.push({grouping: 'where', where});
          },
          limit: function(limit) {
            qd.push({grouping: 'limit', limit});
          }
        },
        resetQuery: function() {
          return this;
        },
        getWhereParts: function() {
          return qd
            .filter(function(item) {
              return item.grouping == 'where';
            })
            .map(function(item) {
              return item.where;
            });
        }
      };
    };

    it('accepts a withSchema option', function() {
      var testSchema = 'test';
      var setSchema = sinon.spy();
      var mockModel = {
        query: function() {
          return {withSchema: setSchema};
        },
        resetQuery: function() {}
      };

      new Sync(mockModel, {withSchema: testSchema});

      setSchema.should.have.been.calledWith(testSchema);
    });

    it('accepts a lock option option if called with a transaction', function() {
      var setLock = sinon.spy();
      var mockModel = {
        query: function() {
          return {forUpdate: setLock, transacting: function() {}};
        },
        resetQuery: function() {}
      };

      new Sync(mockModel, {
        lock: 'forUpdate',
        transacting: {isTransaction: true, client: {transacting: true}}
      });

      setLock.should.have.been.called;
    });

    it('rejects the misspelled transaction option', function() {
      var mockModel = {
        query: function() {
          return {};
        },
        resetQuery: function() {}
      };

      expect(function() {
        new Sync(mockModel, {transaction: {client: {transacting: true}}});
      }).to.throw(TypeError, 'Unknown option "transaction". Use "transacting" instead.');
    });

    it('rejects an invalid transacting handle', function() {
      var setTransaction = sinon.spy();
      var mockModel = {
        query: function() {
          return {transacting: setTransaction};
        },
        resetQuery: function() {}
      };

      expect(function() {
        new Sync(mockModel, {transacting: {client: {transacting: false}}});
      }).to.throw(TypeError, 'The "transacting" option must be a Knex transaction.');
      setTransaction.should.not.have.been.called;
    });

    it('ignores the lock option if called without a transaction', function() {
      var setLock = sinon.spy();
      var mockModel = {
        query: function() {
          return {forUpdate: setLock, transacting: function() {}};
        },
        resetQuery: function() {}
      };

      new Sync(mockModel, {lock: 'forUpdate'});

      setLock.should.not.have.been.called;
    });

    describe('prefixFields', function() {
      it('should prefix all keys of the passed in object with the tablename', function() {
        var sync = new Sync(stubModel());
        var attributes = {
          some: 'column',
          another: 'column'
        };

        expect(sync.prefixFields(attributes)).to.eql({
          'testtable.some': 'column',
          'testtable.another': 'column'
        });
      });

      it('should run after format for select', function() {
        var attributes = {
          Some: 'column',
          Another: 'column'
        };
        var sync = new Sync(
          _.extend(stubModel(), {
            format: function(attrs) {
              var data = {};
              for (var key in attrs) {
                data[key.toLowerCase()] = attrs[key];
              }
              return data;
            }
          })
        );

        sync.select = function() {
          expect(this.syncing.queryData[0].where).to.eql({
            'testtable.some': 'column',
            'testtable.another': 'column'
          });
        };

        return sync.first(attributes);
      });

      it('should format attributes for updates, including id attribute', function(done) {
        var snakeCase = _.snakeCase;
        var stubModelInstance = _.extend(stubModel('idAttribute'), {
          format: function(attrs) {
            var data = {};
            for (var key in attrs) {
              data[snakeCase(key)] = attrs[key];
            }
            return data;
          }
        });
        var updateFields = {
          someColumn: 'updated',
          otherColumn: 'updated'
        };

        stubModelInstance._query.update = function(attrs) {
          expect(stubModelInstance.getWhereParts()).to.eql([{id_attribute: 'pk'}]);
          expect(attrs).to.eql({
            some_column: 'updated',
            other_column: 'updated'
          });
          done();
        };

        var sync = new Sync(stubModelInstance);
        sync.update(updateFields);
      });

      it('should format id attribute for deletes', function(done) {
        var snakeCase = _.snakeCase;
        var stubModelInstance = _.extend(stubModel('idAttribute'), {
          idAttribute: 'idAttribute',
          format: function(attrs) {
            var data = {};
            for (var key in attrs) {
              data[snakeCase(key)] = attrs[key];
            }
            return data;
          }
        });

        stubModelInstance._query.del = function() {
          expect(stubModelInstance.getWhereParts()).to.eql([{id_attribute: 'pk'}]);
          done();
        };

        var sync = new Sync(stubModelInstance);
        sync.del();
      });
    });

    describe('first', function() {
      it('does not add model attributes to an explicitly constrained query', function() {
        var model = stubModel();
        model._query.where({status: 'active'});
        var sync = new Sync(model);

        sync.select = function() {
          expect(this.syncing.getWhereParts()).to.eql([{status: 'active'}]);
        };

        return sync.first({status: 'archived'});
      });

      it('treats an explicit query as complete with a custom idAttribute', function() {
        var model = stubModel('token');
        model._query.where({token: 'explicit-token'});
        var sync = new Sync(model);

        sync.select = function() {
          expect(this.syncing.getWhereParts()).to.eql([{token: 'explicit-token'}]);
        };

        return sync.first({token: 'model-token', status: 'archived'});
      });

      it('ignores object model state when an explicit query supplies the constraint', function() {
        var model = stubModel();
        model._query.where({status: 'active'});
        var sync = new Sync(model);

        sync.select = function() {
          expect(this.syncing.getWhereParts()).to.eql([{status: 'active'}]);
        };

        return sync.first({settings: {access: 'admin'}});
      });

      it('uses only the primary key when the model also contains object or array attributes', function() {
        var sync = new Sync(stubModel());

        sync.select = function() {
          expect(this.syncing.getWhereParts()).to.eql([{'testtable.id': 'pk'}]);
        };

        return sync.first({
          id: 'pk',
          settings: {access: 'admin'},
          roles: ['admin']
        });
      });

      it('rejects a plain-object fetch attribute when no primary key is present', function() {
        var sync = new Sync(stubModel());
        sync.select = sinon.spy();

        return sync.first({settings: {access: 'admin'}}).then(
          function() {
            throw new Error('Expected the unsafe fetch attribute to be rejected');
          },
          function(error) {
            expect(error).to.be.instanceOf(TypeError);
            expect(error.message).to.contain('attribute "settings"');
            sync.select.should.not.have.been.called;
          }
        );
      });

      it('rejects an array fetch attribute when no primary key is present', function() {
        var sync = new Sync(stubModel());
        sync.select = sinon.spy();

        return sync.first({roles: ['admin']}).then(
          function() {
            throw new Error('Expected the unsafe fetch attribute to be rejected');
          },
          function(error) {
            expect(error).to.be.instanceOf(TypeError);
            expect(error.message).to.contain('attribute "roles"');
            sync.select.should.not.have.been.called;
          }
        );
      });

      it('rejects an object-valued primary key', function() {
        var sync = new Sync(stubModel());
        sync.select = sinon.spy();

        return sync.first({id: {value: 'pk'}}).then(
          function() {
            throw new Error('Expected the unsafe primary key to be rejected');
          },
          function(error) {
            expect(error).to.be.instanceOf(TypeError);
            expect(error.message).to.contain('attribute "id"');
            sync.select.should.not.have.been.called;
          }
        );
      });
    });

    describe('update', function() {
      it('does not request returned rows for an update without a stable model identity', function() {
        var model = stubModel();
        model.id = null;
        model._query.client = {config: {client: 'pg'}};
        model._query._statements.push({grouping: 'where'});
        model._query.returning = sinon.spy();
        model._query.update = sinon.stub().resolves(2);
        var sync = new Sync(model);

        return sync.update({status: 'archived'}).then(function() {
          model._query.returning.should.not.have.been.called;
        });
      });

      it("doesn't try to update the primary key if it hasn't changed", function() {
        var sync = new Sync(stubModel());
        _.extend(sync.query, {
          update: function(attrs) {
            expect(attrs).to.not.have.property('id');
          },
          where: function() {
            this._statements = [{grouping: 'where'}];
          }
        });

        return sync.update({id: 'pk', name: 'something'});
      });

      it('will update the primary key if it has changed', function() {
        var sync = new Sync(stubModel());
        _.extend(sync.query, {
          update: function(attrs) {
            expect(attrs).to.have.property('id');
            expect(attrs.id).to.equal('updated');
          },
          where: function() {
            this._statements = [{grouping: 'where'}];
          }
        });

        return sync.update({id: 'updated', name: 'something'});
      });
    });

    describe('columns added by fetching hooks', function() {
      const knex = require('knex')({
        client: 'sqlite3',
        connection: {filename: ':memory:'},
        useNullAsDefault: true
      });
      const bookshelf = require(path.resolve(basePath, 'bookshelf'))(knex);
      const Thing = bookshelf.Model.extend({tableName: 'things_1442'});
      const Parent = bookshelf.Model.extend({
        tableName: 'parents_1442',
        things: function() {
          return this.hasMany(Thing, 'parent_id');
        }
      });

      before(function() {
        return knex.schema
          .createTable('parents_1442', function(table) {
            table.increments();
            table.string('name');
          })
          .createTable('things_1442', function(table) {
            table.increments();
            table.integer('parent_id');
            table.string('column_a');
            table.string('column_b');
          })
          .then(function() {
            return knex('parents_1442').insert({id: 1, name: 'parent'});
          })
          .then(function() {
            return knex('things_1442').insert({id: 1, parent_id: 1, column_a: 'kept', column_b: 'hidden'});
          });
      });

      after(function() {
        return knex.destroy();
      });

      it('respects columns added by a fetching event', function() {
        const thing = new Thing({id: 1});
        thing.on('fetching', function(model, columns, options) {
          options.query.columns('id', 'column_a');
        });

        return thing.fetch().then(function(result) {
          expect(result.toJSON()).to.eql({id: 1, column_a: 'kept'});
        });
      });

      it('respects columns added by a fetching:collection event', function() {
        const thing = new Thing();
        thing.on('fetching:collection', function(collection, columns, options) {
          options.query.columns('id', 'column_a');
        });

        return thing.fetchAll().then(function(result) {
          expect(result.toJSON()).to.eql([{id: 1, column_a: 'kept'}]);
        });
      });

      it('preserves explicit eager relation columns', function() {
        return new Parent({id: 1})
          .fetch({
            withRelated: {
              things: function(query) {
                query.columns('things_1442.id', 'things_1442.parent_id', 'things_1442.column_a');
              }
            }
          })
          .then(function(result) {
            expect(result.related('things').toJSON()).to.eql([{id: 1, parent_id: 1, column_a: 'kept'}]);
          });
      });
    });
  });
};
