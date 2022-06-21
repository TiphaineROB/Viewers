import React, { Component } from 'react';

import './InterpolatorForm.styl';
import PropTypes from 'prop-types';
import { SketchPicker } from 'react-color';
import CreatableSelect from 'react-select/creatable';
import { GenericAnatomyColors } from '../../utils/GenericAnatomyColors';
import chroma from 'chroma-js';

export default class InterpolatorForm extends Component {
  static propTypes = {
    event: PropTypes.object,
    onSubmit: PropTypes.func,
    currentIndex: PropTypes.number,
    max: PropTypes.number,
    enabledSeries: PropTypes.array,
  };

  constructor(props) {
    super(props);

    this.state = {
      show: false,
      event: props.event,
      currentIndex: props.currentIndex,
      enabledSeries: props.enabledSeries,
      length: props.max,
    };
    this.promiseInfo = {};
  }


  onSubmit = async () => {
    //console.log('Click on submit')
    return new Promise( (resolve, reject) => {
      try{

        var results = this.props.onSubmit(
          this.state.event,
          this.state.enabledSeries,
          this.state.currentIndex,
          document.getElementById("start").value,
          document.getElementById("end").value,
        );
        resolve(results)
      } catch (err) {
        reject(err);
      }

    });
  };

  render() {

    const currentFrame = parseInt(this.state.currentIndex)
    const prevFrame = parseInt(currentFrame)===1 ? 1 : parseInt(currentFrame)-1;
    const nextFrame = parseInt(currentFrame)===this.state.length ? currentFrame : parseInt(currentFrame)+1

    return (
      <div>
        <div className="mb-3">
          <label htmlFor="name" className="form-label">
            Slices Range
          </label>

        </div>

        <section className="range-slider">
          <span className="rangeValues"></span>
          <input defaultValue={prevFrame} min="1" max={this.state.length} step="1" type="range" id="start"/>
          <input defaultValue={nextFrame} min="1" max={this.state.length} step="1" type="range" id="end" list="tickmarks"/>
          <datalist id="tickmarks">
            <label htmlFor="tickmarks-label" className="form-label">
              Current : {currentFrame}
            </label>
            <option value={currentFrame} id="tickmarks-label"></option>
          </datalist>
          <br/>
        </section>
        <br />

        <div className="mb-3 text-right">
          <button
            className="actionButton"
            data-cy="close-button"
            type="submit"
            onClick={this.onSubmit}
            id="submitInfoSeg"
            >
            Submit
          </button>
        </div>
      </div>
    );
  }
}
