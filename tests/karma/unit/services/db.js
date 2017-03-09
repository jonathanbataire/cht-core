describe('DB service', function() {

  'use strict';

  var getService,
      Location,
      userCtx,
      pouchDB,
      expected,
      isAdmin;

  beforeEach(function() {
    Location = {};
    userCtx = sinon.stub();
    pouchDB = sinon.stub();
    expected = {
      id: 'hello',
      viewCleanup: sinon.stub(),
      installValidationMethods: sinon.stub(),
    };
    pouchDB.returns(expected);

    isAdmin = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('$window', function() {
        return {
          angular: { callbacks: [] },
          PouchDB: {
            // stub for pouch registering the worker adapter
            adapter: function(){},
            // stub for registering validation plugin
            plugin: function() {}
          }
        };
      });
      $provide.factory('pouchDB', function() {
        return pouchDB;
      });
      $provide.value('Session', {
        userCtx: userCtx,
        isAdmin: isAdmin
      } );
      $provide.value('Location', Location);
    });
    inject(function($injector) {
      getService = function() {
        // delay initialisation of the db service
        return $injector.get('DB');
      };
    });
  });

  afterEach(function() {
    KarmaUtils.restore(pouchDB, userCtx, isAdmin);
  });

  describe('get remote', function() {

    it('sets ajax timeout', function(done) {
      isAdmin.returns(false);
      Location.dbName = 'medicdb';
      Location.url = 'ftp//myhost:21/medicdb';
      userCtx.returns({ name: 'johnny' });

      // init
      var service = getService();
      chai.expect(pouchDB.callCount).to.equal(1);
      chai.expect(pouchDB.args[0][0]).to.equal('medicdb-user-johnny');

      // get remote
      var actual = service({ remote: true });
      chai.expect(actual.id).to.equal(expected.id);
      chai.expect(pouchDB.callCount).to.equal(2);
      chai.expect(pouchDB.args[1][0]).to.equal('ftp//myhost:21/medicdb');
      chai.expect(pouchDB.args[1][1]).to.deep.equal({ skip_setup: true, ajax: { timeout: 30000 } });
      done();
    });

    it('caches pouchdb instances', function(done) {
      isAdmin.returns(false);
      Location.dbName = 'medicdb';
      Location.url = 'ftp//myhost:21/medicdb';
      userCtx.returns({ name: 'johnny' });

      // init
      var service = getService();
      chai.expect(pouchDB.callCount).to.equal(1);
      chai.expect(pouchDB.args[0][0]).to.equal('medicdb-user-johnny');

      // get remote
      var actual1 = service({ remote: true });
      chai.expect(actual1.id).to.equal(expected.id);
      chai.expect(pouchDB.callCount).to.equal(2);

      // get remote again
      var actual2 = service({ remote: true });
      chai.expect(actual2.id).to.equal(expected.id);
      chai.expect(pouchDB.callCount).to.equal(2);
      done();
    });

    it('installs validation functions', function() {
      isAdmin.returns(false);
      Location.dbName = 'medicdb';
      Location.url = 'ftp//myhost:21/medicdb';
      userCtx.returns({ name: 'johnny' });

      // init
      getService();
      chai.expect(expected.installValidationMethods.callCount).to.equal(1);
    });
  });

  describe('get local', function() {

    it('sets ajax timeout', function(done) {
      isAdmin.returns(false);
      Location.dbName = 'medicdb';
      userCtx.returns({ name: 'johnny' });

      // init
      var service = getService();
      chai.expect(pouchDB.callCount).to.equal(1);
      chai.expect(expected.viewCleanup.callCount).to.equal(1);

      // get local
      var actual = service();
      chai.expect(pouchDB.callCount).to.equal(1);
      chai.expect(actual.id).to.equal(expected.id);
      chai.expect(pouchDB.args[0][0]).to.equal('medicdb-user-johnny');
      chai.expect(pouchDB.args[0][1].adapter).to.equal('worker');
      chai.expect(pouchDB.args[0][1].auto_compaction).to.equal(true);
      chai.expect(expected.viewCleanup.callCount).to.equal(1);

      done();
    });

    it('caches pouchdb instances', function(done) {
      isAdmin.returns(false);
      Location.dbName = 'medicdb';
      userCtx.returns({ name: 'johnny' });

      // init
      var service = getService();
      chai.expect(pouchDB.callCount).to.equal(1);

      // get local
      var actual1 = service();
      chai.expect(pouchDB.callCount).to.equal(1);
      chai.expect(actual1.id).to.equal(expected.id);

      // get local again
      var actual2 = service();
      chai.expect(pouchDB.callCount).to.equal(1);
      chai.expect(actual2.id).to.equal(expected.id);
      chai.expect(isAdmin.callCount).to.equal(3);
      chai.expect(userCtx.callCount).to.equal(3);

      done();
    });

    it('returns remote for admin user', function(done) {
      isAdmin.returns(true);
      Location.url = 'ftp//myhost:21/medicdb';

      // init
      var service = getService();
      chai.expect(pouchDB.callCount).to.equal(0);
      chai.expect(expected.viewCleanup.callCount).to.equal(0);

      // get local returns remote
      var actual = service();
      chai.expect(pouchDB.callCount).to.equal(1);
      chai.expect(actual.id).to.equal(expected.id);
      chai.expect(pouchDB.args[0][0]).to.equal('ftp//myhost:21/medicdb');
      chai.expect(pouchDB.args[0][1]).to.deep.equal({ skip_setup: true, ajax: { timeout: 30000 } });
      chai.expect(expected.viewCleanup.callCount).to.equal(0);

      done();
    });

    it('installs validation functions', function() {
      isAdmin.returns(false);
      Location.dbName = 'medicdb';
      Location.url = 'ftp//myhost:21/medicdb';
      userCtx.returns({ name: 'johnny' });

      // init
      getService();
      chai.expect(expected.installValidationMethods.callCount).to.equal(1);
    });

  });

});
