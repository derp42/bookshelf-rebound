var Promise = require('bluebird');
var chai = require('chai');

global.sinon = require('sinon');
global.expect = chai.expect;

Promise.longStackTraces();
Promise.onPossiblyUnhandledRejection(function (err) {
  throw err;
});

chai.use(require('sinon-chai').default);
chai.should();

describe('Unit Tests', function () {
  require('./unit/rebound')();
  require('./unit/bookshelf')();
  require('./unit/collection')();
  require('./unit/events')();
  require('./unit/sync')();
  require('./unit/model')();
});
