import React from 'react';
import { CookieUtils } from '../../utils/GenericUtils';
import './RadiomicsOptions.styl';
import BaseTab from './BaseTab';
import moment from 'moment';
import { utils, classes, UINotificationService } from '@ohif/core';
const { studyMetadataManager, xhrRetryRequestHook} = utils;
const { MetadataProvider } = classes;


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
    console.log(this.state.viewSegments)

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
    console.log(this.current)
    if (this.current == null ){
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

      const MaskID = this.getMaskID(this.current)

      console.log(MaskID)
      var params =  {
        orthanc: 'http://localhost/proxy/dicom-web', // qu'il faut récupérer de la config ?
        patientID: this.props.viewConstants.PatientID,
        studyID: this.props.viewConstants.StudyInstanceUID,  // a récupéré des composants
        serieImgID: this.props.viewConstants.SeriesInstanceUID,
        serieMaskID: MaskID,
        //collection: '61f7b3ade525b9309f549de2',
        token: window.config.user.key,//CookieUtils.getCookie("AUTH_SERVER_KEY"),
        url: window.config.authenticationServer,
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
        this.props.callback()
      }

    }

  };

  getMaskID = (segname) => {
    const description = segname.split(' -- ')[0]
    const date = segname.split(' -- ')[1]
    for ( var index in this.props.viewSegments) {
      const {
        SeriesDate,
        SeriesTime,
        SeriesDescription,
      } = this.props.viewSegments[index]

      const dateStr = `${SeriesDate}:${SeriesTime}`.split('.')[0];
      const dateMoment = moment(dateStr, 'YYYYMMDD:HHmmss');
      const displayDate = dateMoment.format('ddd, MMM Do YYYY, h:mm:ss a');
      // console.log(displayDate, date, description, SeriesDescription)
      if (displayDate===date && description===SeriesDescription)
      {
          return this.props.viewSegments[index].SeriesInstanceUID;
      }
    }
  }
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
    console.log(evt)
    this.setState({ currentSeg: evt.target.value });
  };

  currentSeg = () => {
    return this.state.currentSeg
      ? this.state.currentSeg
      : null;
  };

  render() {

    console.log(this.state)
    console.log(this.props)

    let config = this.state.config ? this.state.config : {};

    // Get segments
    let segments = [];
    for (var index in this.props.viewSegments) {
      const {
        SeriesDate,
        SeriesTime,
        SeriesDescription,
      } = this.props.viewSegments[index]

      const dateStr = `${SeriesDate}:${SeriesTime}`.split('.')[0];
      const date = moment(dateStr, 'YYYYMMDD:HHmmss');
      const displayDate = date.format('ddd, MMM Do YYYY, h:mm:ss a');
      segments.push(SeriesDescription + ' -- ' + displayDate)
    }

    this.current = this.currentSeg()!=null ?  this.currentSeg() : segments.length > 0 ? segments[0] : null;

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
                    className="ui-btn-hover-b"
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
                  <b>Series Number:</b> {this.props.viewConstants.SeriesNumber}
                </td>
              </tr>
              <tr>
                <td> <b>SegmentsUID: </b>
                  <p>
                    <select
                      className="selectBox"
                      onChange={this.onChangeSeg}
                      value={this.current}
                    >
                      {
                        segments && segments.map(model => (
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
// <tr>
//   <td>
//     <p></p>
//     <b>StudyUID:</b>
//     <p style={{ fontSize: 'smaller' }}>
//       {this.props.viewConstants.StudyInstanceUID}
//     </p>
//   </td>
// </tr>
