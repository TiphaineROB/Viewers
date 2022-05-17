import React, { Component } from 'react';

import '../GirderAIModules.styl';
import { Icon } from '@ohif/ui';
import { CookieUtils } from '../../utils/GenericUtils';
import { UINotificationService } from '@ohif/core';


export default class GirderOptions extends Component {
  constructor(props) {
    super(props);
    this.notification = props.notification;
    this.state = this.getSettings();
    console.log(this.state)
    this.props = props;
  }



  getSettings = () => {
    // const url = CookieUtils.getCookieString(
    //   'GIRDERRADIOMICS_SERVER_URL',
    //    window.config.authenticationServer
    // );
    const url = window.config.authenticationServer;
    console.log(url)
    return {
      url: url,
      info: {},
    };
  };

  onBlurSeverURL = evt => {
    console.log('On Connect')
    let url = evt.target.value;
    this.setState({ url: url });
    // CookieUtils.setCookie('GIRDERRADIOMICS_SERVER_URL', url);
    this.connect()
  };

  async connect () {
    await this.onInfo();
  }

  onInfo = async () => {
    // console.log(CookieUtils.getCookie("AUTH_SERVER_KEY"))
    var params =  {orthanc: 'http://localhost/proxy/dicom-web', token: window.config.user.key, url: window.config.authenticationServer,}
    const response = await this.props.client().info(params);
    if (response.status !== 200) {
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

  render() {
    return (
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
                  <button className="ui-btn-hover-b" onClick={this.onBlurSeverURL} title={'Connect'}>
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
    );
  }
}
