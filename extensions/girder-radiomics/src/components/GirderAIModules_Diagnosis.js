import React, { Component } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import './GirderAIModules.styl';
import GirderClient from '../services/GirderClient';
import { utils, classes, UINotificationService } from '@ohif/core';

const { studyMetadataManager, xhrRetryRequestHook} = utils;
const { MetadataProvider } = classes;

import { Icon } from '@ohif/ui';

//import { getImageIdsForDisplaySet } from '../utils/SegmentationUtils';
import cornerstone from 'cornerstone-core';
import MD5 from 'md5.js';
import AutoSegmentation from './panelComponents/AutoSegmentation';
import RadiomicsOptions from './panelComponents/RadiomicsOptions';
import ModelSelector from './panelComponents/ModelSelector';
import FileSelector from './panelComponents/FileSelector';
import GirderOptions from './panelComponents/GirderOptions';
import { CookieUtils } from '../utils/GenericUtils';


import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faUnlock } from '@fortawesome/free-solid-svg-icons'
import { faLockOpen } from '@fortawesome/free-solid-svg-icons'
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons'
import { library } from "@fortawesome/fontawesome-svg-core";

library.add(faLock)
library.add(faUnlock)
library.add(faLockOpen)
library.add(faCheck)
library.add(faXmark)


export default class GirderDiagnosisPanel extends Component {
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
    this.modelSelector = React.createRef();
    this.diagFileSelector = React.createRef();
    this.settings = React.createRef();
    this.actions = {
      radiomics: React.createRef(),
    };

    this.state = this.getSettings()
    this.segments = [];
    this.radiomics = {};

  }

  async componentDidMount() {
    await this.onInfo();
    console.log("GirderRadiomics Panel did mount correctly!")
  }

  client = () => {
    // const settings =
    //   this.settings && this.settings.current && this.settings.current.state
    //     ? this.settings.current.state
    //     : null;
    return new GirderClient(
      window.config.authenticationServer
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
      viewSegments: [],
      models: [],
      files: [],
      radiomics: {},
    };
  };

  getViewConstants = (viewports, studies, activeIndex) => {
    const viewport = viewports[activeIndex];
    const { PatientID } = studies[activeIndex];

    const {
      StudyInstanceUID,
      SeriesInstanceUID,
      displaySetInstanceUID,
      SOPInstanceUID,
    } = viewport;

    return {
      PatientID: PatientID,
      StudyInstanceUID: StudyInstanceUID,
      SeriesInstanceUID: SeriesInstanceUID,
      SOPInstanceUID: SOPInstanceUID,
    };
  };

  getViewSegments = () => {
    const { viewports, studies, activeIndex } = props;
    this.viewConstants = this.getViewConstants(viewports, studies, activeIndex);
    var segments = this.state.info.segments[this.viewConstants.SeriesInstanceUID];
    return segments;
  }

  onInfo = async () => {
    var params =  {
      orthanc: 'http://localhost/proxy/dicom-web',
      token: window.config.user.key,//CookieUtils.getCookie("AUTH_SERVER_KEY"),
      url: window.config.authenticationServer,
    }

    const response = await this.client().info(params);  
    const response2 = await this.client().infoDiagnosisPanel(params);

    if (response.status !== 200 || response.data.status !== 200 || response2.status !== 200 || response2.data.status !== 200) {
      this.notification.show({
        title: 'Girder AIModules Extension',
        message: 'Failed to Fetch Information',
        type: 'error',
        duration: 5000,
      });
    } else {


      let segments = _getReferencedSegDisplaysets(this.viewConstants.StudyInstanceUID, this.viewConstants.SeriesInstanceUID)

      let displaySegments = [];
      let radiomics = response.data.metadata;
      let segment = displaySegments.length > 0 ? displaySegments[0] : null;
      let currentRad = segment!=null && radiomics[segment].length > 0 ? radiomics[segment][0].date : null

      let models = [];
      for ( var index in response2.data.models) {
          if (response2.data.models[index].type === "diagnosis") {
            models.push(response2.data.models[index])
          }
      }

      let namemodel = null;
      if (models && models.length!=0) {
        namemodel = models[0].name+' -- '+models[0].author+ ' -- '+models[0].uid
      }

      this.files = [];
      let namefile = undefined;
      let datafile = undefined;
      for ( var index in response2.data.files) {
          this.files.push(response2.data.files[index])
          if (typeof namefile === 'undefined' && response2.data.files[index].series === this.viewConstants.SeriesInstanceUID){
            namefile=response2.data.files[index].date + ' -- ' + response2.data.files[index].tool ;
            datafile=response2.data.files[index].data;
          }
      }


      this.setState({
        models: models,
        currentModel: namemodel,
        files: this.files,
        currentFile: null,
        currentData: {},
        viewSegments: segments,
        currentSeg: segment,
        radiomics: radiomics,
        currentRad: currentRad,
      });

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
    let url = evt.target.value;
    this.setState({ url: url });
   // CookieUtils.setCookie('GIRDERRADIOMICS_SERVER_URL', url);
    this.connect()
  };

  async connect () {
    await this.onInfo();
  }

  onSelectModel = model => {
    let currentname = model.name+' -- '+model.author+ ' -- '+response2.data.files[index].uid
    this.setState({ currentModel: currentname});
  };

  onSelectSeg = seg => {
    this.setState({ currentSeg: seg});
  };

  onSelectRad = rad => {
    this.setState({ currentRad: rad});
  };

  onSelectFile = file => {
    let currentdata;
    for (var index in this.state.files) {
      const currentFileDate = file.split(' -- ')[0]
      const currentFileTool = file.split(' -- ')[1]

      if (String(this.state.files[index].date)===currentFileDate && this.state.files[index].tool===currentFileTool)
      {
        currentdata = this.state.files[index].data;
        break;
      }
    }
    this.setState({ currentFile: file, currentData: currentdata});
  };

  onDiagnosis = async (modelName, seg, rad) => {
    const nid = this.notification.show({
      title: 'Segmentation',
      message: 'Running Auto-Diagnosis...',
      type: 'info',
      duration: 60000,
    });

    // inverse mapping model from the model select name
    let model;
    for (var index in this.state.models) {
      const currentModelName = modelName.split(' -- ')[0]
      const currentModelAuthor = modelName.split(' -- ')[1]
      const currentModelUID = modelName.split(' -- ')[2]

      if (this.state.models[index].name===currentModelName &&
            this.state.models[index].author===currentModelAuthor &&
            this.state.models[index].uid===currentModelUID
          )
      {
        model = this.state.models[index];
        break;
      }
    }

    var params =  {
      dataSource: 'http://localhost/proxy/dicom-web',
      token: window.config.user.key,
      patientUID: this.viewConstants.PatientID,
      studyInstanceUID: this.viewConstants.StudyInstanceUID,
      seriesInstanceUID: this.viewConstants.SeriesInstanceUID,
      sopInstanceUID: this.viewConstants.SOPInstanceUID,
      url: window.config.authenticationServer,
      segmentID: rad.maskID,
      fileRadiomics: rad,
      model: model,

    }

    const response = await this.client().diagnosis(params);

    if (response.status !== 200 || response.data.status !== 200) {
      this.notification.show({
        title: 'Girder AIModules Extension',
        message: 'Failed to Fetch Information',
        type: 'error',
        duration: 5000,
      });
    } else {
      this.files = [];
      let namefile = undefined;
      let datafile = undefined;
      for ( var index in response.data.files) {
          this.files.push(response.data.files[index])
          if (typeof namefile === 'undefined' && response.data.files[index].series === this.viewConstants.SeriesInstanceUID){
            namefile=response.data.files[index].date + ' -- ' + response.data.files[index].tool ;
            datafile=response.data.files[index].data;
          }
      }
      this.setState({
        files: this.files,
        currentFile: namefile,
        currentData: datafile,
      });
    }
  }

  onDiagFile = async () => {
  }

  render() {

    const { viewports, studies, activeIndex } = this.props;
    this.viewConstants = this.getViewConstants(viewports, studies, activeIndex);

    this.segments = _getReferencedSegDisplaysets(this.viewConstants.StudyInstanceUID, this.viewConstants.SeriesInstanceUID)
    this.radiomics = {};

    // Get segments
    let segments = [];

    for (var index in this.segments) {
      const {
        SeriesDate,
        SeriesTime,
        SeriesDescription,
      } = this.segments[index]

      const dateStr = `${SeriesDate}:${SeriesTime}`.split('.')[0];
      const date = moment(dateStr, 'YYYYMMDD:HHmmss');
      const displayDate = date.format('ddd, MMM Do YYYY, h:mm:ss a');
      const nameSeg = SeriesDescription + ' -- ' + displayDate;
      segments.push(SeriesDescription + ' -- ' + displayDate)
      const segmentID = this.segments[index].SeriesInstanceUID;

      this.radiomics[nameSeg] = [];
      for ( var idx in this.state.radiomics ) {
        if (segmentID===this.state.radiomics[idx].maskID) {
          this.radiomics[nameSeg].push(this.state.radiomics[idx])
        }
      }
    }


    let segment = this.state.currentSeg ?  this.state.currentSeg : segments.length > 0 ? segments[0] : null;

    // Get radiomics TODO
    let radiomics = [];
    let radiom = null;
    if (this.radiomics) {
      radiomics = this.radiomics[segment] ? this.radiomics[segment] : [];
      radiom = this.state.currentRad ? this.state.currentRad : radiomics.length > 0 ? radiomics[0] : null;
    }

    // Get models
    let models = [];
    for (var index in this.state.models) {
      models.push(this.state.models[index].name+' -- '+this.state.models[index].author+' -- '+this.state.models[index].uid)
    }
    let model;


    for (var index in this.state.models) {
      const currentModelName = this.state.currentModel.split(' -- ')[0]
      const currentModelAuthor = this.state.currentModel.split(' -- ')[1]
      const currentModelUID = this.state.currentModel.split(' -- ')[2]

      if (this.state.models[index].name===currentModelName &&
            this.state.models[index].author===currentModelAuthor &&
            this.state.models[index].uid===currentModelUID
          )
      {
        model = this.state.models[index];
        break;
      }
    }

    // Get files
    let filesnames = [];
    let files = [];
    for (var index in this.files) {
      if (this.files[index]["series"]===this.viewConstants.SeriesInstanceUID) {
        filesnames.push(this.files[index].date + ' -- ' + this.files[index].tool)
        files.push(this.files[index])
      }
    }

    let file = typeof this.state.currentFile!= 'undefined' && this.state.currentFile!=null ?  this.state.currentFile : files.length > 0 ? filesnames[0] : '';

    let data = typeof this.state.currentData!= 'undefined' && Object.keys(this.state.currentData).length > 0 ?  this.state.currentData : files.length > 0 ? files[0].data : {};

    let filename = null;
    for (var index in filesnames) {
      const currentFileDate = file.split(' -- ')[0]
      const currentFileTool = file.split(' -- ')[1]

      if (String(this.files[index].date)===currentFileDate && this.files[index].tool===currentFileTool)
      {
        filename = this.files[index].name;
        break;
      }
    }

    // if (data) {
    //   Object.entries(data).map( ([key, value]) => {
    //    console.log(key, value)
    //   })
    // }

    const segmentationStep = this.segments.length > 0 ? true : false;
    let radiomicsStep = false;
    for (var i in Object.values(this.radiomics)) {
      const arr = Object.values(this.radiomics)[i];

      if (arr.length > 0){
        radiomicsStep=true;
        break;
      }
    }
    const diagnosisStep = files.length > 0 ? true : false;

    return (
      <div className="girderRadiomicsPanel">

        <h3> <b> Girder AIModules extensions</b> </h3>
        <p style={{ fontSize: 'smaller' }}>
           Enables connection to the Girder server <br/>
           {window.config.authenticationServer}
        </p>

        <hr className="seperator" />
        <hr className="seperator" />

        <br style={{ margin: '3px' }} />
        <div className="section">
          <div className="header">
            <div>
              Steps of Analysis
            </div>
          </div>
          <div>
            <br/>
            &nbsp; <strong>Segmentation</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            {segmentationStep && <FontAwesomeIcon icon="check" style={{color: '#88b160'}}/>}
            <hr className="seperatorLight" />
            &nbsp; <strong>Radiomics</strong>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            {radiomicsStep && <FontAwesomeIcon icon="check" style={{color: '#88b160'}}/>}
            <hr className="seperatorLight" />
            &nbsp; <strong>Diagnosis</strong>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            {diagnosisStep && <FontAwesomeIcon icon="check" style={{color: '#88b160'}}/>}
          </div>
          <p> </p>
       </div>
       <div className="section">
         <div className="header">
           <div>
            Auto Diagnosis
           </div>
         </div>
           <br/>
           <ModelSelector
             ref={this.modelSelector}
             name="diagnosis"
             title="Diagnosis"
             models={models}
             currentModel={this.state.currentModel}
             segs={segments}
             currentSeg={segment}
             radiomics={radiomics}
             currentRad={radiom}
             onClick={this.onDiagnosis}
             onSelectModel={this.onSelectModel}
             onSelectSeg={this.onSelectSeg}
             onSelectRad={this.onSelectRad}
             usage={
               <p style={{ fontSize: 'smaller' }}>
                 Select a model and click to run.
               </p>
             }
           />
           <p> </p>
      </div>
      <div className="section">
        <div className="header">
          <div>
            Diagnosis info
          </div>
        </div>
          <br/>
          <FileSelector
            ref={this.diagFileSelector}
            name="diagnosisfile"
            title="DiagnosisFile"
            files={filesnames}
            currentFile={file}
            onClick={this.onDiagFile}
            onSelectFile={this.onSelectFile}
            usage={
              <p style={{ fontSize: 'smaller' }}>
                Select a file to visualize.
              </p>
            }
          />
          <p style={{ fontSize: 'smaller' }}>
            Select a file to visualize. Current file name on server :
            <br/> {filename}
          </p>
          <hr className="seperatorLight" />
          <div>
            {
              data &&
              Object.entries(data).map( ([key, value]) => {
                  return (
                    <div>
                      {key} : &nbsp;&nbsp;&nbsp;&nbsp; {data[key]}
                      <hr className="seperatorLight" />
                    </div>
                  )
              })
            }
          </div>
      </div>
      <div className="section">
      </div>
    </div>
    );
  }
}
 // Empty section at the end to gain space for the table


 /**
  * Returns SEG DisplaySets that reference the target series, sorted by dateTime
  *
  * @param {string} StudyInstanceUID
  * @param {string} SeriesInstanceUID
  * @returns Array
  */
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
