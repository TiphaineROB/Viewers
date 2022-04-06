import React, { Component } from 'react';
import PropTypes from 'prop-types';

import './GirderRadiomicsPanel.styl';
import GirderRadiomicsClient from '../services/GirderRadiomicsClient';
import { UINotificationService } from '@ohif/core';
//import { getImageIdsForDisplaySet } from '../utils/SegmentationUtils';
import cornerstone from 'cornerstone-core';
import MD5 from 'md5.js';
import AutoSegmentation from './panelComponents/AutoSegmentation';
import RadiomicsOptions from './panelComponents/RadiomicsOptions';
import GirderOptions from './panelComponents/GirderOptions';
import { CookieUtils } from '../utils/GenericUtils';

export default class GirderRadiomicsPanel extends Component {
  static propTypes = {
    studies: PropTypes.any,
    viewports: PropTypes.any,
    activeIndex: PropTypes.any,
  };

  constructor(props) {
    super(props);

    const { viewports, studies, activeIndex } = props;
    this.viewConstants = this.getViewConstants(viewports, studies, activeIndex);
    console.debug(this.viewConstants);

    this.notification = UINotificationService.create({});
    this.settings = React.createRef();
    this.actions = {
      radiomics: React.createRef(),
      segmentation: React.createRef(),
    };

    this.state = this.getSettings()
    this.viewSegments = [];

  }

  async componentDidMount() {
    await this.onInfo();
    this.setState({viewSegments: this.getViewSegments()});
    console.log("GirderRadiomics Panel did mount correctly!")
  }

  client = () => {
    // const settings =
    //   this.settings && this.settings.current && this.settings.current.state
    //     ? this.settings.current.state
    //     : null;
    return new GirderRadiomicsClient(
      this.state.url ? this.state.url : 'http://localhost:8080'
    );
  };

  getSettings = () => {
    const url = CookieUtils.getCookieString(
      'GIRDERRADIOMICS_SERVER_URL',
      'http://' + window.location.host.split(':')[0] + ':8080/api/v1/'
    );
    console.log(url)
    return {
      url: url,
      info: {},
      action: {},
      viewSegments: [],
    };
  };

  getViewConstants = (viewports, studies, activeIndex) => {
    const viewport = viewports[activeIndex];
    const { PatientID } = studies[activeIndex];

    const {
      StudyInstanceUID,
      SeriesInstanceUID,
      displaySetInstanceUID,
    } = viewport;

    return {
      PatientID: PatientID,
      StudyInstanceUID: StudyInstanceUID,
      SeriesInstanceUID: SeriesInstanceUID,
    };
  };

  getViewSegments = () => {
    var segments = this.state.info.segments[this.viewConstants.SeriesInstanceUID];
    return segments;
  }

  onInfo = async () => {
    let log = document.getElementById("login").value;
    let pwd = document.getElementById("password").value;
    var params =  {
      orthanc: 'http://localhost/proxy/dicom-web',
      login: log,
      psswd: pwd,
      token: CookieUtils.getCookie("AUTH_SERVER_KEY"),
    }
    if ( log === null || log === '' || pwd === null || pwd === ''){
      this.notification.show({
        title: 'Girder Radiomics',
        message: 'Might need to add credentials to be able to use this service',
        type: 'warning',
        duration: 5000,
      });
    }
    const response = await this.client().info(params);
    if (response.status !== 200 || response.data.status !== 200) {
      this.notification.show({
        title: 'Girder Radiomics',
        message: 'Failed to Connect to Girder',
        type: 'error',
        duration: 5000,
      });
    } else {
      this.notification.show({
        title: 'Girder Radiomics',
        message: 'Connected to Girder - Successful',
        type: 'success',
        duration: 2000,
      });

      this.setState({ info: response.data});
    }
  };

  onSelectActionTab = name => {
    // Leave Event
    for (const action of Object.keys(this.actions)) {
      if (this.state.action === action) {
        if (this.actions[action].current)
          this.actions[action].current.onLeaveActionTab();
      }
    }

    // Enter Event
    for (const action of Object.keys(this.actions)) {
      if (name === action) {
        if (this.actions[action].current)
          this.actions[action].current.onEnterActionTab();
      }
    }

    this.setState({ action: name });
  };

  onOptionsConfig = () => {
    return this.actions['options'].current &&
      this.actions['options'].current.state
      ? this.actions['options'].current.state.config
      : {};
  };

  onBlurSeverURL = evt => {
    console.log('On Connect')
    let url = evt.target.value;
    this.setState({ url: url });
    CookieUtils.setCookie('GIRDERRADIOMICS_SERVER_URL', url);
    this.connect()
  };

  async connect () {
    await this.onInfo();
  }


  render() {
    return (
      <div className="girderRadiomicsPanel">

        <h3> <b> Girder Extension </b> </h3>
        <p style={{ fontSize: 'smaller' }}>
           Enables connection to a Girder platform to use PyRadiomics and
           segmentation models.
        </p>

        <hr className="seperator" />
        <br style={{ margin: '3px' }} />

        <table className="settingsTable">
          <tbody>
            <tr>
                <td>Girder:</td>
                <td>
                    <input
                      className="actionInput"
                      name="aiaaServerURL"
                      type="text"
                      defaultValue={this.state.url}
                      onBlur={this.onBlurSeverURL}
                    />
                  </td>
                  <td>&nbsp;</td>
                  <td>
                    <button className="actionButton" onClick={this.onBlurSeverURL} title={'Connect'}>
                      Connect
                    </button>
                  </td>
                </tr>
                <tr style={{ fontSize: 'smaller' }}>
                  <td>
                    Login &nbsp;
                  </td>
                  <td>
                    <input type='username'
                             className="actionInput"
                             name='login'
                             id='login'
                     />
                  </td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                </tr>
                <tr style={{ fontSize: 'smaller' }}>
                  <td>
                    Password &nbsp;
                  </td>
                  <td>
                    <input type='password'
                           className="actionInput"
                           name='password'
                           id='password'
                    />
                  </td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                </tr>
              </tbody>
        </table>

        <hr className="seperator" />
        <p className="subtitle">{this.state.info.name}</p>

        <div className="tabs scrollbar" id="style-3">
          <RadiomicsOptions
            ref={this.actions['options']}
            tabIndex={1}
            info={this.state.info}
            viewConstants={this.viewConstants}
            viewSegments={this.state.viewSegments}
            client={this.client}
            login={document.getElementById("login")}
            password={document.getElementById("password")}
            notification={this.notification}
            onSelectActionTab={this.onSelectActionTab}
          />


          <AutoSegmentation
            ref={this.actions['segmentation']}
            tabIndex={3}
            info={this.state.info}
            viewConstants={this.viewConstants}
            client={this.client}
            notification={this.notification}
            onSelectActionTab={this.onSelectActionTab}
            onOptionsConfig={this.onOptionsConfig}
          />

        </div>

        <p>&nbsp;</p>
      </div>
    );
  }
}
