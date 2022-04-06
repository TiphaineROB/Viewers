import React from 'react';
import { CookieUtils } from '../../utils/GenericUtils';
import './RadiomicsOptions.styl';
import BaseTab from './BaseTab';

export default class RadiomicsOptions extends BaseTab {
  constructor(props) {
    super(props);
    console.log('Props: ', props)
    this.state = {
      section: '',
      name: '',
      config: null,
      currentSeg: null,
      viewConstants: props.viewConstants,
      viewSegments: props.viewSegments,
    };
    this.props = props;
  }
  async componentDidMount() {
    console.log("RadiomicsOptions did mount correctly!")
  }
  // async componentDidMount() {
  //   console.log("RadiomicsOptions did mount correctly!")
  //   await this.onInfo();
  //   console.log(this.state)
  // }
  //
  // onInfo = async () => {
  //   var params =  {orthanc: 'http://localhost/proxy/dicom-web'}
  //   const response = await this.client.info(params);
  //   if (response.status !== 200) {
  //     this.notification.show({
  //       title: 'Girder Radiomics',
  //       message: 'Failed to Connect to Girder',
  //       type: 'error',
  //       duration: 5000,
  //     });
  //   } else {
  //     this.notification.show({
  //       title: 'Girder Radiomics',
  //       message: 'Connected to Girder - Successful',
  //       type: 'success',
  //       duration: 2000,
  //     });
  //     const segments = this.response.data.segments[this.state.viewConstants.SeriesInstanceUID];
  //     this.setState({ viewSegments: segments});
  //   }
  // };

  onClickAction = async evt => {
    console.log(this.currentSeg())
    if (this.currentSeg() == null ){
      this.notification.show({
        title: 'Girder Radiomics',
        message: 'No Segments available',
        type: 'error',
        duration: 5000,
      });
    }
    else if (this.props.login === null || this.props.password === null){
      this.notification.show({
        title: 'Girder Radiomics',
        message: 'Need to pass credentials to be able to use this service',
        type: 'warning',
        duration: 5000,
      });
    }
    else {
      this.notification.show({
        title: 'Girder Radiomics',
        message: 'Starting Radiomics Extraction...',
        type: 'warning',
        duration: 5000,
      });
      var params =  {
        orthanc: 'http://localhost/proxy/dicom-web', // qu'il faut récupérer de la config ?
        studyID: this.state.viewConstants.StudyInstanceUID,  // a récupéré des composants
        serieImgID: this.state.viewConstants.SeriesInstanceUID,
        serieMaskID: this.currentSeg(),
        collection: '61f7b3ade525b9309f549de2',
        login: this.props.login.value,
        psswd: this.props.password.value,
        token: CookieUtils.getCookie("AUTH_SERVER_KEY"),
      }
      const response = await this.props.client().get_radiomics(params);
      console.log(response)
      if (response.status !== 200 || response.data.status !== 200) {
        this.notification.show({
          title: 'Girder Radiomics',
          message: 'Girder error - Failed to Start Extraction',
          type: 'error',
          duration: 5000,
        });
      } else {
        this.notification.show({
          title: 'Girder Radiomics',
          message: 'Radiomics Extraction via Girder - Successful',
          type: 'success',
          duration: 2000,
        });
      }

    }

  };

  // onClickSegments = async evt => {
  //   console.log('WIP');
  //   var params =  { orthanc: 'http://localhost/proxy/dicom-web' }
  //   const response = await this.props.client().info(params);
  //   if (response.status !== 200) {
  //     this.notification.show({
  //       title: 'Girder Radiomics',
  //       message: 'Failed to Connect to Girder',
  //       type: 'error',
  //       duration: 5000,
  //     });
  //   } else {
  //     this.notification.show({
  //       title: 'Girder Radiomics',
  //       message: 'Connected to Girder - Successful',
  //       type: 'success',
  //       duration: 2000,
  //     });
  //     this.setState({viewSegments: this.getViewSegments(response)})
  //   }
  // };
  //
  // getViewSegments = (response) => {
  //   var segments = this.response.data.segments[this.state.viewConstants.SeriesInstanceUID];
  //   return segments;
  // }

  onChangeSeg = evt => {
    this.setState({ currentSeg: evt.target.value });
  };

  currentSeg = () => {
    return this.state.currentSeg
      ? this.state.currentSeg
      : null;
  };
  // <td width="75%">
  //   <button
  //     className="optionsButton"
  //     onClick={this.onClickSegments}
  //     title={'Get segments'}
  //     style={{ display: this.onClickSegments? 'block' : 'none' }}
  //   >
  //     Get Correlated SEG
  //   </button>
  // </td>

  render() {
    let config = this.state.config ? this.state.config : {};
    let currentSeg = this.currentSeg()
    //window.location.reload(false);
    return (
      <div className="tab">
        <input
          className="tab-switch"
          type="checkbox"
          id={this.tabId}
          name="radiomics"
          value="radiomics"
          onClick={this.onSelectActionTab}
          defaultChecked
        />
        <label className="tab-label" htmlFor={this.tabId}>
          PyRadiomics Extraction
        </label>
        <div className="tab-content" id='toreload'>
          <table>
            <tbody>
              <tr>
                <td width="50%"> &nbsp;</td>
                <td width="50%">
                  <button
                    className="actionButton"
                    onClick={this.onClickAction}
                    title={'Run Extraction Radiomics'}
                    style={{ display: this.onClickAction? 'block' : 'none' }}
                  >
                    Run Extraction
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <table>
            <tbody>
              <tr>
                <td>
                  <p></p>
                  <b>StudyUID:</b>
                  <p style={{ fontSize: 'smaller' }}>
                    {this.state.viewConstants.StudyInstanceUID}
                  </p>
                </td>
              </tr>
              <tr>
                <td> <b>SerieUID:</b>
                  <p style={{ fontSize: 'smaller' }}>
                    {this.state.viewConstants.SeriesInstanceUID}
                  </p>
                </td>
              </tr>
              <tr>
                <td> <b>SegmentsUID: </b>
                  <p>
                    <select
                      className="selectBox"
                      onChange={this.onChangeSeg}
                      value={currentSeg}
                    >
                      {
                        this.props.viewSegments && this.props.viewSegments.map(model => (
                        <option key={model} name={model} value={model}>
                          {`${model} `}
                        </option>
                      ))}
                    </select>
                   </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    );
  }
}
