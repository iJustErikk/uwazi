/* eslint-disable camelcase */
/* eslint-disable max-lines */

import asyncFS from 'api/utils/async-fs';
import { testingEnvironment } from 'api/utils/testingEnvironment';
import { testingTenants } from 'api/utils/testingTenants';
import { IXSuggestionsModel } from 'api/suggestions/IXSuggestionsModel';

import { fixtures, factory } from './fixtures';
import { InformationExtraction } from '../InformationExtraction';
import { ExternalDummyService } from '../../tasksmanager/specs/ExternalDummyService';
import { emtiToTenant } from 'api/socketio/setupSockets';

jest.mock('api/services/tasksmanager/TaskManager.ts');
jest.mock('api/socketio/setupSockets');

describe('InformationExtraction', () => {
  let informationExtraction: InformationExtraction;
  let IXExternalService: ExternalDummyService;
  let xmlA: Buffer;

  beforeAll(async () => {
    IXExternalService = new ExternalDummyService(1234, 'informationExtraction', {
      materialsFiles: '(/xml_to_train/:tenant/:property|/xml_to_predict/:tenant/:property)',
      materialsData: '(/labeled_data|/prediction_data)',
      resultsData: '/suggestions_results',
    });

    await IXExternalService.start();
  });

  beforeEach(async () => {
    informationExtraction = new InformationExtraction();

    await testingEnvironment.setUp(fixtures);
    testingTenants.changeCurrentTenant({
      name: 'tenant1',
      uploadedDocuments: `${__dirname}/uploads/`,
    });

    IXExternalService.reset();
    jest.resetAllMocks();
  });

  afterAll(async () => {
    await IXExternalService.stop();
    await testingEnvironment.tearDown();
  });

  describe('trainModel', () => {
    it('should send xmls', async () => {
      await informationExtraction.trainModel(
        [factory.id('templateToSegmentA')],
        'property1',
        'http://localhost:1234'
      );

      xmlA = await asyncFS.readFile(
        'app/api/services/informationExtraction/specs/uploads/segmentation/documentA.xml'
      );

      const xmlC = await asyncFS.readFile(
        'app/api/services/informationExtraction/specs/uploads/segmentation/documentC.xml'
      );

      expect(IXExternalService.materialsFilePartams).toEqual({
        0: '/xml_to_train/tenant1/property1',
        property: 'property1',
        tenant: 'tenant1',
      });

      expect(IXExternalService.files).toEqual(expect.arrayContaining([xmlA, xmlC]));
      expect(IXExternalService.filesNames.sort()).toEqual(
        ['documentA.xml', 'documentC.xml'].sort()
      );
    });

    it('should send labeled data', async () => {
      await informationExtraction.trainModel(
        [factory.id('templateToSegmentA')],
        'property1',
        'http://localhost:1234'
      );

      expect(IXExternalService.materials.length).toBe(2);
      expect(IXExternalService.materials.find(m => m.xml_file_name === 'documentA.xml')).toEqual({
        xml_file_name: 'documentA.xml',
        property_name: 'property1',
        tenant: 'tenant1',
        xml_segments_boxes: [
          {
            left: 58,
            top: 63,
            width: 457,
            height: 15,
            page_number: 1,
            text: 'something something',
          },
        ],
        page_width: 595,
        page_height: 841,
        language_iso: 'en',
        label_text: 'something',
        label_segments_boxes: [{ top: 0, left: 0, width: 0, height: 0, page_number: '1' }],
      });
    });

    it('should start the task to train the model', async () => {
      await informationExtraction.trainModel(
        [factory.id('templateToSegmentA')],
        'property1',
        'http://localhost:1234'
      );

      expect(informationExtraction.taskManager?.startTask).toHaveBeenCalledWith({
        params: { property_name: 'property1' },
        tenant: 'tenant1',
        task: 'create_model',
      });
    });
  });

  describe('when model is trained', () => {
    it('should call getSuggestions', async () => {
      jest
        .spyOn(informationExtraction, 'getSuggestions')
        .mockImplementation(async () => Promise.resolve());

      await informationExtraction.processResults({
        params: { property_name: 'property1' },
        tenant: 'tenant1',
        task: 'create_model',
        success: true,
      });
      expect(informationExtraction.getSuggestions).toHaveBeenCalledWith('property1');
      jest.clearAllMocks();
    });
  });

  describe('getSuggestions()', () => {
    it('should send the materials for the suggestions', async () => {
      await informationExtraction.getSuggestions('property1');

      xmlA = await asyncFS.readFile(
        'app/api/services/informationExtraction/specs/uploads/segmentation/documentA.xml'
      );

      expect(IXExternalService.materialsFilePartams).toEqual({
        0: '/xml_to_predict/tenant1/property1',
        property: 'property1',
        tenant: 'tenant1',
      });

      expect(IXExternalService.files.length).toBe(5);
      expect(IXExternalService.filesNames.sort()).toEqual(
        ['documentA.xml', 'documentC.xml', 'documentD.xml', 'documentE.xml', 'documentF.xml'].sort()
      );
      expect(IXExternalService.files).toEqual(expect.arrayContaining([xmlA]));

      expect(IXExternalService.materials.length).toBe(5);
      expect(IXExternalService.materials.find(m => m.xml_segments_boxes.length)).toEqual({
        xml_file_name: 'documentA.xml',
        property_name: 'property1',
        tenant: 'tenant1',
        page_height: 841,
        page_width: 595,
        xml_segments_boxes: [
          {
            height: 15,
            left: 58,
            page_number: 1,
            text: 'something something',
            top: 63,
            width: 457,
          },
        ],
      });
    });

    it('should create the task for the suggestions', async () => {
      await informationExtraction.getSuggestions('property1');

      expect(informationExtraction.taskManager?.startTask).toHaveBeenCalledWith({
        params: { property_name: 'property1' },
        tenant: 'tenant1',
        task: 'suggestions',
      });
    });

    it('should create the suggestions placeholder with status processing', async () => {
      await informationExtraction.getSuggestions('property1');
      const suggestions = await IXSuggestionsModel.get();
      expect(suggestions.length).toBe(5);
      expect(suggestions.find(s => s.entityId === 'A1')).toEqual(
        expect.objectContaining({
          entityId: 'A1',
          status: 'processing',
        })
      );
    });
  });

  describe('when suggestions are ready', () => {
    it('should request and store the suggestions', async () => {
      IXExternalService.setResults([
        {
          tenant: 'tenant1',
          property_name: 'property1',
          xml_file_name: 'documentA.xml',
          text: 'suggestion_text_1',
          segment_text: 'segment_text_1',
        },
        {
          tenant: 'tenant1',
          property_name: 'property1',
          xml_file_name: 'documentC.xml',
          text: 'suggestion_text_2',
          segment_text: 'segment_text_2',
        },
      ]);

      await informationExtraction.processResults({
        params: { property_name: 'property1' },
        tenant: 'tenant1',
        task: 'suggestions',
        success: true,
        data_url: 'http://localhost:1234/suggestions_results',
      });

      const suggestions = await IXSuggestionsModel.get({ status: 'ready' });
      expect(suggestions.length).toBe(2);
      expect(suggestions.find(s => s.suggestedValue === 'suggestion_text_1')).toEqual(
        expect.objectContaining({
          entityId: 'A1',
          language: 'en',
          propertyName: 'property1',
          suggestedValue: 'suggestion_text_1',
          segment: 'segment_text_1',
          status: 'ready',
        })
      );
    });
  });
});
