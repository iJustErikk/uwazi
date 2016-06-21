import React, {Component, PropTypes} from 'react';
import {connect} from 'react-redux';

import Doc from 'app/Library/components/Doc';
import SortButtons from 'app/Library/components/SortButtons';
import {RowList} from 'app/Layout/Lists';

export class DocumentsList extends Component {
  render() {
    let documents = this.props.documents.toJS();
    return (
      <main className={'document-viewer ' + (this.props.filtersPanel || this.props.selectedDocument ? 'col-xs-12 col-sm-8 is-active' : 'col-xs-12')}>
        <div className="sort-by">
          <h1 id="documents-counter" className="col-sm-7 page-title">1-12 of 39 documents for "africa"</h1>
          <SortButtons />
        </div>
        <RowList>
          {documents.map((doc, index) => <Doc doc={doc} key={index} />)}
        </RowList>
      </main>
    );
  }
}

DocumentsList.propTypes = {
  documents: PropTypes.object.isRequired,
  filtersPanel: PropTypes.bool,
  selectedDocument: PropTypes.object
};

export function mapStateToProps(state) {
  return {
    documents: state.library.documents,
    filtersPanel: state.library.ui.get('filtersPanel'),
    selectedDocument: state.library.ui.get('selectedDocument')
  };
}

export default connect(mapStateToProps)(DocumentsList);
