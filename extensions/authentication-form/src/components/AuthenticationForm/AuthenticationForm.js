import React, { Component } from 'react';

import './AuthenticationForm.styl';
import PropTypes from 'prop-types';
import { SketchPicker } from 'react-color';
import CreatableSelect from 'react-select/creatable';
import chroma from 'chroma-js';

export default class AuthenticationForm extends Component {
  static propTypes = {
    onSubmit: PropTypes.func,
  };

  constructor(props) {
    super(props);
    this.state = {
      show: false,
      login: '',
      password: '',
    };
  }

  onSubmit = async () => {
    return new Promise( (resolve, reject) => {
      try{
        const login = document.getElementById("login");
        const password = document.getElementById("password");
        var results = this.props.onSubmit(
          login, password
        );
        resolve(results)
      } catch (err) {
        reject(err);
      }
    });
  };

  render() {

    return (
      <div>
        <div className="mb-3">
          <label htmlFor="loginHTML" className="form-label">
            Login
          </label>
          <input type='username'
                   className="actionInput"
                   name='login'
                   id='login'
           />

        </div>
        <div className="mb-3">
          <label htmlFor="passwordHTML" className="form-label">
            Password
          </label>
          <input type='password'
                 className="actionInput"
                 name='password'
                 id='password'
          />
          />
        </div>

        <br />

        <div className="mb-3 text-right">
          <button
            className="actionButton"
            data-cy="close-button"
            type="submit"
            onClick={this.onSubmit}
            id="submitInfoAuth"
            >
            Submit
          </button>
        </div>
      </div>
    );
  }
}
