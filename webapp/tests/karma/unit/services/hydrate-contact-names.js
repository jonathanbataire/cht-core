describe('HydrateContactNames service', () => {

  'use strict';

  let service,
      GetSummaries,
      ContactsMuting;

  beforeEach(() => {
    GetSummaries = sinon.stub();
    ContactsMuting = { loadMutedContactsIds: sinon.stub(), isMutedSync: sinon.stub() };
    module('inboxApp');
    module($provide => {
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('GetSummaries', GetSummaries);
      $provide.value('ContactsMuting', ContactsMuting);
    });
    inject($injector => service = $injector.get('HydrateContactNames'));
  });

  it('returns empty array when given no summaries', () => {
    return service([]).then(actual => {
      chai.expect(actual).to.deep.equal([]);
    });
  });

  it('does nothing when summaries not found', () => {
    const given = [{
      contact: 'a',
      lineage: [ 'b', 'c' ]
    }];
    GetSummaries.returns(Promise.resolve([]));
    return service(given).then(actual => {
      chai.expect(actual).to.deep.equal(given);
    });
  });

  it('replaces ids with names', () => {
    const given = [
      { contact: 'a', lineage: [ 'b', 'c' ] },
      { contact: 'd' }
    ];
    const summaries = [
      { _id: 'a', name: 'arnie', age: 15 },
      { _id: 'c', name: 'charlie', colour: 'green' },
      { _id: 'd', name: 'dannie' }
    ];
    GetSummaries.returns(Promise.resolve(summaries));
    return service(given).then(actual => {
      chai.expect(actual[0].contact).to.equal('arnie');
      chai.expect(actual[0].lineage.length).to.equal(2);
      chai.expect(actual[0].lineage[0]).to.equal(null);
      chai.expect(actual[0].lineage[1]).to.equal('charlie');
      chai.expect(actual[1].contact).to.equal('dannie');
      chai.expect(actual[1].lineage).to.equal(undefined);
      chai.expect(GetSummaries.callCount).to.equal(1);
      chai.expect(GetSummaries.args[0][0]).to.deep.equal(['a', 'b', 'c', 'd' ]);
    });
  });

});
