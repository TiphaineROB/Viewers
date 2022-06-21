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
      const settings = this.getSettings()

      console.log(settings)

      var params =  {
        orthanc: 'http://localhost/proxy/dicom-web', // qu'il faut récupérer de la config ?
        patientID: this.props.viewConstants.PatientID,
        studyID: this.props.viewConstants.StudyInstanceUID,  // a récupéré des composants
        serieImgID: this.props.viewConstants.SeriesInstanceUID,
        serieMaskID: MaskID,
        //collection: '61f7b3ade525b9309f549de2',
        token: window.config.user.key,//CookieUtils.getCookie("AUTH_SERVER_KEY"),
        url: window.config.authenticationServer,
        settings: settings,
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

  getSettings = () => {
    console.log(document.getElementById("minimumROIDimensions"))
    var selectROIDims = document.getElementById('minimumROIDimensions');
    var selectInterpolator = document.getElementById('interpolator');


    return {
      normalize: document.getElementById("checkboxNormalize").checked,
      normalizeScale: document.getElementById("normalizeScale").value,
      interpolator: selectInterpolator.options[selectInterpolator.selectedIndex].value,
      preCrop: document.getElementById("checkboxPreCrop").checked,
      minimumROIDimensions:  selectROIDims.options[selectROIDims.selectedIndex].value,
      minimumROISize: document.getElementById("minimumROISize").value,
      correctMask: document.getElementById("checkboxCorrectMask").checked,
      binWidth: document.getElementById("binWidth").value,
      binCount: document.getElementById("binCount").value,
      voxelBased: document.getElementById("checkboxVoxel").checked,
      kernelRadius: document.getElementById("kernelRadius").value,
    }

  };

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

    const onChange = (target, value) => {
      console.log("onChange", target, value)
      document.getElementsByTagName(target.id).checked=value;
      this.setState({checked: value});
    }

    this.current = this.currentSeg()!=null ?  this.currentSeg() : segments.length > 0 ? segments[0] : null;

    this.disabled = false;
    this.checked = false; //this.state.checked ? this.state.checked : false;

    this.minimumROIDimensionsOptions = [1, 2, 3]
    this.interpolatorOptions = ["sitkNearestNeighbor", "sitkLinear", "sitkBSpline",
        "sitkGaussian", "sitkLabelGaussian", "sitkHammingWindowedSinc",
        "sitkCosineWindowedSinc", "sitkWelchWindowedSinc", "sitkLanczosWindowedSinc",
        "sitkBlackmanWindowedSinc"
    ]

    this.minimumROIDimensionsSelected=2;
    this.interpolatorSelected="sitkBSpline";

    console.log(this.checked)
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
                <td width="100%" style={{display: "inline-block"}}>
                  <p>
                    <b>Series Number:</b> {this.props.viewConstants.SeriesNumber}
                    &nbsp; &nbsp;&nbsp; &nbsp;&nbsp; &nbsp;&nbsp; &nbsp;&nbsp; &nbsp;&nbsp; &nbsp;
                    <button
                      className="ui-btn-hover-b"
                      onClick={this.onClickAction}
                      title={'Run Extraction Radiomics'}
                      style={{ display: "inline-block" }}
                    >
                      Extract
                    </button>
                  </p>
                </td>
              </tr>
              <tr>
                <td> <b>Segment Description & Date: </b>
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
                </td>

              </tr>
            </tbody>
          </table>
          <br/>
          <table>
            <thead>
              <b> Radiomics extractor parameters: </b>
            </thead>
            <tbody>
              <tr className="tr-header">
                &ensp; &#187;  Feature Extractor Level
              </tr>
              <tr>
                <td width="50%" style={{display: "inline-block"}}>
                  <label htmlFor="minimumROIDimensions" className="form-label" style={{display: "inline-block"}}>
                    ROI Dim &emsp;&ensp;&nbsp;
                  </label>
                  <select id="minimumROIDimensions" className="form-select">
                    {
                      this.minimumROIDimensionsOptions.map( (val, index) => {
                          let elem = (
                            <option value={val}>{val}</option>
                          )
                          if (val==this.minimumROIDimensionsSelected) {
                            elem = (
                              <option value={val} selected>{val}</option>
                            )
                          }
                          return elem;
                      })
                    }
                  </select>
                </td>
                <td width="50%" style={{display: "inline-block"}}>
                  <label htmlFor="minimumROISize" className="form-label" style={{display: "inline-block"}}>
                    Min. Size  &ensp;&ensp;&nbsp;
                  </label>
                  <input
                    type="text"
                    className="form-control-rad"
                    name="minimumROISize"
                    id="minimumROISize"
                    style={{size: 4, display: "inline-block"}}
                    disabled={this.disabled}
                  />
                </td>
              </tr>
              <tr>
                <td width="50%" style={{display: "inline-block"}}>
                  <label htmlFor="normalize" className="form-label" style={{display: "inline-block"}}>
                    Normalize&emsp;
                  </label>
                  <div className={"toggle-switch small-switch"} id="normalize">
                     <input
                       type="checkbox"
                       name="checkboxNormalize"
                       className="toggle-switch-checkbox"
                       id="checkboxNormalize"
                       onChange={(e) => onChange(e.target, e.target.checked)}
                       checked={this.checked}
                       disabled={this.disabled}
                     />
                     <label
                      className="toggle-switch-label"
                      htmlFor="checkboxNormalize"
                    >
                       <span
                         className="toggle-switch-inner"
                         data-yes="True"
                         data-no="False"
                       />
                       <span
                           className="toggle-switch-switch"
                        />
                       </label>
                   </div>
                </td>
                <td width="50%" style={{display: "inline-block"}}>
                  <label htmlFor="normalizeScale" className="form-label" style={{display: "inline-block"}}>
                    Scale  &emsp;&ensp;&ensp;&nbsp;&nbsp;&nbsp;
                  </label>
                  <input
                    type="text"
                    className="form-control-rad"
                    name="normalizeScale"
                    id="normalizeScale"
                    style={{size: 4, display: "inline-block"}}
                    disabled={this.disabled}
                  />
                </td>
              </tr>
              <tr>
                <td width="90%" style={{display: "inline-block"}}>
                  <label htmlFor="interpolator" className="form-label" style={{display: "inline-block"}}>
                   Interpolator
                  </label>
                  <select id="interpolator" className="form-select">
                    {
                      this.interpolatorOptions.map( (val, index) => {
                        console.log(index, val)
                          let elem = (
                            <option value={val}>{val}</option>
                          )
                          if (val==this.interpolatorSelected) {
                            elem = (
                              <option value={val} selected>{val}</option>
                            )
                          }
                          return elem;
                      })
                    }
                  </select>
                </td>
                <td width="10%" style={{display: "inline-block"}}>
                </td>
              </tr>
              <tr>
                  <td width="50%" style={{display: "inline-block"}}>
                    <label htmlFor="preCrop" className="form-label" style={{display: "inline-block"}}>
                      Pre Crop&emsp;&ensp;
                    </label>
                    <div className={"toggle-switch small-switch"} id="preCrop">
                       <input
                         type="checkbox"
                         name="checkboxPreCrop"
                         className="toggle-switch-checkbox"
                         id="checkboxPreCrop"
                         onChange={(e) => onChange(e.target, e.target.checked)}
                         checked={this.checked}
                         disabled={this.disabled}
                       />
                       <label
                        className="toggle-switch-label"
                        htmlFor="checkboxPreCrop"
                      >
                         <span
                           className="toggle-switch-inner"
                           data-yes="True"
                           data-no="False"
                         />
                         <span
                             className="toggle-switch-switch"
                          />
                         </label>
                     </div>
                  </td>
                  <td width="50%" style={{display: "inline-block"}}>
                    <label htmlFor="correctMask" className="form-label" style={{display: "inline-block"}}>
                      CorrectMask
                    </label>
                    <div className={"toggle-switch small-switch"} id="correctMask">
                       <input
                         type="checkbox"
                         name="checkboxCorrectMask"
                         className="toggle-switch-checkbox"
                         id="checkboxCorrectMask"
                         onChange={(e) => onChange(e.target, e.target.checked)}
                         checked={this.checked}
                         disabled={this.disabled}
                       />
                       <label
                        className="toggle-switch-label"
                        htmlFor="checkboxCorrectMask"
                      >
                         <span
                           className="toggle-switch-inner"
                           data-yes="True"
                           data-no="False"
                         />
                         <span
                             className="toggle-switch-switch"
                          />
                         </label>
                     </div>
                  </td>
              </tr>
              <tr className="tr-header">
                &ensp; &#187;  Feature Class Level
              </tr>
              <tr>
                <td width="50%" style={{display: "inline-block"}}>
                    <label htmlFor="binCount" className="form-label" style={{display: "inline-block"}}>
                      Bins Count &ensp;
                    </label>
                    <input
                      type="text"
                      className="form-control-rad"
                      name="binCount"
                      id="binCount"
                      style={{size: 2, display: "inline-block"}}
                      disabled={this.disabled}
                    />
                </td>
                <td width="50%" style={{display: "inline-block"}}>
                  <label htmlFor="binWidth" className="form-label" style={{display: "inline-block"}}>
                    Bin Width  &ensp;&ensp;
                  </label>
                  <input
                    type="text"
                    className="form-control-rad"
                    name="binWidth"
                    id="binWidth"
                    style={{size: 4, display: "inline-block"}}
                    disabled={this.disabled}
                  />
                </td>
              </tr>
              <tr className="tr-header">
                &ensp; &#187;  Voxel-based specific settings
              </tr>
              <tr>
                <td width="50%" style={{display: "inline-block"}}>
                  <label htmlFor="voxelBased" className="form-label" style={{display: "inline-block"}}>
                    Voxel Based
                  </label>
                  <div className={"toggle-switch small-switch"} id="voxelBased">
                     <input
                       type="checkbox"
                       name="checkboxVoxel"
                       className="toggle-switch-checkbox"
                       id="checkboxVoxel"
                       onChange={(e) => onChange(e.target, e.target.checked)}
                       checked={this.checked}
                       disabled={this.disabled}
                     />
                     <label
                      className="toggle-switch-label"
                      htmlFor="checkboxVoxel"
                    >
                       <span
                         className="toggle-switch-inner"
                         data-yes="True"
                         data-no="False"
                       />
                       <span
                           className="toggle-switch-switch"
                        />
                       </label>
                   </div>
                </td>
                <td width="50%" style={{display: "inline-block"}}>
                  <label htmlFor="kernelRadius" className="form-label" style={{display: "inline-block"}}>
                    Kernel radius
                  </label>
                  <input
                    type="text"
                    className="form-control-rad"
                    name="kernelRadius"
                    id="kernelRadius"
                    style={{size: 4, display: "inline-block"}}
                    disabled={this.disabled}
                  />
                </td>
              </tr>
            </tbody>
          </table>

        </div>
      </div>

    );
  }
}


// <option value="1">1</option>
// <option value="2" selected>2</option>
// <option value="3">3</option>

//
// <label htmlFor="normalize" className="form-label" style={{display: "inline-block"}}>
//   Normalize &ensp;&nbsp;
// </label>

// <input
//   type="text"
//   className="form-control-rad"
//   name="normalize"
//   id="normalize"
//   value="True"
//   style={{size: 4, display: "inline-block"}}
// />
