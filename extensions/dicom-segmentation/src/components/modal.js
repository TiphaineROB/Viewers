import React, { useState, useEffect, useRef } from 'react';
import SegmentationLabelForm from './SegmentationForm/SegmentationLabelForm';
import PropTypes from 'prop-types';

export default class PromiseModal extends React.Component {
  static propTypes = {
    name: PropTypes.string,
    description: PropTypes.string,
    color: PropTypes.string,
    onSubmit: PropTypes.func,
  };

  constructor(props) {
    super(props);
    console.log('Modal')
    this.state = {
      show: false,
      name: props.name,
      description: props.description,
      color: props.color,
      onSubmit: props.onSubmit,
    };

    this.promiseInfo = {};
  }

  show = async () => {
    console.log('Show')
     return new Promise((resolve, reject) => {
       this.promiseInfo = {
         resolve,
         reject
       };
       this.setState({
         show: true
       });
     });
  };

  hide = () => {
    this.setState({
      show: false
    });
  };

  render() {
    const { show } = this.state;
    const { resolve, reject } = this.promiseInfo;
    return  <SegmentationLabelForm
              show={this.state.show}
              name={this.state.name}
              description={this.state.description}
              color={this.state.color}
              onSubmit={this.state.onSubmit}
              fileHeader=''
              fileImage=''
      />
  }


}
