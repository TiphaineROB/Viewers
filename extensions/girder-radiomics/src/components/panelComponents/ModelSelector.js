import React, { Component } from 'react';
import PropTypes from 'prop-types';

import './ModelSelector.styl';

export default class ModelSelector extends Component {
  static propTypes = {
    name: PropTypes.string,
    title: PropTypes.string,
    models: PropTypes.array,
    currentModel: PropTypes.string,
    segs: PropTypes.array,
    currentSeg: PropTypes.string,
    radiomics: PropTypes.array,
    currentRad: PropTypes.string,
    usage: PropTypes.any,
    onClick: PropTypes.func,
    onSelectModel: PropTypes.func,
    onSelectSeg: PropTypes.func,
    onSelectRad: PropTypes.func,
  };

  constructor(props) {
    super(props);

    const currentModel = props.currentModel
      ? props.currentModel
      : props.models.length > 0
      ? props.models[0]
      : '';

    const currentSeg = props.currentSeg
      ? props.currentSeg
      : props.segs.length > 0
      ? props.segs[0]
      : '';

    const currentRad = props.currentRad
        ? props.currentRad
        : props.radiomics.length > 0
        ? props.radiomics[0]
        : '';

    this.state = {
      models: props.models,
      segs: props.segs,
      radiomics: props.radiomics,
      currentModel: currentModel,
      currentSeg: currentSeg,
      currentRad: currentRad,
      buttonDisabled: false,
    };
  }

  static getDerivedStateFromProps(props, current_state) {
    if (current_state.models !== props.models) {
      return {
        models: props.models,
        currentModel: props.models.length > 0 ? props.models[0] : '',
      };
    }
    return null;
  }

  onChangeModel = evt => {
    this.setState({ currentModel: evt.target.value });
    if (this.props.onSelectModel) this.props.onSelectModel(evt.target.value);
  };

  onChangeSeg = evt => {
    this.setState({ currentSeg: evt.target.value });
    if (this.props.onSelectSeg) this.props.onSelectSeg(evt.target.value);
  };

  onChangeRad = evt => {
    this.setState({ currentRad: evt.target.value });
    if (this.props.onSelectRad) this.props.onSelectRad(evt.target.value);
  };

  currentModel = () => {
    return this.props.currentModel
      ? this.props.currentModel
      : this.state.currentModel;
  };

  currentSeg = () => {
    return this.props.currentSeg
    ? this.props.currentSeg
    : this.state.currentSeg;
  }


  currentRad = () => {
    return this.props.currentRad
    ? this.props.currentRad
    : this.state.currentRad;
  }

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

    // console.log("On click Model", model)
    // console.log("On click Seg", this.state.currentSeg, "this.current()", this.currentSeg())
    // console.log("On click Rad", this.state.currentRad, "this.current()", this.currentRad())
    await this.props.onClick(model, this.currentSeg(), this.currentRad());
    this.setState({ buttonDisabled: false });
  };

  render() {
    const currentModel = this.currentModel();
    const currentSeg = this.currentSeg();
    const currentRad = this.currentRad();

    console.log("Current render ! ", currentModel, currentSeg, currentRad)

    return (
      <div className="modelSelector">
        <table>
          <tbody>
            <tr>
              <td colSpan="3">Models:</td>
            </tr>
            <tr>
              <td width="80%">
                <select
                  className="selectBox"
                  onChange={this.onChangeModel}
                  value={currentModel}
                >
                  {this.props.models.map(model => (
                    <option key={model} name={model} value={model}>
                      {`${model} `}
                    </option>
                  ))}
                </select>
              </td>
              <td width="2%">&nbsp;</td>
              <td width="18%">
                <button
                  className="actionButton"
                  onClick={this.onClickBtn}
                  title={'Run ' + this.props.title}
                  disabled={
                    this.state.isButtonDisabled || !this.props.models.length
                  }
                  style={{ display: this.props.onClick ? 'block' : 'none' }}
                >
                  Run
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        {this.props.usage}
        <table style={{ fontSize: 'smaller' }}>
           <tbody>
             <tr>
              <td colSpan="3"> Options: </td>
             </tr>
             <tr>
               <td width="40%"> Segmentation file :</td>
               <td width="2%">&nbsp;</td>
               <td width="58%">
                 <select
                   className="selectBox"
                   onChange={this.onChangeSeg}
                   value={currentSeg}
                 >
                   {this.props.segs.map(seg => (
                     <option key={seg} name={seg} value={seg}>
                       {`${seg} `}
                     </option>
                   ))}
                 </select>
               </td>
             </tr>
             <tr>
               <td width="40%"> Radiomics file : </td>
               <td width="2%">&nbsp;</td>
               <td width="58%">
                 <select
                   className="selectBox"
                   onChange={this.onChangeRad}
                   value={currentRad}
                 >
                   {this.props.radiomics.map(rad => (
                     <option key={rad} name={rad} value={rad}>
                       {`${rad.date} `}
                     </option>
                   ))}
                 </select>
               </td>

             </tr>
           </tbody>
        </table>
      </div>
    );
  }
}
