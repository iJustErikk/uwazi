import { getClient, getConnection } from 'api/common.v2/database/getConnectionForCurrentTenant';
import { MongoTransactionManager } from 'api/common.v2/database/MongoTransactionManager';
import { MongoEntitiesDataSource } from 'api/entities.v2/database/MongoEntitiesDataSource';
import { MongoRelationshipsDataSource } from 'api/relationships.v2/database/MongoRelationshipsDataSource';
import { MongoSettingsDataSource } from 'api/settings.v2/database/MongoSettingsDataSource';
import { MongoTemplatesDataSource } from 'api/templates.v2/database/MongoTemplatesDataSource';
import { getFixturesFactory } from 'api/utils/fixturesFactory';
import { testingEnvironment } from 'api/utils/testingEnvironment';
import testingDB from 'api/utils/testing_db';
import { Db } from 'mongodb';
import { DenormalizationService } from '../DenormalizationService';

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
    { _id: factory.id('rel9'), from: 'entity7', to: 'entity4', type: factory.id('relType5') },
    { _id: factory.id('rel10'), from: 'entity9', to: 'entity4', type: factory.id('relType5') },
  ],
  entities: [
    ...factory.entityInMultipleLanguages(
      ['hu', 'es'],
      'entity1',
      'template1',
      {},
      { obsoleteMetadata: [] },
      {
        hu: {
          metadata: {
            relationshipProp1: [{ value: 'entity4', label: 'entity4-hu' }],
          },
        },
        es: {
          metadata: {
            relationshipProp1: [{ value: 'entity4', label: 'entity4-es' }],
          },
        },
      }
    ),
    ...entityInLanguages(['hu', 'es'], 'entity2'),
    ...entityInLanguages(['hu', 'es'], 'hub1', 'formerHubsTemplate'),
    ...entityInLanguages(['hu', 'es'], 'entity3', 'template2'),
    ...entityInLanguages(['hu', 'es'], 'entity4', 'template4'),
    ...entityInLanguages(['hu', 'es'], 'hub2', 'formerHubsTemplate'),
    ...entityInLanguages(['hu', 'es'], 'entity5', 'template2'),
    ...entityInLanguages(['hu', 'es'], 'entity6', 'template3'),
    ...entityInLanguages(['hu', 'es'], 'hub3'),
    ...entityInLanguages(['hu', 'es'], 'entity7', 'template7'),
    ...entityInLanguages(['hu', 'es'], 'entity8'),
    ...entityInLanguages(['hu', 'es'], 'entity9', 'template7'),
    ...entityInLanguages(['hu', 'es'], 'entity10', 'template1'),
  ],
  templates: [
    factory.template('template1', [
      {
        name: 'relationshipProp1',
        type: 'newRelationship',
        label: 'relationshipProp1',
        query: [
          {
            types: [factory.id('nullType')],
            direction: 'out',
            match: [
              {
                templates: [factory.id('formerHubsTemplate')],
                traverse: [
                  {
                    types: [factory.id('relType1')],
                    direction: 'in',
                    match: [
                      {
                        templates: [factory.id('template4')],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]),
    factory.template('template7', [
      {
        name: 'relationshipProp2',
        type: 'newRelationship',
        label: 'relationshipProp2',
        query: [
          {
            types: [factory.id('relType5')],
            direction: 'out',
            match: [
              {
                templates: [factory.id('template4')],
                traverse: [
                  {
                    types: [factory.id('relType1')],
                    direction: 'out',
                    match: [
                      {
                        templates: [factory.id('formerHubsTemplate')],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]),
    factory.template('template4', [
      {
        name: 'relationshipProp3',
        type: 'newRelationship',
        label: 'relationshipProp3',
        query: [
          {
            types: [factory.id('relType1')],
            direction: 'out',
            match: [
              {
                templates: [factory.id('formerHubsTemplate')],
                traverse: [
                  {
                    types: [factory.id('nullType')],
                    direction: 'in',
                    match: [
                      {
                        templates: [factory.id('template1')],
                        traverse: [
                          {
                            types: [factory.id('nullType')],
                            direction: 'in',
                            match: [
                              {
                                templates: [factory.id('formerHubsTemplate')],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]),
  ],
  settings: [
    {
      languages: [
        {
          default: true,
          label: 'Hungarian',
          key: 'hu',
        },
        {
          label: 'Spanish',
          key: 'es',
        },
      ],
    },
  ],
};

let db: Db;
let service: DenormalizationService;

beforeEach(async () => {
  await testingEnvironment.setUp(fixtures);

  db = getConnection();
  const transactionManager = new MongoTransactionManager(getClient());
  const relationshipsDataSource = new MongoRelationshipsDataSource(db, transactionManager);
  service = new DenormalizationService(
    relationshipsDataSource,
    new MongoEntitiesDataSource(
      db,
      relationshipsDataSource,
      new MongoSettingsDataSource(db, transactionManager),
      transactionManager
    ),
    new MongoTemplatesDataSource(db, transactionManager),
    new MongoSettingsDataSource(db, transactionManager),
    transactionManager,
    async () => {}
  );
});

afterAll(async () => {
  await testingEnvironment.tearDown();
});

describe('denormalizeForNewRelationships()', () => {
  describe('when executing on a newly created relationship', () => {
    it.each(['hu', 'es'])(
      'should mark the relationship fields as invalid in the entities in "%s"',
      async language => {
        await service.denormalizeForNewRelationships([factory.id('rel3').toHexString()]);
        const entities = await testingDB.mongodb
          ?.collection('entities')
          .find({ language, 'obsoleteMetadata.0': { $exists: true } })
          .toArray();
        expect(entities?.length).toBe(4);
        expect(entities).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              sharedId: 'entity1',
              obsoleteMetadata: ['relationshipProp1'],
            }),
            expect.objectContaining({
              sharedId: 'entity4',
              obsoleteMetadata: ['relationshipProp3'],
            }),
            expect.objectContaining({
              sharedId: 'entity7',
              obsoleteMetadata: ['relationshipProp2'],
            }),
            expect.objectContaining({
              sharedId: 'entity9',
              obsoleteMetadata: ['relationshipProp2'],
            }),
          ])
        );
      }
    );
  });
});

describe('denormalizeForExistingEntities()', () => {
  describe('when executing on an existing entity', () => {
    it('should update the relationship fields denormalizations in the entity with the new data in the provided language', async () => {
      await testingDB.mongodb
        ?.collection('entities')
        .updateOne(
          { sharedId: 'entity4', language: 'es' },
          { $set: { title: 'entity4-es-edited' } }
        );

      await service.denormalizeForExistingEntities(['entity4'], 'es');

      const entities = await testingDB.mongodb
        ?.collection('entities')
        .find({ sharedId: 'entity1' })
        .toArray();
      expect(entities).toMatchObject([
        {
          sharedId: 'entity1',
          language: 'hu',
          metadata: {
            relationshipProp1: [{ value: 'entity4', label: 'entity4-hu' }],
          },
          obsoleteMetadata: [],
        },
        {
          sharedId: 'entity1',
          language: 'es',
          metadata: {
            relationshipProp1: [{ value: 'entity4', label: 'entity4-es-edited' }],
          },
          obsoleteMetadata: [],
        },
      ]);
    });
  });
});
