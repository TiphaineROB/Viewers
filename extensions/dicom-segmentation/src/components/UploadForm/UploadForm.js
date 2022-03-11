import React, { Component } from 'react';

import './UploadForm.styl';
import PropTypes from 'prop-types';


export default class UploadForm extends Component {
  static propTypes = {
    callback: PropTypes.func,
  };

  constructor(props) {
    super(props);
  }

  onReject = async () => {
    this.props.callback({removePrevious: false})
  };

  onAccept = async () => {
    this.props.callback({removePrevious: true})
  };


  render() {
    return (
      <div>
        <p style={{color: "#d10429"}}>

        This is in progress, ignore this message and click on either button.

        <br/>
        <br/>
        Uploading changes will create a new segmentation instance.
        <br/>
        Do you want to remove the previous segment and keep only the new version ?
        </p>

        &nbsp; &nbsp; &nbsp; &nbsp;
        <button
          className="actionReject"
          type="submit"
          onClick={this.onReject}
          id="reject"
          >
          No, keep previous version as well
        </button>
        &nbsp;  &nbsp;

        <button
          className="actionAccept"
          type="submit"
          onClick={this.onAccept}
          id="accept"
          >
          Yes, remove previous version
        </button>
      </div>
    );
  }
}
