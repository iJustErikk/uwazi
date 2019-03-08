import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Form } from 'react-redux-form';
import { NumericRangeSlide } from 'app/ReactReduxForms';


import SidePanel from 'app/Layout/SidePanel';
import { t } from 'app/I18N';

const filters = [
  { label: 'Threshold', model: 'threshold', min: 0.3, max: 1, step: 0.01 },
  { label: 'Minimum relevant sentences', model: 'minRelevantSentences', min: 1, max: 50, step: 1 }
];

const filterValue = (filter, filtersValues) => filter.model === 'threshold' ? `${filtersValues[filter.model] * 100}%` : filtersValues[filter.model];

export function ResultsFiltersPanel({ open, filtersValues }) {
  return (
    <SidePanel open={open}>
      <div className="sidepanel-body">
        <div className="sidepanel-title">
          { t('System', 'Fine tune')}
        </div>
        <Form model="semanticSearch.resultsFilters">
          <div className="view">
            { filters.map(filter => (
              <dl className="metadata-type-text" key={filter.label}>
                <dt>{t('System', filter.label)} {filterValue(filter, filtersValues)}</dt>
                <dd>
                  <NumericRangeSlide
                    delay={200}
                    model={`.${filter.model}`}
                    prefix={filter.model}
                    min={filter.min}
                    max={filter.max}
                    step={filter.step}
                  />
                </dd>
              </dl>
            ))}
          </div>
        </Form>
      </div>
    </SidePanel>
  );
}

ResultsFiltersPanel.propTypes = {
  open: PropTypes.bool.isRequired,
  filtersValues: PropTypes.object.isRequired,
};

function mapStateToProps({ semanticSearch }) {
  return {
    open: semanticSearch.selectedDocument.isEmpty(),
    filtersValues: semanticSearch.resultsFilters
  };
}

export default connect(mapStateToProps)(ResultsFiltersPanel);
