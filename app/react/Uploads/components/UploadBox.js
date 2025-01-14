import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import Dropzone from 'react-dropzone';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Translate } from 'app/I18N';

import { Icon } from 'UI';
import { unselectAllDocuments } from 'app/Library/actions/libraryActions';
import { uploadDocument, createDocument } from 'app/Uploads/actions/uploadsActions';
import { wrapDispatch } from 'app/Multireducer';

const extractTitle = file => {
  const title = file.name
    .replace(/\.[^/.]+$/, '')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/ {2}/g, ' ');

  return title.charAt(0).toUpperCase() + title.slice(1);
};

class UploadBox extends Component {
  constructor(props) {
    super(props);
    this.onDrop = this.onDrop.bind(this);
  }

  onDrop(files) {
    files.forEach(file => {
      const doc = { title: extractTitle(file) };
      this.props.createDocument(doc).then(newDoc => {
        this.props.uploadDocument(newDoc.sharedId, file);
      });
    });
    this.props.unselectAllDocuments();
  }

  render() {
    return (
      <Dropzone
        className="upload-box force-ltr"
        style={{}}
        onDrop={this.onDrop}
        accept={{
          'application/pdf': ['.pdf'],
        }}
      >
        {({ getRootProps }) => (
          // eslint-disable-next-line react/jsx-props-no-spreading
          <div {...getRootProps()}>
            <div className="upload-box_wrapper">
              <Icon icon="upload" />
              <button type="button" className="upload-box_link">
                <Translate>Browse your PDFs to upload</Translate>
              </button>
              &nbsp;<Translate>or drop your files here.</Translate>
            </div>
            <div className="protip">
              <Icon icon="lightbulb" />
              <b>
                <Translate>ProTip!</Translate>
              </b>
              <span>
                <Translate>
                  For better performance, upload your files in batches of 50 or less.
                </Translate>
              </span>
            </div>
          </div>
        )}
      </Dropzone>
    );
  }
}

UploadBox.propTypes = {
  uploadDocument: PropTypes.func.isRequired,
  createDocument: PropTypes.func.isRequired,
  unselectAllDocuments: PropTypes.func.isRequired,
};

export function mapStateToProps() {
  return {};
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      uploadDocument,
      unselectAllDocuments,
      createDocument,
    },
    wrapDispatch(dispatch, 'uploads')
  );
}

export { UploadBox };
export default connect(mapStateToProps, mapDispatchToProps)(UploadBox);
