import 'api/utils/jasmineHelpers';
// import db from 'api/utils/testing_db';
import entities from 'api/entities';
import search from 'api/search/search';
import syncRoutes from '../routes.js';
import instrumentRoutes from '../../utils/instrumentRoutes';
import models from '../models';

describe('sync', () => {
  let routes;
  const req = { body: {} };

  beforeEach(async () => {
    routes = instrumentRoutes(syncRoutes);
    // await db.clearAllAndLoad({});
    req.body = {
      namespace: 'model1',
      data: 'data'
    };
    models.model1 = {
      save: jasmine.createSpy('model1.save'),
      delete: jasmine.createSpy('model1.delete')
    };

    models.model2 = {
      save: jasmine.createSpy('model2.save'),
      delete: jasmine.createSpy('model2.delete')
    };
    spyOn(search, 'delete');
    spyOn(entities, 'indexEntities');
  });

  // afterAll(async () => {
  //   await db.disconnect();
  // });

  describe('POST', () => {
    it('should need authorization', () => {
      expect(routes._post('/api/sync', {})).toNeedAuthorization();
    });

    it('should save on the namespaced model', async () => {
      const response = await routes.post('/api/sync', req);
      expect(models.model1.save).toHaveBeenCalledWith('data');
      expect(response).toBe('ok');

      req.body.namespace = 'model2';
      await routes.post('/api/sync', req);
      expect(models.model2.save).toHaveBeenCalledWith('data');
      expect(entities.indexEntities).not.toHaveBeenCalled();
    });

    describe('on error', () => {
      it('should call next', async () => {
        models.model1.save.and.returnValue(Promise.reject(new Error('error')));
        try {
          await routes.post('/api/sync', req);
        } catch (error) {
          expect(error).toEqual(new Error('error'));
        }
      });
    });

    describe('when namespace is entities', () => {
      it('should index on elastic', async () => {
        models.entities = {
          save: jasmine.createSpy('entities.save'),
          delete: jasmine.createSpy('entities.delete'),
        };

        req.body = {
          namespace: 'entities',
          data: { _id: 'id' }
        };

        await routes.post('/api/sync', req);
        expect(entities.indexEntities).toHaveBeenCalledWith({ _id: 'id' }, '+fullText');
      });
    });
  });

  describe('DELETE', () => {
    it('should need authorization', () => {
      expect(routes._delete('/api/sync', {})).toNeedAuthorization();
    });

    it('should remove on the namespaced model', async () => {
      const response = await routes.delete('/api/sync', req);
      expect(models.model1.delete).toHaveBeenCalledWith('data');
      expect(response).toBe('ok');

      req.body.namespace = 'model2';
      await routes.delete('/api/sync', req);
      expect(models.model2.delete).toHaveBeenCalledWith('data');
      expect(search.delete).not.toHaveBeenCalled();
    });

    describe('on error', () => {
      it('should call next', async () => {
        models.model1.delete.and.returnValue(Promise.reject(new Error('error')));
        try {
          await routes.delete('/api/sync', req);
        } catch (error) {
          expect(error).toEqual(new Error('error'));
        }
      });
    });

    describe('when namespace is entities', () => {
      it('should delete it from elastic', async () => {
        models.entities = {
          save: jasmine.createSpy('entities.save'),
          delete: jasmine.createSpy('entities.delete'),
        };

        req.body = {
          namespace: 'entities',
          data: { _id: 'id' }
        };

        await routes.delete('/api/sync', req);
        expect(search.delete).toHaveBeenCalledWith({ _id: 'id' });
      });
    });
  });
});
