import React, { Component } from 'react';
import PropTypes from 'prop-types';

import './GirderAIModules.styl';
import GirderClient from '../services/GirderClient';
import { utils, classes, UINotificationService } from '@ohif/core';
//import { getImageIdsForDisplaySet } from '../utils/SegmentationUtils';
import cornerstone from 'cornerstone-core';
import MD5 from 'md5.js';
import AutoSegmentation from './panelComponents/AutoSegmentation';
import RadiomicsOptions from './panelComponents/RadiomicsOptions';
import GirderOptions from './panelComponents/GirderOptions';
import { CookieUtils } from '../utils/GenericUtils';
import { ScrollableArea, TableList, TableListItem, Icon } from '@ohif/ui';

const { studyMetadataManager, xhrRetryRequestHook} = utils;
const { MetadataProvider } = classes;

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library } from "@fortawesome/fontawesome-svg-core";
import { faDownload } from '@fortawesome/free-solid-svg-icons'
library.add(faDownload)

import moment from 'moment';
import axios from 'axios';

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

    this.notification = UINotificationService.create({});
    this.settings = React.createRef();
    this.actions = {
      radiomics: React.createRef(),
      segmentation: React.createRef(),
    };

    this.state = this.getSettings()
    this.viewSegments = this.getViewSegments();

  }

  async componentDidMount() {
    const { viewports, studies, activeIndex } = this.props;
    this.viewConstants = this.getViewConstants(viewports, studies, activeIndex);
    await this.onInfo();
    this.setState({viewSegments: this.getViewSegments()});
    console.log("GirderRadiomics Panel did mount correctly!")
  }

  client = () => {
    // const settings =
    //   this.settings && this.settings.current && this.settings.current.state
    //     ? this.settings.current.state
    //     : null;
    return new GirderClient(
      this.state.url ? this.state.url : window.config.authenticationServer
    );
  };

  getSettings = () => {
    // const url = CookieUtils.getCookieString(
    //   'GIRDERRADIOMICS_SERVER_URL',
    //    window.config.authenticationServer
    // );
    const url = window.config.authenticationServer;
    return {
      url: url,
      info: {},
      action: {},
    };
  };

  getViewConstants = (viewports, studies, activeIndex) => {
    const viewport = viewports[activeIndex];
    const { PatientID } = studies[activeIndex];

    const {
      StudyInstanceUID,
      SeriesInstanceUID,
      displaySetInstanceUID,
      SeriesNumber
    } = viewport;

    return {
      PatientID: PatientID,
      StudyInstanceUID: StudyInstanceUID,
      SeriesInstanceUID: SeriesInstanceUID,
      SeriesNumber: SeriesNumber,
    };
  };

  getViewSegments = () => {

    const _getReferencedSegDisplaysets = (StudyInstanceUID, SeriesInstanceUID) => {
      /* Referenced DisplaySets */
      const studyMetadata = studyMetadataManager.get(StudyInstanceUID);
      const referencedDisplaysets = studyMetadata.getDerivedDatasets({
        referencedSeriesInstanceUID: SeriesInstanceUID,
        Modality: 'SEG',
      });

      /* Sort */
      referencedDisplaysets.sort((a, b) => {
        const aNumber = Number(`${a.SeriesDate}${a.SeriesTime}`);
        const bNumber = Number(`${b.SeriesDate}${b.SeriesTime}`);
        return bNumber - aNumber;
      });

      return referencedDisplaysets;
    };



    var segments = _getReferencedSegDisplaysets(this.viewConstants.StudyInstanceUID, this.viewConstants.SeriesInstanceUID);

    return segments;
  }

  onInfo = async () => {
    let log = '';//document.getElementById("login").value;
    let pwd = '';//document.getElementById("password").value;
    var params =  {
      orthanc: 'http://localhost/proxy/dicom-web',
      login: log,
      psswd: pwd,
      token: window.config.user.key,//CookieUtils.getCookie("AUTH_SERVER_KEY"),
      url: window.config.authenticationServer,
    }
    // if ( log === null || log === '' || pwd === null || pwd === ''){
    //   this.notification.show({
    //     title: 'Girder Radiomics',
    //     message: 'Might need to add credentials to be able to use this service',
    //     type: 'warning',
    //     duration: 5000,
    //   });
    // }
    const response = await this.client().info(params);

    if (response.status !== 200 || response.data.status !== 200) {
      this.notification.show({
        title: 'Girder Radiomics',
        message: 'Failed to Connect to Girder',
        type: 'error',
        duration: 5000,
      });
    } else {
      this.metadataFiles = response.data.metadata;
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
    //console.log('On Connect')
    let url = evt.target.value;
    this.setState({ url: url });
   // CookieUtils.setCookie('GIRDERRADIOMICS_SERVER_URL', url);
    this.connect()
  };

  async connect () {
    await this.onInfo();
  }

  async onDownload (evt, element) {
    console.log("OnDownload event")
    const id = element[1]
    const request = async () => {
        if (window.config.authenticationRequired) {
          const uri_params = {
            baseURL: window.config.authenticationServer,
            params: {
              token: window.config.user.key,
              id: id
              }
          }
          const ax_rest = axios.create(uri_params);
          let access = await ax_rest.get("/radiomicsOHIF/download", {})
                .then(
                  function(r) {
                      return r.data;
                });
          return access;
        }
        return true;
    }

    const response = await request()
    if (response.status===200) {
        var FileSaver = require('file-saver');
        let filename = response.filename; //`test.dcm`

        console.log(response.data)
        var blob = new Blob([response.data], { type: 'text/plain;charset=utf-8' });
        FileSaver.saveAs(blob, filename);
    }
    // console.log(client)
    // const response = await client.downloadItem(params)
    console.log(response)
  }


  render() {

    const { viewports, studies, activeIndex } = this.props;
    this.viewConstants = this.getViewConstants(viewports, studies, activeIndex);

    var segments = this.getViewSegments()
    let dictSegs = {}
    for (var index in segments) {
      const {
        SeriesDate,
        SeriesTime,
        SeriesDescription,
        SeriesInstanceUID,
      } = segments[index]

      const dateStr = `${SeriesDate}:${SeriesTime}`.split('.')[0];
      const date = moment(dateStr, 'YYYYMMDD:HHmmss');
      const displayDate = date.format('ddd, MMM Do YYYY, h:mm:ss a');
      dictSegs[SeriesInstanceUID] = (
            <p>
              {SeriesDescription}
              <br/> {displayDate}
            </p>
        )
    }

    let files;
    if (this.metadataFiles) {
      files = this.metadataFiles.filter(element => {
         return element.series===this.viewConstants.SeriesInstanceUID
      }).map( (element, index) => {
        const elementLabel = (
          <div>
            {element.date}
            <p style={{ fontSize: 'smaller' }}> {dictSegs[element.maskID]} </p>
          </div>
        )
        console.log(element)
        return (
          <div className="dcmseg-segment-item">
            <TableListItem
              key={index+1}
              itemKey={[this.client, element.itemID]}
              itemIndex={index+1}
              itemClass="test"
              itemMeta={<FontAwesomeIcon icon="download" style={{color: '#cfdbe7'}}/>}
              itemMetaClass="segment-color-section"
              onItemClick={this.onDownload}
              children={elementLabel}
            >
            </TableListItem>
          </div>

        );
      })
    }

    return (
      <div className="girderRadiomicsPanel">

        <h3> <b> Girder Extension </b> </h3>
        <p style={{ fontSize: 'smaller' }}>
           Enables connection to a Girder platform to use PyRadiomics and
           segmentation models.
        </p>

        <hr className="seperator" />
        <hr className="seperator" />

        <br style={{ margin: '3px' }} />

        <div className="section">
          <div className="header">
            <div>
              Extraction radiomics
            </div>
          </div>

            <RadiomicsOptions
              ref={this.actions['options']}
              tabIndex={1}
              info={this.state.info}
              viewConstants={this.viewConstants}
              viewSegments={this.getViewSegments()}
              client={this.client}
              notification={this.notification}
              onSelectActionTab={this.onSelectActionTab}
              callback={this.onInfo}
            />

        </div>

        <div className="section">
          <div className="header">
            <div>
              Browse existing radiomics files
            </div>
          </div>
          <ScrollableArea>
            <TableList headless>{files}</TableList>
          </ScrollableArea>

        </div>

        <p>&nbsp;</p>
      </div>
    );
  }
}
// <div className="tabs scrollbar" id="style-3">
//   {
//     files
//   }
// </div>
// <div className="tabs scrollbar" id="style-3"></div>
// <table className="settingsTable">
//   <tbody>
//     <tr>
//         <td>Girder:</td>
//         <td>
//             <input
//               className="actionInput"
//               name="aiaaServerURL"
//               type="text"
//               defaultValue={this.state.url}
//               onBlur={this.onBlurSeverURL}
//             />
//           </td>
//           <td>&nbsp;</td>
//           <td>
//             <button className="actionButton" onClick={this.onBlurSeverURL} title={'Connect'}>
//               Connect
//             </button>
//           </td>
//         </tr>
//         <tr style={{ fontSize: 'smaller' }}>
//           <td>
//             Login &nbsp;
//           </td>
//           <td>
//             <input type='username'
//                      className="actionInput"
//                      name='login'
//                      id='login'
//              />
//           </td>
//           <td>&nbsp;</td>
//           <td>&nbsp;</td>
//         </tr>
//         <tr style={{ fontSize: 'smaller' }}>
//           <td>
//             Password &nbsp;
//           </td>
//           <td>
//             <input type='password'
//                    className="actionInput"
//                    name='password'
//                    id='password'
//             />
//           </td>
//           <td>&nbsp;</td>
//           <td>&nbsp;</td>
//         </tr>
//       </tbody>
// </table>

// <AutoSegmentation
//   ref={this.actions['segmentation']}
//   tabIndex={3}
//   info={this.state.info}
//   viewConstants={this.viewConstants}
//   client={this.client}
//   notification={this.notification}
//   onSelectActionTab={this.onSelectActionTab}
//   onOptionsConfig={this.onOptionsConfig}
// />
