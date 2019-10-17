import { browserHistory } from 'react-router';
import { RequestParams } from 'app/utils/RequestParams';

import { APIURL } from 'app/config';
import { store } from 'app/store';
import api from 'app/utils/api';
import backend from 'fetch-mock';
import loadingBar from 'app/App/LoadingProgressBar';
import * as notifyActions from 'app/Notifications/actions/notificationsActions';

describe('api', () => {
  beforeEach(() => {
    spyOn(loadingBar, 'start');
    spyOn(loadingBar, 'done');
    spyOn(store, 'dispatch');
    spyOn(notifyActions, 'notify').and.returnValue('notify action');
    backend.restore();
    backend
    .get(`${APIURL}test_get`, JSON.stringify({ method: 'GET' }))
    .get(`${APIURL}test_get?key=value`, JSON.stringify({ method: 'GET' }))
    .post(`${APIURL}test_post`, JSON.stringify({ method: 'POST' }))
    .delete(`${APIURL}test_delete?data=delete`, JSON.stringify({ method: 'DELETE' }))
    .get(`${APIURL}unauthorised`, { status: 401, body: {} })
    .get(`${APIURL}notfound`, { status: 404, body: {} })
    .get(`${APIURL}error_url`, { status: 500, body: {} })
    .get(`${APIURL}network_error`, {
      throws: new TypeError('Failed to fetch')
    });
  });

  afterEach(() => backend.restore());

  describe('GET', () => {
    it('should prefix url with config api url', async () => {
      const response = await api.get('test_get');
      expect(response.json.method).toBe('GET');
    });

    it('should start and end the loading bar', async () => {
      await api.get('test_get');
      expect(loadingBar.done).toHaveBeenCalled();
      expect(loadingBar.start).toHaveBeenCalled();
    });

    it('should add headers and data as query string', async () => {
      const requestParams = new RequestParams({ key: 'value' }, { header: 'value', header2: 'value2' });
      await api.get('test_get', requestParams);

      expect(backend.calls()[0][1].headers.header).toBe('value');
      expect(backend.calls()[0][1].headers.header2).toBe('value2');
    });
  });

  describe('POST', () => {
    it('should prefix url with config api url', async () => {
      const requestParams = new RequestParams({ key: 'value' }, { header: 'value', header2: 'value2' });
      const response = await api.post('test_post', requestParams);

      expect(backend.calls()[0][1].body).toBe(JSON.stringify({ key: 'value' }));
      expect(backend.calls()[0][1].headers.header).toBe('value');
      expect(backend.calls()[0][1].headers.header2).toBe('value2');
      expect(response.json.method).toBe('POST');
    });

    it('should start and end the loading bar', async () => {
      const promise = api.post('test_post', {});
      expect(loadingBar.start).toHaveBeenCalled();

      await promise;
      expect(loadingBar.done).toHaveBeenCalled();
    });
  });

  describe('DELETE', () => {
    it('should prefix url with config api url', async () => {
      const requestParams = new RequestParams({ data: 'delete' }, { header: 'value', header2: 'value2' });
      const response = await api.delete('test_delete', requestParams);

      expect(response.json.method).toBe('DELETE');
      expect(backend.calls()[0][1].headers.header).toBe('value');
      expect(backend.calls()[0][1].headers.header2).toBe('value2');
    });

    it('should start and end the loading bar', async () => {
      const requestParams = new RequestParams({ data: 'delete' }, { header: 'value', header2: 'value2' });
      const promise = api.delete('test_delete', requestParams);
      expect(loadingBar.start).toHaveBeenCalled();

      await promise;
      expect(loadingBar.done).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    describe('401', () => {
      it('should redirect to login', async () => {
        spyOn(browserHistory, 'replace');
        try {
          await api.get('unauthorised');
          fail('should throw error');
        } catch (e) {
          expect(browserHistory.replace).toHaveBeenCalledWith('/login');
        }
      });
    });

    describe('404', () => {
      it('should redirect to login', async () => {
        spyOn(browserHistory, 'replace');
        try {
          await api.get('notfound');
          fail('should throw error');
        } catch (e) {
          expect(browserHistory.replace).toHaveBeenCalledWith('/404');
        }
      });
    });

    describe('fetch error', () => {
      it('should notify that server is unreachable', async () => {
        try {
          await api.get('network_error');
          fail('should throw error');
        } catch (e) {
          expect(store.dispatch).toHaveBeenCalledWith('notify action');
          expect(notifyActions.notify)
          .toHaveBeenCalledWith('Could not reach server. Please try again later.', 'danger');
        }
      });
    });

    it('should notify the user', async () => {
      try {
        await api.get('error_url');
        fail('should throw error');
      } catch (e) {
        expect(store.dispatch).toHaveBeenCalledWith('notify action');
        expect(notifyActions.notify).toHaveBeenCalledWith('An error has occurred', 'danger');
      }
    });

    it('should end the loading bar', async () => {
      try {
        await api.get('error_url');
        fail('should throw error');
      } catch (e) {
        expect(loadingBar.done).toHaveBeenCalled();
      }
    });
  });
});
