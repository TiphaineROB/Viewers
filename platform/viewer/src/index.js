/**
 * Entry point for development and production PWA builds.
 * Packaged (NPM) builds go through `index-umd.js`
 */

import 'regenerator-runtime/runtime';

import App from './App.js';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';

import './OHIFStandaloneViewer.css';
import './ErrorAuth.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfo } from '@fortawesome/free-solid-svg-icons'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { library } from "@fortawesome/fontawesome-svg-core";

library.add(faInfo)
library.add(faXmark)

/**
 * EXTENSIONS
 * =================
 *
 * Importing and modifying the extensions our app uses HERE allows us to leverage
 * tree shaking and a few other niceties. However, by including them here they become
 * "baked in" to the published application.
 *
 * Depending on your use case/needs, you may want to consider not adding any extensions
 * by default HERE, and instead provide them via the extensions configuration key or
 * by using the exported `App` component, and passing in your extensions as props using
 * the defaultExtensions property.
 */
import OHIFVTKExtension from '@ohif/extension-vtk';
import OHIFDicomHtmlExtension from '@ohif/extension-dicom-html';
import OHIFDicomSegmentationExtension from '@ohif/extension-dicom-segmentation';
import OHIFDicomRtExtension from '@ohif/extension-dicom-rt';
import OHIFDicomMicroscopyExtension from '@ohif/extension-dicom-microscopy';
import OHIFDicomPDFExtension from '@ohif/extension-dicom-pdf';
//import OHIFDicomTagBrowserExtension from '@ohif/extension-dicom-tag-browser';
// Add this for Debugging purposes:
//import OHIFDebuggingExtension from '@ohif/extension-debugging';
import { version } from '../package.json';


import OHIFMONAILabelExtension from '@ohif/extension-monai-label';
import OHIFGirderRadiomicsExtension from '@ohif/extension-girder-radiomics';

/*
 * Default Settings
 */
let config = {};

if (window) {
  config = window.config || {};
  window.version = version;
}

const appProps = {
  config,
  defaultExtensions: [

    //OHIFMONAILabelExtension,
    OHIFVTKExtension,
    OHIFDicomHtmlExtension,
    OHIFDicomMicroscopyExtension,
    OHIFDicomPDFExtension,
    OHIFDicomSegmentationExtension,
    OHIFDicomRtExtension,
    OHIFGirderRadiomicsExtension,
    //OHIFDebuggingExtension,
    //OHIFDicomTagBrowserExtension,
  ],
};

import axios from 'axios';

function launchApp() {
  /** Create App */
  const app = React.createElement(App, appProps, null);

  /** Render */
  ReactDOM.render(app, document.getElementById('root'));
}

function startAuth() {
  window.config.user = {};
  window.config.user.key = '';

  if (window.config.authenticationRequired===true) {
    const onclick = () => {
      let url = new URL('authOhif', window.config.authenticationServer);
      let params = new URLSearchParams(url.search);
      // const params = {
      //   username: document.getElementById("login").value,
      //   password: document.getElementById("psswd").value,
      // }
      url.searchParams.append("username", document.getElementById("login").value)
      url.searchParams.append("password", document.getElementById("psswd").value)
      axios
        .post(url, {}) //mode:'cors'
        .then(function(response) {
          if (response.data.token==='') {
            window.config.user.key = '';
            console.log("Erreur, should render an error page")
            launchError()
            return response;
          } else {
            window.config.user.key = response.data.token;
            launchApp()
          }
          return response;
        })
        .catch(function(error) {
          console.log(error)
          launchError()
          return error;
        })
        .finally(function() {});
    }
    const oncancel = () => {
      launchError()
    }
    const onkey = (evt) => {
      if (evt.key==="Enter") {
        onclick()
      }
    }
    const auth = (
      <div className="container">

      	<h1 className="header">LOGIN</h1>

      	<div className="instructions">
          <div className="right-close">
            <div onClick={oncancel}>
              <FontAwesomeIcon icon="xmark"/>
            </div>
          </div>
          <h2>Please enter your credentials to access this platform.</h2>


          <div className="centered">
            <form className="form">
               Username : &emsp;<input className="input" id="login" type="text" name="name" size="10"/>
               &emsp;
               Password : &emsp; <input className="input" id="psswd" type="password" onKeyPress={onkey} name="password" size="10"/>
               <br/>
            </form>
          </div>
          <p></p>
          <div className="centered">
            <button className="button-b"  onClick={onclick} title={'enter'}>
             Enter!
            </button>
          </div>
        </div>
      </div>
    )

    ReactDOM.render(auth, document.querySelector("#root"));

  } else {
    launchApp()
  }
}




class ErrorAuth extends Component {
  static propTypes = {
    url: PropTypes.array,
    callback: PropTypes.func,

  };

  static defaultProps = {
    url: [],
  };

  constructor(props) {
    super(props);

  }

              //
  render() {
    return (
      <div className="container">

      	<h1 className="header">ERROR</h1>

      	<div className="instructions">
          <div className="right">
              <FontAwesomeIcon icon="info"/>
              <span className="tooltiptext">
                  This platform was implemented by <b>CREATIS</b> in partnership with the <b>Leon Berard Cancer Center</b> in Lyon,
                  for research purposes only.
                  <br/><br/>
                  To access the viewer, one needs to have a account on our Girder Server.
              </span>
          </div>

        	<h2>Sorry, you need to be logged in to access this platform.</h2>
      		<div className="centered">
            <button className="button-b" onClick={this.props.callback} title={'Try again'}>
             Try Again
            </button>
          </div>
          <div className="step">
            <p>If the problem persists, please contact an administrator</p>
      		</div>


      </div>
      </div>
    );
  }
}

// <input type="image" src={logo} alt="Submit" width="48" height="48"/>
// <div className="step">
//  <img src="./logo-creatis-small.png"/>
// </div>

function launchError() {
  /** Create Error Component */

  const errorauth = React.createElement(ErrorAuth, {url: [], callback: startAuth}, null);
  /** Render */
  ReactDOM.render(errorauth, document.getElementById('root'));

}


startAuth()
