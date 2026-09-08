var _ = require('lodash');
const checkJsonSupport = require('./helpers/json/supported');

module.exports = function(bookshelf) {
  let isJsonSupported;

  function checkResponse(actual, expected) {
    // Knex will store strings if client does not support JSON.
    if (!isJsonSupported) {
      expected = _.mapValues(expected, function(value) {
        if (_.isObject(value)) {
          return JSON.stringify(value);
        }
        return value;
      });
    }
    expect(actual).to.eql(expected);
  }

  before(function() {
    if (!checkJsonSupport(bookshelf)) return;

    isJsonSupported = true;

    return require('./helpers/json/migration')(bookshelf).then(function() {
      return require('./helpers/json/inserts')(bookshelf);
    });
  });

  describe('JSON support', function() {
    var Models = require('./helpers/json/objects')(bookshelf).Models;
    var Command = Models.Command;

    it('can `fetch` a model with a JSON column', function() {
      return Command.forge({id: 0})
        .fetch()
        .then(function(command) {
          checkResponse(command.attributes, {
            id: 0,
            unit_id: 1,
            type: 'move',
            info: {
              target: {
                x: 5,
                y: 10
              }
            }
          });
        });
    });

    it('returns the correct previous attributes when updating nested objects', function() {
      return Command.forge({id: 0})
        .fetch()
        .then(function(command) {
          const newTarget = {x: 7, y: 13};
          const originalInfo = command.get('info');
          const updatedInfo = _.cloneDeep(originalInfo);
          updatedInfo.target = newTarget;

          command.set('info', updatedInfo);

          expect(command.get('info')).to.not.deep.eql(command.previous('info'));
          expect(command.previous('info')).to.deep.equal(originalInfo);
        });
    });

    it('rejects a fetch that would silently discard a JSON constraint', function() {
      return Command.forge({unit_id: 1, type: 'attack', info: {test: 'blah'}})
        .fetch()
        .then(
          function() {
            throw new Error('Expected the JSON constraint to be rejected');
          },
          function(error) {
            expect(error).to.be.instanceOf(TypeError);
            expect(error.message).to.contain('attribute "info"');
          }
        );
    });

    it('can refresh a model that already contains a JSON column', function() {
      return Command.forge({id: 1})
        .fetch()
        .then(function(command) {
          return command.refresh();
        })
        .then(function(command) {
          checkResponse(command.attributes, {
            id: 1,
            unit_id: 1,
            type: 'attack',
            info: {
              weapon: 'cannon',
              target: {
                x: 2,
                y: 2
              }
            }
          });
        });
    });
  });
};
