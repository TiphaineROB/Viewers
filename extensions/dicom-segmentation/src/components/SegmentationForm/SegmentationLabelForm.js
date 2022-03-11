import React, { Component } from 'react';

import './SegmentationLabelForm.styl';
import PropTypes from 'prop-types';
import { SketchPicker } from 'react-color';
import CreatableSelect from 'react-select/creatable';
import { GenericAnatomyColors } from '../../utils/GenericAnatomyColors';
import chroma from 'chroma-js';

export default class SegmentationLabelForm extends Component {
  static propTypes = {
    name: PropTypes.string,
    description: PropTypes.string,
    color: PropTypes.string,
    onSubmit: PropTypes.func,
  };

  constructor(props) {
    super(props);
    var options = GenericAnatomyColors;
    var item = null;
    for (const i of options) {
      if (i.label === props.name) {
        if (i.color !== props.color) {
          item = { label: props.name, value: props.color };
          options = [...options, item];
        } else {
          item = i;
        }
        break;
      }
    }

    if (!item) {
      item = { label: props.name, value: props.color };
      options = [...options, item];
    }
    var message = "Don't forget to upload the segment once done";

    if (props.niftiImportation === true) {
      message = 'Warning !! Are you sure you want to upload this unknown nifti file as a segmentation ? Some errors can occur.'
    }
    this.state = {
      show: false,
      name: props.name,
      description: props.description,
      color: props.color,
      isLoading: false,
      options: options,
      value: item,
      message: message,
      fileHeader: props.fileHeader,
      fileImage: props.fileImage,
    };
    this.promiseInfo = {};
  }

  onChange = e => {
    this.setState({ [e.target.name]: e.target.value });
  };

  setColor = color => {
    this.setState({ color: color.hex });
  };

  onSubmit = async () => {
    console.log('Click on submit')
    return new Promise( (resolve, reject) => {
      try{

        var results = this.props.onSubmit(
          this.state.name,
          this.state.description,
          this.state.color,
          this.state.fileHeader,
          this.state.fileImage,
        );
        resolve(results)
      } catch (err) {
        reject(err);
      }

    });
  };

  createOption = label => ({
    label,
    value: this.state.color,
  });

  handleChange = item => {
    if (!item) return;

    var color = this.state.color;
    for (const i of this.state.options) {
      if (i.label === item.label) {
        color = item.value;
        break;
      }
    }
    this.setState({ name: item.label, color: color, value: item });
  };

  handleCreate = inputValue => {
    this.setState({ isLoading: true });
    setTimeout(() => {
      const { options } = this.state;
      const newOption = this.createOption(inputValue);
      this.setState({
        isLoading: false,
        options: [...options, newOption],
        value: newOption,
        name: newOption.label,
      });
    }, 1000);
  };

  render() {
    const dot = (color = '#ccc') => ({
      alignItems: 'center',
      display: 'flex',

      ':before': {
        backgroundColor: color,
        borderRadius: 10,
        content: '" "',
        display: 'block',
        marginRight: 8,
        height: 10,
        width: 10,
      },
    });

    const colourStyles = {
      control: styles => ({ ...styles, backgroundColor: 'white' }),
      option: (styles, { data, isDisabled, isFocused, isSelected }) => {
        const value =
          data.value && data.value[0] === '#' ? data.value : this.state.color;
        const color = chroma(value);
        return {
          ...styles,
          backgroundColor: isDisabled
            ? null
            : isSelected
            ? value
            : isFocused
            ? color.alpha(0.1).css()
            : null,
          color: isDisabled
            ? '#ccc'
            : isSelected
            ? chroma.contrast(color, 'white') > 2
              ? 'white'
              : 'black'
            : value,
          cursor: isDisabled ? 'not-allowed' : 'default',

          ':active': {
            ...styles[':active'],
            backgroundColor:
              !isDisabled && (isSelected ? value : color.alpha(0.3).css()),
          },
        };
      },
      input: styles => ({ ...styles, ...dot() }),
      placeholder: styles => ({ ...styles, ...dot() }),
      singleValue: (styles, { data }) => ({ ...styles, ...dot(data.value) }),
    };

    return (
      <div>
        <div className="mb-3">
          <label htmlFor="name" className="form-label">
            Label Name
          </label>
          <CreatableSelect
            isClearable
            isDisabled={this.state.isLoading}
            isLoading={this.state.isLoading}
            onChange={this.handleChange}
            onInputChange={this.handleChange}
            onCreateOption={this.handleCreate}
            options={this.state.options}
            styles={colourStyles}
            value={this.state.value}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="description" className="form-label">
            Description
          </label>
          <input
            type="text"
            className="form-control"
            name="description"
            id="description"
            value={this.state.description}
            onChange={this.onChange}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="color" className="form-label">
            Color
          </label>
          <SketchPicker
            color={this.state.color}
            onChangeComplete={this.setColor}
            disableAlpha={true}
          />
        </div>
        <br />

        <p style={{color: "#d10429"}}> {this.state.message} </p>
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
