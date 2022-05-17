import React, { Component } from 'react';
import PropTypes from 'prop-types';

import './FileSelector.styl';

export default class FileSelector extends Component {
  static propTypes = {
    name: PropTypes.string,
    title: PropTypes.string,
    files: PropTypes.array,
    currentFile: PropTypes.string,
    usage: PropTypes.any,
    onClick: PropTypes.func,
    onSelectFile: PropTypes.func,
  };

  constructor(props) {
    super(props);

    const currentFile = props.currentFile
      ? props.currentFile
      : props.files.length > 0
      ? props.files[0]
      : '';
    this.state = {
      files: props.files,
      currentFile: currentFile,
      buttonDisabled: false,
    };
  }

  static getDerivedStateFromProps(props, current_state) {
    if (current_state.files !== props.files) {
      return {
        files: props.files,
        currentFile: props.files.length > 0 ? props.files[0] : '',
      };
    }
    return null;
  }

  onChangeFile = evt => {
    this.setState({ currentFile: evt.target.value });
    if (this.props.onSelectFile) this.props.onSelectFile(evt.target.value);
  };

  currentFile = () => {
    return this.props.currentFile
      ? this.props.currentFile
      : this.state.currentFile;
  };

  onClickBtn = async () => {
    if (this.state.buttonDisabled) {
      return;
    }

    let model = this.state.currentModel;
    if (!model) {
      console.error('This should never happen!');
      model = this.props.models.length > 0 ? this.props.models[0] : '';
    }

    this.setState({ buttonDisabled: true });
    await this.props.onClick(model);
    this.setState({ buttonDisabled: false });
  };


  render() {
    const currentFile = this.currentFile();
    return (
      <div className="fileSelector">
        <table>
          <tbody>
            <tr>
              <td colSpan="3">Files:</td>
            </tr>
            <tr>
              <td width="80%">
                <select
                  className="selectBox"
                  onChange={this.onChangeFile}
                  value={currentFile}
                >
                  {this.props.files.map(file => (
                    <option key={file} name={file} value={file}>
                      {`${file} `}
                    </option>
                  ))}
                </select>
              </td>
              <td width="2%">&nbsp;</td>
              <td width="18%">&nbsp;</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
}
