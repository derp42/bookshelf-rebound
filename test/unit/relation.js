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
    },
    tails: function() {
      return this.hasMany(Tail, 'id_cat');
    }
  });
  var Device;
  const Subscription = bookshelf.Model.extend({tableName: 'subscriptions'});
  const User = bookshelf.Model.extend({
    tableName: 'users',
    devices: function() {
      return this.hasMany(Device, 'user_id');
    }
  });
  Device = bookshelf.Model.extend({
    tableName: 'devices',
    subscription: function() {
      return this.belongsTo(Subscription, 'subscription_id');
    }
  });
  const MorphSite = bookshelf.Model.extend({tableName: 'morph_sites'});
  const ParsedPhoto = bookshelf.Model.extend({
    tableName: 'parsed_photos',
    parse: function(attributes) {
      return Object.keys(attributes).reduce(function(parsed, key) {
        parsed[key.replace(/_([a-z])/g, function(match, letter) {
          return letter.toUpperCase();
        })] = attributes[key];
        return parsed;
      }, {});
    },
    format: function(attributes) {
      return Object.keys(attributes).reduce(function(formatted, key) {
        formatted[key.replace(/[A-Z]/g, function(letter) {
          return '_' + letter.toLowerCase();
        })] = attributes[key];
        return formatted;
      }, {});
    },
    imageable: function() {
      return this.morphTo('imageable', [MorphSite, 'site']);
    }
  });
  const RawPhoto = bookshelf.Model.extend({
    tableName: 'parsed_photos',
    parse: function(attributes) {
      const keys = Object.keys(attributes);
      if (keys.length === 1 && keys[0].indexOf('imageable_') === 0) {
        throw new Error('raw attributes should not be reparsed');
      }
      return attributes;
    },
    imageable: function() {
      return this.morphTo('imageable', [MorphSite, 'site']);
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
        table.string('label');
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
        table.integer('id_cat');
        table.string('color');
      })
      .createTable('users', function(table) {
        table.increments();
      })
      .createTable('devices', function(table) {
        table.increments();
        table.integer('user_id').notNullable();
        table.integer('subscription_id').notNullable();
      })
      .createTable('subscriptions', function(table) {
        table.increments();
        table.string('name');
      })
      .createTable('morph_sites', function(table) {
        table.increments();
        table.string('name');
      })
      .createTable('parsed_photos', function(table) {
        table.increments();
        table.integer('imageable_id');
        table.string('imageable_type');
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
      })
      .then(function() {
        return knex('morph_sites').insert([
          {id: 1, name: 'Parsed site'},
          {id: 2, name: 'Second site'}
        ]);
      })
      .then(function() {
        return knex('parsed_photos').insert([
          {id: 1, imageable_id: 1, imageable_type: 'site'},
          {id: 3, imageable_id: 2, imageable_type: 'site'}
        ]);
      })
      .then(function() {
        return knex('users').insert({id: 27});
      })
      .then(function() {
        return knex('subscriptions').insert({id: 12, name: 'Annual'});
      })
      .then(function() {
        return knex('devices').insert({id: 121, user_id: 27, subscription_id: 12});
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

    it('keeps pivot helpers working on a cloned belongsToMany collection', function() {
      const source = new Parent({id: 1}).targets();
      const clone = source.clone();

      expect(clone).not.to.equal(source);
      expect(clone.relatedData).not.to.equal(source.relatedData);
      expect(clone._handler).to.be.a('function');

      return knex('parents_targets')
        .where({parent_id: 1})
        .update({label: null})
        .then(function() {
          return clone.attach(new Target({id: 12}));
        })
        .then(function() {
          expect(clone.pluck('id')).to.eql([12]);
          expect(source).to.have.length(0);
          return clone.detach(12);
        })
        .then(function() {
          expect(clone).to.have.length(0);
          return clone.updatePivot({label: 'updated'}, {query: function(query) { query.where('target_id', 10); }});
        })
        .then(function(result) {
          expect(result).to.equal(clone);
          return knex('parents_targets').where({parent_id: 1}).orderBy('target_id');
        })
        .then(function(rows) {
          expect(rows).to.eql([
            {parent_id: 1, target_id: 10, label: 'updated'},
            {parent_id: 1, target_id: 11, label: null}
          ]);
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

    it('retains parent metadata for nested eager relations', function() {
      return new User({id: 27})
        .fetch({withRelated: ['devices.subscription']})
        .then(function(user) {
          const device = user.related('devices').at(0);
          const subscription = device.related('subscription');

          expect(device.attributes).to.eql({id: 121, user_id: 27, subscription_id: 12});
          expect(subscription.relatedData.parentId).to.equal(121);
          expect(subscription.relatedData.parentAttributes).to.eql(device.attributes);
          expect(subscription.relatedData.parentFk).to.equal(12);

          return subscription.refresh();
        })
        .then(function(subscription) {
          expect(subscription.attributes).to.eql({id: 12, name: 'Annual'});
        });
    });

    it('replaces an overlapping relation path on a later load', function() {
      var original;

      return new User({id: 27})
        .fetch()
        .then(function(user) {
          original = user;
          return user.load(['devices.subscription']);
        })
        .then(function(user) {
          expect(user).to.equal(original);
          expect(user.related('devices').at(0).relations).to.have.property('subscription');
          return user.load(['devices']);
        })
        .then(function(user) {
          expect(user).to.equal(original);
          expect(user.related('devices').at(0).relations).not.to.have.property('subscription');
        });
    });

    it('eager loads morphTo using parsed type and id attributes', function() {
      return ParsedPhoto.fetchAll({withRelated: ['imageable']}).then(function(photos) {
        const photo = photos.at(0);
        expect(photo.attributes).to.include({imageableId: 1, imageableType: 'site'});
        expect(photo.related('imageable').attributes).to.eql({id: 1, name: 'Parsed site'});
      });
    });

    it('retains private pairing keys for projected eager relations', function() {
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
            {id: 2, id_cat: 1, color: 'white'},
            {id: 3, id_cat: 2, color: 'orange'}
          ]);
        })
        .then(function() {
          return Cat.fetchAll({
            withRelated: [
              {
                tails: function(query) {
                  query.column('id', 'color');
                }
              }
            ]
          });
        })
        .then(function(cats) {
          expect(cats.at(0).related('tails').toJSON()).to.eql([
            {id: 1, color: 'black'},
            {id: 2, color: 'white'}
          ]);
          expect(cats.at(1).related('tails').toJSON()).to.eql([{id: 3, color: 'orange'}]);

          return Cat.fetchAll({
            withRelated: [
              {
                tail: function(query) {
                  query.column('color');
                }
              }
            ]
          });
        })
        .then(function(cats) {
          expect(cats.at(0).related('tail').toJSON()).to.eql({color: 'black'});
          expect(cats.at(1).related('tail').toJSON()).to.eql({color: 'orange'});

          return Tail.fetchAll({
            withRelated: [
              {
                cat: function(query) {
                  query.column('name');
                }
              }
            ]
          });
        })
        .then(function(tails) {
          expect(tails.at(0).related('cat').toJSON()).to.eql({name: 'Felix'});
          expect(tails.at(1).related('cat').toJSON()).to.eql({name: 'Felix'});
          expect(tails.at(2).related('cat').toJSON()).to.eql({name: 'Milo'});
          tails.forEach(function(tail) {
            expect(tail.related('cat').attributes).not.to.have.property('__bookshelf_rebound_eager_pairing_key__');
          });
        })
        .finally(function() {
          return knex('tails').where({id: 3}).del();
        });
    });

    it('does not add pairing keys to aggregate eager projections', function() {
      const relation = new Cat({id: 1}).tails();
      const query = relation.query();

      relation.relatedData.selectConstraints(query, {
        parentResponse: [{id: 1}],
        _beforeFn: function(builder) {
          builder.count('* as total');
        }
      });

      expect(query.toSQL().sql).not.to.contain('__bookshelf_rebound_eager_pairing_key__');
    });

    it('does not parse morphTo keys that are already present', function() {
      return RawPhoto.fetchAll({withRelated: ['imageable']}).then(function(photos) {
        expect(photos.at(0).related('imageable').get('name')).to.equal('Parsed site');
      });
    });

    it('refetches eager morphTo targets using metadata from each owning model', function() {
      return RawPhoto.fetchAll({withRelated: ['imageable']})
        .then(function(photos) {
          const imageables = [photos.get(1).related('imageable'), photos.get(3).related('imageable')];

          expect(imageables[0].relatedData.parentFk).to.equal(1);
          expect(imageables[1].relatedData.parentFk).to.equal(2);

          return Promise.all(imageables.map(function(imageable) {
            return imageable.fetch();
          })).then(function(fetched) {
            expect(fetched[0].attributes).to.eql({id: 1, name: 'Parsed site'});
            expect(fetched[1].attributes).to.eql({id: 2, name: 'Second site'});
            return imageables;
          });
        })
        .then(function(imageables) {
          return Promise.all(imageables.map(function(imageable) {
            return imageable.refresh();
          }));
        })
        .then(function(refreshed) {
          expect(refreshed[0].attributes).to.eql({id: 1, name: 'Parsed site'});
          expect(refreshed[1].attributes).to.eql({id: 2, name: 'Second site'});
        });
    });

    it('pairs null-foreign-key to-one relations without another query', function() {
      var queries = [];
      var onQuery = function(query) {
        queries.push(query.sql);
      };

      return knex('tails')
        .insert({id: 3, id_cat: null, color: 'gray'})
        .then(function() {
          return knex('parsed_photos').insert({id: 2, imageable_id: null, imageable_type: 'site'});
        })
        .then(function() {
          knex.on('query', onQuery);
          return new Tail({id: 3}).fetch({withRelated: ['cat']});
        })
        .then(function(tail) {
          knex.removeListener('query', onQuery);
          expect(queries).to.have.length(1);
          expect(tail.relations).to.have.property('cat');
          expect(tail.related('cat')).to.be.instanceOf(Cat);
          expect(tail.toJSON()).to.have.property('cat', null);
          queries = [];
          knex.on('query', onQuery);
          return new RawPhoto({id: 2}).fetch({withRelated: ['imageable']});
        })
        .finally(function() {
          knex.removeListener('query', onQuery);
        })
        .then(function(photo) {
          expect(queries).to.have.length(1);
          expect(photo.relations).to.have.property('imageable');
          expect(photo.related('imageable')).to.be.instanceOf(MorphSite);
          expect(photo.toJSON()).to.have.property('imageable', null);
        });
    });

    it('serializes missing eager-loaded to-one relations as null', function() {
      return knex('tails')
        .del()
        .then(function() {
          return knex('cats').del();
        })
        .then(function() {
          return knex('cats').insert([{id: 1, name: 'Felix'}, {id: 2, name: 'Milo'}, {id: 3, name: 'Otis'}]);
        })
        .then(function() {
          return knex('tails').insert([
            {id: 1, id_cat: 1, color: 'black'},
            {id: 2, id_cat: 999, color: 'gray'}
          ]);
        })
        .then(function() {
          return Cat.fetchAll({withRelated: ['tail']});
        })
        .then(function(cats) {
          const missingTail = cats.at(1).related('tail');
          expect(missingTail).to.be.instanceOf(Tail);
          expect(missingTail.attributes).to.eql({});
          const json = cats.toJSON();
          expect(json[0].tail).to.eql({id: 1, id_cat: 1, color: 'black'});
          expect(json[1].tail).to.equal(null);
          expect(json[2].tail).to.equal(null);
          expect(cats.at(1).toJSON()).to.have.property('tail', null);
          expect(cats.at(1).toJSON({visible: ['id', 'tail']})).to.eql({id: 2, tail: null});
          expect(cats.at(1).toJSON({hidden: ['tail']})).not.to.have.property('tail');
          expect(cats.at(1).toJSON({shallow: true})).not.to.have.property('tail');
          return Tail.fetchAll({withRelated: ['cat']});
        })
        .then(function(tails) {
          expect(tails.toJSON()[0].cat).to.eql({id: 1, name: 'Felix'});
          expect(tails.toJSON()[1].cat).to.equal(null);
          return Cat.where('id', '>', 1).fetchAll({withRelated: ['tail']});
        })
        .then(function(catsWithoutTails) {
          expect(catsWithoutTails.toJSON()).to.eql([
            {id: 2, name: 'Milo', tail: null},
            {id: 3, name: 'Otis', tail: null}
          ]);
          const draft = new Cat({id: 4});
          draft.related('tail').set({color: 'white'});
          expect(draft.toJSON().tail).to.eql({color: 'white'});
        });
    });
  });
};
