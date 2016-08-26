import React from 'react';
import {shallow} from 'enzyme';

import Select from '../Select';

describe('Select', () => {
  let component;
  let props;

  beforeEach(() => {
    props = {
      label: 'input label',
      options: [{label: 'Option1', value: 'option1'}, {label: 'Option2', value: 'option2'}]
    };
  });

  let render = () => {
    component = shallow(<Select {...props}/>);
  };

  it('should render select with properties passed', () => {
    props.value = 'test';
    render();
    let select = component.find('select');

    expect(select.props().value).toBe('test');
  });

  it('should render the options', () => {
    render();
    let optionElements = component.find('option');

    expect(optionElements.length).toBe(3);
    expect(optionElements.at(1).props().value).toBe('option1');
    expect(optionElements.at(1).text()).toBe('Option1');
    expect(optionElements.last().props().value).toBe('option2');
    expect(optionElements.last().text()).toBe('Option2');
  });

  describe('when passing placeholder', () => {
    it('should render a blank label opton with blank value', () => {
      props.placeholder = 'blank';
      render();

      let optionElements = component.find('option');
      expect(optionElements.length).toBe(3);
      expect(optionElements.first().props().value).toBe('');
      expect(optionElements.first().text()).toBe('blank');
    });
  });

  describe('different key name for label and value', () => {
    beforeEach(() => {
      props = {
        label: 'input label',
        options: [{name: 'Option1', id: 'option1'}, {name: 'Option2', id: 'option2'}],
        optionsValue: 'id',
        optionsLabel: 'name'
      };
      component = shallow(<Select {...props}/>);
    });

    it('should render the options', () => {
      let optionElements = component.find('option');

      expect(optionElements.length).toBe(3);
      expect(optionElements.at(1).props().value).toBe('option1');
      expect(optionElements.at(1).text()).toBe('Option1');
      expect(optionElements.last().props().value).toBe('option2');
      expect(optionElements.last().text()).toBe('Option2');
    });
  });

  describe('when passing group of options', () => {
    beforeEach(() => {
      props = {
        label: 'input label',
        options: [
          {label: 'Option group 1', options: [{name: 'opt 1', id: 1}, {name: 'opt 1', id: 4}]},
          {label: 'Option group 2', options: [{name: 'opt 3', id: 3}, {name: 'opt 4', id: 4}]}
        ],
        optionsValue: 'id',
        optionsLabel: 'name'
      };
      component = shallow(<Select {...props}/>);
    });

    it('should render the option groups', () => {
      let optionElements = component.find('optgroup');

      expect(optionElements.length).toBe(2);
      expect(optionElements.first().props().label).toBe('Option group 1');
      expect(optionElements.last().props().label).toBe('Option group 2');
    });
  });
});
