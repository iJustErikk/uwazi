import { getClient } from 'api/common.v2/database/getConnectionForCurrentTenant';
import { MongoTransactionManager } from 'api/common.v2/database/MongoTransactionManager';
import { MatchQueryNode } from 'api/relationships.v2/model/MatchQueryNode';
import { TraversalQueryNode } from 'api/relationships.v2/model/TraversalQueryNode';
import { getFixturesFactory } from 'api/utils/fixturesFactory';
import { testingEnvironment } from 'api/utils/testingEnvironment';
import testingDB from 'api/utils/testing_db';
import { MongoRelationshipsDataSource } from '../MongoRelationshipsDataSource';

const factory = getFixturesFactory();

const entityInLanguages = (langs: string[], id: string, template?: string) =>
  langs.map(lang => factory.entity(id, template, {}, { language: lang }));

const fixtures = {
  relationships: [
    { _id: factory.id('rel1'), from: 'entity1', to: 'hub1', type: factory.id('nullType') },
    { _id: factory.id('rel2'), to: 'hub1', from: 'entity3', type: factory.id('relType1') },
    { _id: factory.id('rel3'), to: 'hub1', from: 'entity4', type: factory.id('relType1') },
    { _id: factory.id('rel4'), from: 'entity1', to: 'hub2', type: factory.id('nullType') },
    { _id: factory.id('rel5'), to: 'hub2', from: 'entity5', type: factory.id('relType2') },
    { _id: factory.id('rel6'), to: 'hub2', from: 'entity6', type: factory.id('relType3') },
    { _id: factory.id('rel7'), from: 'entity2', to: 'hub3', type: factory.id('relType4') },
    { _id: factory.id('rel8'), to: 'hub3', from: 'entity7', type: factory.id('relType5') },
    { _id: factory.id('rel9'), from: 'entity7', to: 'entity1', type: factory.id('relType5') },
  ],
  entities: [
    ...entityInLanguages(['en', 'es'], 'entity1', 'template1'),
    ...entityInLanguages(['en', 'es'], 'entity2'),
    ...entityInLanguages(['en', 'es'], 'hub1', 'formerHubsTemplate'),
    ...entityInLanguages(['en', 'es'], 'entity3', 'template2'),
    ...entityInLanguages(['en', 'es'], 'entity4', 'template4'),
    ...entityInLanguages(['en', 'es'], 'hub2', 'formerHubsTemplate'),
    ...entityInLanguages(['en', 'es'], 'entity5', 'template2'),
    ...entityInLanguages(['en', 'es'], 'entity6', 'template3'),
    ...entityInLanguages(['en', 'es'], 'hub3'),
    ...entityInLanguages(['en', 'es'], 'entity7'),
    ...entityInLanguages(['en', 'es'], 'entity8'),
  ],
};

beforeEach(async () => {
  await testingEnvironment.setUp(fixtures);
});

afterAll(async () => {
  await testingEnvironment.tearDown();
});

describe('When getting by query', () => {
  it('should allow traversing 1 hop', async () => {
    const ds = new MongoRelationshipsDataSource(
      testingDB.mongodb!,
      new MongoTransactionManager(getClient())
    );
    const query = new MatchQueryNode({ sharedId: 'entity1' }, [
      new TraversalQueryNode('out', {}, [new MatchQueryNode()]),
    ]);

    const result = await ds.getByQuery(query, 'en').all();
    expect(result.map(r => r.path)).toMatchObject([
      [
        { _id: factory.id('entity1-en'), sharedId: 'entity1' },
        { _id: factory.id('rel1'), type: factory.id('nullType') },
        { _id: factory.id('hub1-en'), sharedId: 'hub1' },
      ],
      [
        { _id: factory.id('entity1-en'), sharedId: 'entity1' },
        { _id: factory.id('rel4'), type: factory.id('nullType') },
        { _id: factory.id('hub2-en'), sharedId: 'hub2' },
      ],
    ]);
  });

  it('should allow traversing 2 hops', async () => {
    const ds = new MongoRelationshipsDataSource(
      testingDB.mongodb!,
      new MongoTransactionManager(getClient())
    );
    const query = new MatchQueryNode({ sharedId: 'entity1' }, [
      new TraversalQueryNode('out', {}, [
        new MatchQueryNode({}, [new TraversalQueryNode('in', {}, [new MatchQueryNode()])]),
      ]),
    ]);

    const result = await ds.getByQuery(query, 'en').all();
    expect(result.map(r => r.path)).toMatchObject([
      [
        { _id: factory.id('entity1-en'), sharedId: 'entity1' },
        { _id: factory.id('rel1'), type: factory.id('nullType') },
        { _id: factory.id('hub1-en'), sharedId: 'hub1' },
        { _id: factory.id('rel2'), type: factory.id('relType1') },
        { _id: factory.id('entity3-en'), sharedId: 'entity3' },
      ],
      [
        { _id: factory.id('entity1-en'), sharedId: 'entity1' },
        { _id: factory.id('rel1'), type: factory.id('nullType') },
        { _id: factory.id('hub1-en'), sharedId: 'hub1' },
        { _id: factory.id('rel3'), type: factory.id('relType1') },
        { _id: factory.id('entity4-en'), sharedId: 'entity4' },
      ],
      [
        { _id: factory.id('entity1-en'), sharedId: 'entity1' },
        { _id: factory.id('rel4'), type: factory.id('nullType') },
        { _id: factory.id('hub2-en'), sharedId: 'hub2' },
        { _id: factory.id('rel5'), type: factory.id('relType2') },
        { _id: factory.id('entity5-en'), sharedId: 'entity5' },
      ],
      [
        { _id: factory.id('entity1-en'), sharedId: 'entity1' },
        { _id: factory.id('rel4'), type: factory.id('nullType') },
        { _id: factory.id('hub2-en'), sharedId: 'hub2' },
        { _id: factory.id('rel6'), type: factory.id('relType3') },
        { _id: factory.id('entity6-en'), sharedId: 'entity6' },
      ],
    ]);
  });

  it('should be paginable', async () => {
    const ds = new MongoRelationshipsDataSource(
      testingDB.mongodb!,
      new MongoTransactionManager(getClient())
    );
    const query = new MatchQueryNode({ sharedId: 'entity1' }, [
      new TraversalQueryNode('out', {}, [
        new MatchQueryNode({}, [new TraversalQueryNode('in', {}, [new MatchQueryNode()])]),
      ]),
    ]);

    const result = await ds.getByQuery(query, 'en').page(2, 2);
    expect(result.map(d => d.path)).toMatchObject([
      [
        { _id: factory.id('entity1-en'), sharedId: 'entity1' },
        { _id: factory.id('rel4'), type: factory.id('nullType') },
        { _id: factory.id('hub2-en'), sharedId: 'hub2' },
        { _id: factory.id('rel5'), type: factory.id('relType2') },
        { _id: factory.id('entity5-en'), sharedId: 'entity5' },
      ],
      [
        { _id: factory.id('entity1-en'), sharedId: 'entity1' },
        { _id: factory.id('rel4'), type: factory.id('nullType') },
        { _id: factory.id('hub2-en'), sharedId: 'hub2' },
        { _id: factory.id('rel6'), type: factory.id('relType3') },
        { _id: factory.id('entity6-en'), sharedId: 'entity6' },
      ],
    ]);
  });

  it('should allow to add filters to the query', async () => {
    const ds = new MongoRelationshipsDataSource(
      testingDB.mongodb!,
      new MongoTransactionManager(getClient())
    );
    const query = new MatchQueryNode({ sharedId: 'entity1' }, [
      new TraversalQueryNode('out', {}, [
        new MatchQueryNode({}, [
          new TraversalQueryNode('in', { types: [factory.id('relType3').toHexString()] }, [
            new MatchQueryNode({
              templates: [
                factory.id('template3').toHexString(),
                factory.id('template4').toHexString(),
              ],
            }),
          ]),
        ]),
      ]),
    ]);

    const result = await ds.getByQuery(query, 'en').all();
    expect(result.map(r => r.path)).toMatchObject([
      [
        { _id: factory.id('entity1-en'), sharedId: 'entity1' },
        { _id: factory.id('rel4'), type: factory.id('nullType') },
        { _id: factory.id('hub2-en'), sharedId: 'hub2' },
        { _id: factory.id('rel6'), type: factory.id('relType3') },
        { _id: factory.id('entity6-en'), sharedId: 'entity6' },
      ],
    ]);
  });

  it('should allow to query branches', async () => {
    const ds = new MongoRelationshipsDataSource(
      testingDB.mongodb!,
      new MongoTransactionManager(getClient())
    );

    const query = new MatchQueryNode({ sharedId: 'entity1' }, [
      new TraversalQueryNode('out', {}, [
        new MatchQueryNode({}, [
          new TraversalQueryNode('in', { types: [factory.id('relType3').toHexString()] }, [
            new MatchQueryNode({
              templates: [
                factory.id('template3').toHexString(),
                factory.id('template4').toHexString(),
              ],
            }),
          ]),
        ]),
      ]),
      new TraversalQueryNode('in', {}, [new MatchQueryNode()]),
    ]);

    const result = await ds.getByQuery(query, 'en').all();
    expect(result.map(r => r.path)).toMatchObject([
      [
        { _id: factory.id('entity1-en'), sharedId: 'entity1' },
        { _id: factory.id('rel4'), type: factory.id('nullType') },
        { _id: factory.id('hub2-en'), sharedId: 'hub2' },
        { _id: factory.id('rel6'), type: factory.id('relType3') },
        { _id: factory.id('entity6-en'), sharedId: 'entity6' },
      ],
      [
        { _id: factory.id('entity1-en'), sharedId: 'entity1' },
        { _id: factory.id('rel9'), type: factory.id('relType5') },
        { _id: factory.id('entity7-en'), sharedId: 'entity7' },
      ],
    ]);
  });

  it('should return the same entities when querying different languages', async () => {
    const ds = new MongoRelationshipsDataSource(
      testingDB.mongodb!,
      new MongoTransactionManager(getClient())
    );

    const query = new MatchQueryNode({ sharedId: 'entity1' }, [
      new TraversalQueryNode('out', {}, [
        new MatchQueryNode({}, [
          new TraversalQueryNode('in', { types: [factory.id('relType3').toHexString()] }, [
            new MatchQueryNode({
              templates: [
                factory.id('template3').toHexString(),
                factory.id('template4').toHexString(),
              ],
            }),
          ]),
        ]),
      ]),
      new TraversalQueryNode('in', {}, [new MatchQueryNode()]),
    ]);

    const resultInEnglish = await ds.getByQuery(query, 'en').all();
    const resultInSpanish = await ds.getByQuery(query, 'es').all();
    expect(resultInEnglish.map(r => r.path)).toMatchObject([
      [
        { _id: factory.id('entity1-en'), sharedId: 'entity1' },
        { _id: factory.id('rel4'), type: factory.id('nullType') },
        { _id: factory.id('hub2-en'), sharedId: 'hub2' },
        { _id: factory.id('rel6'), type: factory.id('relType3') },
        { _id: factory.id('entity6-en'), sharedId: 'entity6' },
      ],
      [
        { _id: factory.id('entity1-en'), sharedId: 'entity1' },
        { _id: factory.id('rel9'), type: factory.id('relType5') },
        { _id: factory.id('entity7-en'), sharedId: 'entity7' },
      ],
    ]);
    expect(resultInSpanish.map(r => r.path)).toMatchObject([
      [
        { _id: factory.id('entity1-es'), sharedId: 'entity1' },
        { _id: factory.id('rel4'), type: factory.id('nullType') },
        { _id: factory.id('hub2-es'), sharedId: 'hub2' },
        { _id: factory.id('rel6'), type: factory.id('relType3') },
        { _id: factory.id('entity6-es'), sharedId: 'entity6' },
      ],
      [
        { _id: factory.id('entity1-es'), sharedId: 'entity1' },
        { _id: factory.id('rel9'), type: factory.id('relType5') },
        { _id: factory.id('entity7-es'), sharedId: 'entity7' },
      ],
    ]);
  });
});
