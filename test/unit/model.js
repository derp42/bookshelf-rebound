var {deepEqual, equal, notStrictEqual} = require('assert');
var _ = require('lodash');
var path = require('path');
var basePath = process.cwd();

module.exports = function() {
  const Model = require(path.resolve(basePath, 'lib/model'));
  const Collection = require(path.resolve(basePath, 'lib/collection'));

  describe('Model', function() {
    describe('#save()', function() {
      ['insert', 'update'].forEach(function(method) {
        it('forwards withSchema to the automatic refresh after ' + method, function() {
          const model = new Model({id: 1, name: 'Ada'});
          const sync = {};
          sync[method] = function() {
            return Promise.resolve(method === 'insert' ? [1] : 1);
          };
          model.sync = function() {
            return sync;
          };
          model.refresh = sinon.stub().resolves(model);

          return model.save(null, {method: method, withSchema: 'tenant'}).then(function() {
            expect(model.refresh).to.have.been.calledOnce;
            deepEqual(model.refresh.firstCall.args[0], {
              silent: true,
              transacting: undefined,
              withSchema: 'tenant'
            });
          });
        });
      });

      it('should clone the passed in `options` object', function() {
        var model = new Model();
        var options = {
          query: {}
        };

        model.sync = function(opts) {
          notStrictEqual(options, opts);

          return {
            insert: function(opts) {
              return Promise.resolve({});
            }
          };
        };

        model.refresh = () => Promise.resolve({});

        return model.save(null, options).then(function() {
          equal(_.difference(Object.keys(options), ['query']).length, 0);
        });
      });

      describe('when the save method is update', () => {
        it('should not call model.parse with a non-object argument', () => {
          const model = new Model();
          model.sync = () => {
            return {
              update: () => {
                return Promise.resolve(1);
              }
            };
          };
          model.refresh = () => Promise.resolve({});
          const parse = sinon.spy(model, 'parse');
          return model.save(null, {method: 'update'}).then(function() {
            expect(parse).not.to.have.been.calledWith(undefined);
          });
        });

        it('should merge the updated attributes on the existing model', () => {
          const model = new Model({oldProp: 'b'});
          model.id = 1;
          model.sync = () => {
            return {
              update: () => {
                return Promise.resolve([{newProp: 'a'}]);
              }
            };
          };
          model.refresh = () => Promise.resolve({});
          const parse = sinon.spy(model, 'parse');
          return model.save(null, {method: 'update'}).then(function(updatedModel) {
            expect(parse).to.have.been.calledWith({newProp: 'a'});
            expect(updatedModel.toJSON()).to.eql({oldProp: 'b', newProp: 'a'});
          });
        });

        it('does not auto-refresh an update without a stable model identity', () => {
          const model = new Model({status: 'archived'});
          model.sync = () => {
            return {
              update: () => Promise.resolve(2)
            };
          };
          model.refresh = sinon.stub().resolves(model);

          return model.save(null, {method: 'update'}).then(function(updatedModel) {
            expect(updatedModel).to.equal(model);
            expect(model.refresh).not.to.have.been.called;
          });
        });

        it('does not hydrate a broad update from the first returned row', () => {
          const model = new Model({status: 'archived'});
          model.sync = () => {
            return {
              update: () =>
                Promise.resolve([
                  {id: 1, status: 'archived'},
                  {id: 2, status: 'archived'}
                ])
            };
          };
          model.refresh = sinon.stub().resolves(model);

          return model.save(null, {method: 'update'}).then(function(updatedModel) {
            expect(updatedModel.attributes).to.eql({status: 'archived'});
            expect(model.refresh).not.to.have.been.called;
          });
        });
      });

      describe('when the save method is insert', () => {
        it('should not call model.parse with a non-object argument', () => {
          const model = new Model();
          model.id = '12345';
          model.sync = () => {
            return {
              insert: () => {
                return Promise.resolve(['12345']);
              }
            };
          };
          model.refresh = () => Promise.resolve({});
          const parse = sinon.spy(model, 'parse');
          return model.save(null, {method: 'insert'}).then(function() {
            expect(parse).not.to.have.been.calledWith('12345');
          });
        });

        it('preserves a SQLite insert for a model without a scalar id', () => {
          const knex = require('knex')({
            client: 'sqlite3',
            connection: {filename: ':memory:'},
            useNullAsDefault: true
          });
          const bookshelf = require(path.resolve(basePath, 'bookshelf'))(knex);
          const Log = bookshelf.Model.extend({tableName: 'logs', idAttribute: null});
          const queries = [];
          const onQuery = function(query) {
            queries.push(query.sql);
          };
          const log = new Log({message: 'written'});

          return knex.schema
            .createTable('logs', function(table) {
              table.string('message');
            })
            .then(function() {
              knex.on('query', onQuery);
              return log.save();
            })
            .then(function(savedLog) {
              knex.removeListener('query', onQuery);
              expect(savedLog).to.equal(log);
              expect(savedLog.id).to.equal(undefined);
              expect(savedLog.attributes).to.eql({message: 'written'});
              expect(queries).to.have.length(1);
              expect(queries[0]).to.match(/^insert into /i);
              return knex('logs');
            })
            .then(function(rows) {
              expect(rows).to.eql([{message: 'written'}]);
            })
            .finally(function() {
              knex.removeListener('query', onQuery);
              return knex.destroy();
            });
        });

        it('does not synthesize an id from an empty insert response', () => {
          const model = new Model({message: 'written'});
          model.idAttribute = null;
          model.sync = () => {
            return {
              insert: () => Promise.resolve([])
            };
          };
          model.refresh = sinon.stub().resolves(model);

          return model.save(null, {method: 'insert'}).then(function(savedModel) {
            expect(savedModel.attributes).to.eql({message: 'written'});
            expect(savedModel.refresh).not.to.have.been.called;
          });
        });

        it('uses a returned insert row without requiring a scalar id', () => {
          const model = new Model({message: 'pending'});
          model.idAttribute = null;
          model.sync = () => {
            return {
              insert: () => Promise.resolve([{message: 'written', created_at: 'now'}])
            };
          };
          model.refresh = sinon.stub().resolves(model);

          return model.save(null, {method: 'insert'}).then(function(savedModel) {
            expect(savedModel.attributes).to.eql({message: 'written', created_at: 'now'});
            expect(savedModel.refresh).not.to.have.been.called;
          });
        });
      });
    });

    describe('#fetchPage() grouped counts', function() {
      const knex = require('knex')({
        client: 'sqlite3',
        connection: {filename: ':memory:'},
        useNullAsDefault: true
      });
      const bookshelf = require(path.resolve(basePath, 'bookshelf'))(knex);
      const Activity = bookshelf.Model.extend({tableName: 'activities_2092'});

      before(function() {
        return knex.schema
          .createTable('activities_2092', function(table) {
            table.increments();
            table.string('occurred_at');
            table.string('category');
            table.integer('amount');
          })
          .then(function() {
            return knex('activities_2092').insert([
              {occurred_at: '2024-01-01', category: 'alpha', amount: 1},
              {occurred_at: '2024-01-15', category: 'alpha', amount: 2},
              {occurred_at: '2024-02-01', category: 'beta', amount: 3},
              {occurred_at: '2025-01-01', category: 'beta', amount: 4}
            ]);
          });
      });

      after(function() {
        return knex.destroy();
      });

      it('counts aliases produced by raw selects and grouped by name', function() {
        return Activity.forge()
          .query(function(query) {
            query.select(
              knex.raw("strftime('%Y', occurred_at) as year"),
              knex.raw("strftime('%m', occurred_at) as month")
            );
            query.sum('amount as total');
            query.groupBy('year', 'month');
          })
          .fetchPage({page: 1, pageSize: 2})
          .then(function(result) {
            expect(result).to.have.length(2);
            expect(result.pagination).to.eql({page: 1, pageSize: 2, rowCount: 3, pageCount: 2});
          });
      });

      it('counts rows from a groupByRaw query', function() {
        return Activity.forge()
          .query(function(query) {
            query.select('category');
            query.sum('amount as total');
            query.groupByRaw('category');
          })
          .fetchPage({page: 1, pageSize: 10})
          .then(function(result) {
            expect(result).to.have.length(2);
            expect(result.pagination.rowCount).to.equal(2);
            expect(result.pagination.pageCount).to.equal(1);
          });
      });
    });

    describe('#count() with grouping', function() {
      const knex = require('knex')({
        client: 'sqlite3',
        connection: {filename: ':memory:'},
        useNullAsDefault: true
      });
      const bookshelf = require(path.resolve(basePath, 'bookshelf'))(knex);
      const Entry = bookshelf.Model.extend({tableName: 'entries_1461'});

      before(function() {
        return knex.schema
          .createTable('entries_1461', function(table) {
            table.increments();
            table.string('category');
          })
          .then(function() {
            return knex('entries_1461').insert([{category: 'alpha'}, {category: 'alpha'}, {category: 'beta'}]);
          });
      });

      after(function() {
        return knex.destroy();
      });

      it('returns zero when a grouped count has no rows', function() {
        return Entry.forge()
          .where('category', 'missing')
          .query('groupBy', 'category')
          .count()
          .then(function(count) {
            expect(count).to.equal(0);
          });
      });

      it('preserves a non-empty grouped count', function() {
        return Entry.forge()
          .query(function(query) {
            query.groupBy('category').orderBy('category');
          })
          .count()
          .then(function(count) {
            expect(count).to.equal(2);
          });
      });
    });

    describe('#timestamp()', function() {
      it('will set the updated_at and the created_at attributes to a new date for new models', function() {
        var newModel = new Model({}, {hasTimestamps: true});
        newModel.timestamp();

        expect(newModel.get('created_at')).to.be.an.instanceOf(Date);
        expect(newModel.get('updated_at')).to.be.an.instanceOf(Date);
      });

      it('will not set the created_at attribute to a new date for existing models', function() {
        var existingModel = new Model({id: 1}, {hasTimestamps: true});
        existingModel.timestamp();

        expect(existingModel.get('created_at')).to.be.undefined;
        expect(existingModel.get('updated_at')).to.be.an.instanceOf(Date);
      });

      it('will set the created_at attribute when inserting new models with a predefined id value', function() {
        var model = new Model({id: 1}, {hasTimestamps: true});
        model.timestamp({method: 'insert'});

        expect(model.get('created_at')).to.be.an.instanceOf(Date);
        expect(model.get('updated_at')).to.be.an.instanceOf(Date);
      });

      it("will not set timestamps on a model if hasTimestamps isn't set", function() {
        var model = new Model();
        model.timestamp();

        expect(model.get('created_at')).to.not.exist;
        expect(model.get('updated_at')).to.not.exist;
      });
    });

    describe('#toJSON()', function() {
      let ModelCollection;
      let testModel;

      before(() => {
        ModelCollection = Collection.extend({model: Model});
      });

      beforeEach(() => {
        testModel = new Model({id: 1, firstName: 'Joe', lastName: 'Shmoe', address: '123 Main St.'});
      });

      it('includes the idAttribute in the hash', function() {
        const DifferentModel = Model.extend({idAttribute: '_id'});
        const testModel = new DifferentModel({_id: 1, name: 'Joe'});
        deepEqual(testModel.toJSON(), {_id: 1, name: 'Joe'});
      });

      it('includes the relations loaded on the model', function() {
        testModel.relations = {
          someList: new ModelCollection([{id: 1}, {id: 2}])
        };
        var json = testModel.toJSON();

        deepEqual(Object.keys(json), ['id', 'firstName', 'lastName', 'address', 'someList']);
        equal(json.someList.length, 2);
      });

      describe('with "shallow" option', function() {
        it("doesn't include the relations loaded on the model if {shallow: true} is passed", function() {
          testModel.relations = {
            someList: new ModelCollection([{id: 1}, {id: 2}])
          };
          var shallow = testModel.toJSON({shallow: true});

          deepEqual(_.keys(shallow), ['id', 'firstName', 'lastName', 'address']);
        });
      });

      describe('with "omitNew" option', function() {
        it('does not omit new models from collections and relations when {omitNew: false} is passed', function() {
          testModel.relations = {
            someList: new ModelCollection([{id: 2}, {attr2: 'Test'}]),
            someRel: new Model({id: 3}),
            otherRel: new Model({attr3: 'Test'})
          };
          var coll = new ModelCollection([testModel, new Model({attr5: 'Test'}), new Model({id: 4, attr4: 'Test'})]);
          var json = coll.toJSON({omitNew: false});

          equal(json.length, 3);
          equal(json[0].someList.length, 2);
          deepEqual(_.keys(json[0]), ['id', 'firstName', 'lastName', 'address', 'someList', 'someRel', 'otherRel']);
          deepEqual(_.keys(json[1]), ['attr5']);
          deepEqual(_.keys(json[2]), ['id', 'attr4']);
        });

        it('does not omit new models from collections and relations when omitNew is not specified', function() {
          testModel.relations = {
            someList: new ModelCollection([{id: 2}, {attr2: 'Test'}]),
            someRel: new Model({id: 3}),
            otherRel: new Model({attr3: 'Test'})
          };
          var coll = new ModelCollection([testModel, new Model({attr5: 'Test'}), new Model({id: 4, attr4: 'Test'})]);
          var json = coll.toJSON();

          equal(json.length, 3);
          equal(json[0].someList.length, 2);
          deepEqual(_.keys(json[0]), ['id', 'firstName', 'lastName', 'address', 'someList', 'someRel', 'otherRel']);
          deepEqual(_.keys(json[1]), ['attr5']);
          deepEqual(_.keys(json[2]), ['id', 'attr4']);
        });

        it('omits new models from collections and relations when {omitNew: true} is passed', function() {
          testModel.relations = {
            someList: new ModelCollection([{id: 2}, {attr2: 'Test'}]),
            someRel: new Model({id: 3}),
            otherRel: new Model({attr3: 'Test'})
          };
          var coll = new ModelCollection([testModel, new Model({attr5: 'Test'}), new Model({id: 4, attr4: 'Test'})]);
          var omitNew = coll.toJSON({omitNew: true});

          equal(omitNew.length, 2);
          deepEqual(_.keys(omitNew[0]), ['id', 'firstName', 'lastName', 'address', 'someList', 'someRel']);
          deepEqual(_.keys(omitNew[1]), ['id', 'attr4']);
          equal(omitNew[0].someList.length, 1);
        });

        it('returns null for a new model when {omitNew: true} is passed', function() {
          var testModel = new Model({attr1: 'Test'});
          var omitNew = testModel.toJSON({omitNew: true});
          deepEqual(omitNew, null);
        });

        it('preserves null relations unless {omitNew: true} is passed', function() {
          testModel.relations = {
            missing: {toJSON: function() { return null; }}
          };

          expect(testModel.toJSON()).to.have.property('missing', null);
          expect(testModel.toJSON({omitNew: false})).to.have.property('missing', null);
          expect(testModel.toJSON({omitNew: true})).not.to.have.property('missing');
        });
      });

      describe('with "visible" option', function() {
        it('only shows the fields specified in the model\'s "visible" property', function() {
          testModel.visible = ['firstName'];
          deepEqual(testModel.toJSON(), {firstName: 'Joe'});
        });

        it('only shows the fields specified in the "options.visible" property', function() {
          const json = testModel.toJSON({visible: ['firstName']});
          deepEqual(json, {firstName: 'Joe'});
        });

        it('allows overriding the model\'s "visible" property with a "options.visible" argument', function() {
          testModel.visible = ['lastName'];
          const json = testModel.toJSON({visible: ['firstName']});
          deepEqual(json, {firstName: 'Joe'});
        });
      });

      describe('with "hidden" option', function() {
        it('hides the fields specified in the model\'s "hidden" property', function() {
          testModel.hidden = ['firstName'];
          deepEqual(testModel.toJSON(), {id: 1, lastName: 'Shmoe', address: '123 Main St.'});
        });

        it('hides the fields specified in the "options.hidden" property', function() {
          const json = testModel.toJSON({hidden: ['firstName', 'id']});
          deepEqual(json, {lastName: 'Shmoe', address: '123 Main St.'});
        });

        it('prioritizes "hidden" if there are conflicts when using both "hidden" and "visible"', function() {
          testModel.visible = ['firstName', 'lastName'];
          testModel.hidden = ['lastName'];
          deepEqual(testModel.toJSON(), {firstName: 'Joe'});
        });

        it('prioritizes "options.hidden" if there are conflicts when using both "options.hidden" and "options.visible"', function() {
          const json = testModel.toJSON({visible: ['firstName', 'lastName'], hidden: ['lastName']});
          deepEqual(json, {firstName: 'Joe'});
        });

        it('allows overriding the model\'s "hidden" property with a "options.hidden" argument', function() {
          testModel.hidden = ['lastName'];
          const json = testModel.toJSON({hidden: ['firstName', 'id']});
          deepEqual(json, {lastName: 'Shmoe', address: '123 Main St.'});
        });

        it('prioritizes "options.hidden" when overriding both the model\'s "hidden" and "visible" properties with "options.hidden" and "options.visible" arguments', function() {
          testModel.visible = ['lastName', 'address'];
          testModel.hidden = ['address'];
          const json = testModel.toJSON({visible: ['firstName', 'lastName'], hidden: ['lastName']});

          deepEqual(json, {firstName: 'Joe'});
        });
      });

      it('ignores the model\'s "hidden" and "visible" properties with the "options.visibility" argument', function() {
        testModel.visible = ['firstName', 'lastName'];
        testModel.hidden = ['lastName'];
        const json = testModel.toJSON({visibility: false});

        deepEqual(json, {id: 1, firstName: 'Joe', lastName: 'Shmoe', address: '123 Main St.'});
      });
      describe('with JSON.stringify', function() {
        it('serializes correctly', function() {
          testModel.visible = ['firstName'];

          deepEqual(JSON.stringify(testModel), '{"firstName":"Joe"}');
        });

        it('serializes correctly when placed as object property', function() {
          testModel.visible = ['firstName'];
          var obj = {
            model: testModel
          };
          deepEqual(JSON.stringify(obj), '{"model":{"firstName":"Joe"}}');
        });

        it('serializes correctly when placed in an array', function() {
          testModel.visible = ['firstName'];
          var arr = [testModel];
          deepEqual(JSON.stringify(arr), '[{"firstName":"Joe"}]');
        });
      });
    });

    describe('#hasChanged()', function() {
      it('returns true if an attribute was set on a new model instance', function() {
        var model = new Model({test: 'something'});
        expect(model.hasChanged('test')).to.be.true;
      });

      it("returns false if the attribute isn't set on a new model instance", function() {
        var model = new Model({test: 'something'});
        expect(model.hasChanged('id')).to.be.false;
      });

      it("returns false if the attribute isn't updated after a sync operation", function() {
        var model = new Model({test: 'something'});
        model._reset();
        expect(model.hasChanged('test')).to.be.false;
      });

      it('returns true if an existing attribute is updated', function() {
        var model = new Model({test: 'something'});

        model._reset();
        model.set('test', 'something else');

        expect(model.hasChanged('test')).to.be.true;
      });
    });
  });
};
