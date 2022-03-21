import React, { Component } from 'react';

import './UploadForm.styl';
import PropTypes from 'prop-types';


export default class UploadForm extends Component {
  static propTypes = {
    callback: PropTypes.func,
  };

  constructor(props) {
    super(props);
    this.state = {
      description: props.description,
    };
  }

  onChange = e => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onReject = async () => {
    this.props.callback({removePrevious: false})
  };

  onAccept = async () => {
    this.props.callback({removePrevious: true, description:this.state.description})
  };


  render() {
    return (
      <div className="mb-3">
        <label htmlFor="description" className="form-label">
          Add a description
        </label>
        <input
          type="text"
          className="form-control"
          name="description"
          id="description"
          value={this.state.description}
          onChange={this.onChange}
        />
        <br/>
        <button
             className="actionAccept"
             type="submit"
             onClick={this.onAccept}
             id="accept"
             >
             Upload to server
        </button>
    </div>

    );
  }
}

//
// <div>
//     <p style={{color: "#d10429"}}>
//
//     This is in progress, ignore this message and click on either button.
//
//     <br/>
//     <br/>
//     Uploading changes will create a new segmentation instance.
//     <br/>
//     Do you want to remove the previous segment and keep only the new version ?
//     </p>
//
//     &nbsp; &nbsp; &nbsp; &nbsp;
//
//
//     <button
//       className="actionReject"
//       type="submit"
//       onClick={this.onReject}
//       id="reject"
//       >
//       No, keep previous version as well
//     </button>
//     &nbsp;  &nbsp;
//
//     <button
//       className="actionAccept"
//       type="submit"
//       onClick={this.onAccept}
//       id="accept"
//       >
//       Yes, remove previous version
//     </button>
//   </div>
