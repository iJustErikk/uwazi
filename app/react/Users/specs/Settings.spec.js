import React from 'react';
import {shallow} from 'enzyme';
import Immutable from 'immutable';

import {Settings} from '../Settings';
import SettingsNavigation from '../components/SettingsNavigation';
import AccountSettings from '../components/AccountSettings';
import CollectionSettings from '../components/CollectionSettings';
import UsersAPI from '../UsersAPI';
import TemplatesAPI from 'app/Templates/TemplatesAPI';
import ThesaurisAPI from 'app/Thesauris/ThesaurisAPI';
import RelationTypesAPI from 'app/RelationTypes/RelationTypesAPI';

describe('Settings', () => {
  let component;
  let props;

  beforeEach(() => {
    props = {
      settings: Immutable.fromJS({}),
      section: Immutable.fromJS('account'),
      account: Immutable.fromJS({})
    };
    component = shallow(<Settings {...props} />);
  });

  describe('render()', () => {
    it('should render the SettingsNavigation', () => {
      expect(component.find(SettingsNavigation).length).toBe(1);
    });

    it('should render the proper section', () => {
      expect(component.find(AccountSettings).length).toBe(1);
      expect(component.find(CollectionSettings).length).toBe(0);
      props.section = Immutable.fromJS('collection');
      component = shallow(<Settings {...props} />);
      expect(component.find(CollectionSettings).length).toBe(1);
      expect(component.find(AccountSettings).length).toBe(0);
    });
  });

  describe('requestState', () => {
    let user = {name: 'doe'};
    let templates = [{_id: 1, name: 'Decision'}];
    let thesauris = [{_id: 1, name: 'Countries'}];
    let relationTypes = [{_id: 1, name: 'Supports'}];

    beforeEach(() => {
      spyOn(UsersAPI, 'currentUser').and.returnValue(Promise.resolve(user));
      spyOn(TemplatesAPI, 'get').and.returnValue(Promise.resolve(templates));
      spyOn(ThesaurisAPI, 'get').and.returnValue(Promise.resolve(thesauris));
      spyOn(RelationTypesAPI, 'get').and.returnValue(Promise.resolve(relationTypes));
    });

    it('should get the current user, and metadata', (done) => {
      Settings.requestState()
      .then((state) => {
        expect(state.user).toEqual(user);
        expect(state.templates).toEqual(templates);
        expect(state.thesauris).toEqual(thesauris);
        expect(state.relationTypes).toEqual(relationTypes);
        done();
      });
    });
  });
});
