import React from 'react';
import { Component } from 'react';
import PropTypes from 'prop-types';
import './ModelSelector.styl';
import ModelSelector from './ModelSelector';
import { UIModalService, UINotificationService, DICOMWeb } from '@ohif/core';
import { api } from 'dicomweb-client';

import GirderAIModulesClient from '../../services/GirderAIModulesClient';
import SegmentationLabelForm from '../SegmentationForm/SegmentationLabelForm';

import {
  sendToServer,
  removeFromServer,
  hexToRgb,
  createJsonDCM,
} from '../../utils/mockMetadataTools';

import {
  createDerivedObject,
  setNumberOfFrames,
  addSegment,
} from '../../utils/createDerivedObject'

const dcmjs = require("dcmjs");

/**
 *
 *
 * @param {*} activeIndex
 * @param {*} viewports
 * @param {*} currentDisplaySet
 * @param {*} callback
 * @returns
 *
 */
// export default async function AutoSegmentation(
//   activeIndex,
//   viewports,
//   currentDisplaySet,
//   callback,
// ) {
//
//   const modelSelector = React.createRef();
//   const notification = UINotificationService.create({});
//   const uiModalService = UIModalService.create({});
//
//   const viewport = viewports[activeIndex];
//
//   let models = [];
//   let currentModel = null;
//
//   const client = () => {
//         return new GirderAIModulesClient(window.config.authenticationServer);
//    };
//
//
//
//   const onInfo = async () => {
//       const response = await client().info();
//       if (response.status !== 200 || response.data.status !== 200) {
//        notification.show({
//           title: 'Girder AIModules',
//           message: 'Failed to Connect to Girder',
//           type: 'error',
//           duration: 5000,
//         });
//       } else {
//         models = [];
//         for ( var index in response.data.models) {
//             if (response.data.models[index].type === "segmentation") {
//               models.push(response.data.models[index])
//             }
//         }
//         if (models.length!=0) {
//           console.log(models)
//           const namemodel = models[0].name+' -- '+models[0].author+' -- '+models[0].uid;
//           //this.setState({ models: models, currentModel: namemodel});
//           currentModel = namemodel;
//         }
//        else {
//           const nid = notification.show({
//             title: 'AutoSegmentation',
//             message: 'No segmentation model available',
//             type: 'info',
//             duration: 60000,
//           });
//         }
//       }
//     };
//
//     console.log("GirderAIModules Auto Segmentation ok")
//     onInfo();
//
//     const onSelectModel = model => {
//         let currentname = model.name+' -- '+model.author
//         currentModel = currentname;
//     };
//
//     const onSegmentation = async () => {
//         const nid = notification.show({
//           title: 'Segmentation',
//           message: 'Running Auto-Segmentation...',
//           type: 'info',
//           duration: 60000,
//         });
//
//
//         const {
//           StudyInstanceUID,
//           sopClassUIDs,
//           SeriesInstanceUID
//         } = viewport;
//
//         // const model = this.modelSelector.current.currentModel();
//
//         let model;
//         for (var index in models) {
//           const currentModelName = currentModel.split(' -- ')[0]
//           const currentModelAuthor = currentModel.split(' -- ')[1]
//           const currentModelUID = currentModel.split(' -- ')[2]
//
//           if (models[index].name===currentModelName &&
//                 models[index].author===currentModelAuthor &&
//                 models[index].uid===currentModelUID
//               )
//           {
//             model = models[index];
//             break;
//           }
//         }
//
//         const {
//           name,
//           author,
//           type,
//           tool,
//           sourceType,
//           file,
//         } = model;
//
//         const params = {
//           dataSource: 'http://localhost/proxy/dicom-web',
//           studyInstanceUID: StudyInstanceUID,
//           sopClassUIDs: sopClassUIDs,
//           seriesInstanceUID: SeriesInstanceUID,
//           model: model,
//           url: window.config.authenticationServer,
//           token: window.config.user.key,
//         };
//
//         const response = await client().segmentation(params);
//
//
//         if (response.status !== 200 || response.data.status !== 200) {
//           notification.show({
//             title: 'Segmentation',
//             message: 'Failed to Run Auto Segmentation',
//             type: 'error',
//             duration: 5000,
//           });
//         } else {
//
//           const {
//             header,
//             data,
//             uploadfilename,
//             uploaditem,
//           } = response.data
//
//           var datanum = [];
//
//           data.forEach(function(item){
//             datanum.push(1*item);
//           });
//
//           const submit = async (name, description, color, header, image) => {
//             uiModalService.hide()
//             const values = {
//               name: name,
//               description: description,
//               color: color
//             }
//
//             let segments = {};
//             let arrayImage = new Uint16Array(image);
//
//             // console.log(header)
//             // console.log(arrayImage)
//
//             var enabledElement = cornerstoneTools.external.cornerstone.getEnabledElements()[0];
//
//             const config = {
//               url: window.config.servers.dicomWeb[0].qidoRoot,
//               headers: DICOMWeb.getAuthorizationHeader(),
//             };
//             var enabledImageId = enabledElement.image.imageId;
//
//             enabledImageId = enabledImageId.substring(
//               enabledImageId.indexOf(config.url) + config.url.length
//             );
//             var splitImageId = enabledImageId.split('/');
//             const enabledStudyInstanceUID = splitImageId[2];
//             const enabledSeriesInstanceUID = splitImageId[4];
//
//             const dicomWeb = new api.DICOMwebClient(config);
//             var enabledSeries = await dicomWeb.retrieveSeriesMetadata({
//                 studyInstanceUID: enabledStudyInstanceUID,
//                 seriesInstanceUID: enabledSeriesInstanceUID,
//             })
//
//             // const dicomData = createDCM(enabledElement, enabledSeries, niiHeader, niiImage, values)
//
//
//             var derivated = createDerivedObject(enabledSeries);
//             const numberOfFrames =header['dim[3]'];
//             derivated = setNumberOfFrames(derivated, numberOfFrames);
//
//             let rgbcolor = hexToRgb(color);
//             rgbcolor = [ rgbcolor.r/255, rgbcolor.g/255, rgbcolor.b/255];
//             const recommendedCIELabValues = dcmjs.data.Colors.rgb2DICOMLAB(rgbcolor);
//
//              const segment =  {
//                       SegmentedPropertyCategoryCodeSequence: {
//                            CodeValue: "123037004",
//                            CodingSchemeDesignator: "SCT",
//                            CodeMeaning: "Anatomical Structure"
//                       },
//                       SegmentNumber: 1,
//                       SegmentLabel: name,
//                       SegmentDescription: description,
//                       SegmentAlgorithmType: "AUTOMATIC",
//                       SegmentAlgorithmName: this.state.currentModel,
//                       RecommendedDisplayCIELabValue: [ recommendedCIELabValues[0],
//                                    recommendedCIELabValues[1], recommendedCIELabValues[2]],
//                       SegmentedPropertyTypeCodeSequence: {
//                            CodeValue: "78961009",
//                            CodingSchemeDesignator: "SCT",
//                            CodeMeaning: name
//                        }
//             };
//
//
//             const referencedFrameNumbers = [];
//             for (var i = 0; i < numberOfFrames; i++){
//                const instanceNumber = currentDisplaySet.images[i]._data.metadata.InstanceNumber;
//                referencedFrameNumbers.push(instanceNumber);
//             }
//
//             // console.log(referencedFrameNumbers)
//
//             const packedarray = dcmjs.data.BitArray.pack(image)
//             addSegment(segment, derivated, packedarray, referencedFrameNumbers)
//             derivated.dataset.SeriesDescription = "SEG "+ description +' - 1 '
//             derivated.dataset.InstanceNumber=1;
//             derivated.dataset._meta = {
//                  MediaStorageSOPClassUID: {
//                  Value: [ derivated.dataset.SOPClassUID],
//                  vr: "UI",
//                },
//                MediaStorageSOPInstanceUID: {
//                  Value: [derivated.dataset.SOPInstanceUID],
//                  vr: "UI",
//                },
//                TransferSyntaxUID: {
//                  Value: ["1.2.840.10008.1.2.1"],
//                  vr: "UI"
//                }
//             }
//             derivated.dataset._vrMap = {
//                PixelData: "OB"
//             }
//             const dicomDerived = dcmjs.data.datasetToDict(derivated.dataset)
//
//             //let bufferDerived = Buffer.from(dicomDerived.write());
//             // var FileSaver = require('file-saver');
//             // let filename = `test.dcm`
//             // var blobDerived = new Blob([bufferDerived], { type: 'text/plain;charset=utf-8' });
//             // FileSaver.saveAs(blobDerived, filename);
//             console.log(derivated)
//             const params2 = {
//               action: "Segmentation",
//               token: window.config.user.key,
//               itemgirder: uploaditem,
//               filegirder: uploadfilename,
//               dicomfile: JSON.stringify(derivated.dataset),
//             };
//
//             const newresponse = client().callback(params2)
//             callback(dicomDerived, true, viewports[activeIndex])
//           };
//
//           uiModalService.show({
//                   content: SegmentationLabelForm,
//                   title: 'Save Autosegmentation',
//                   contentProps: {
//                     name: currentModel,
//                     description: 'Auto Segmentation',
//                     color:'#76a5af',
//                     onSubmit: submit,
//                     nifitiImportation: true,
//                     fileHeader: header,
//                     fileImage: datanum,
//                   },
//                   customClassName: 'segmentationLabelForm',
//                   shouldCloseOnEsc: true,
//                   onClose: () => {
//                     console.log('this on close')
//                   }
//           })
//
//           notification.show({
//             title: 'Segmentation',
//             message: 'Run Auto Segmentation - Successful',
//             type: 'success',
//             duration: 2000,
//           });
//         }
//       }
//
//       let model;
//       for (var index in models) {
//        const currentModelName = currentModel.split(' -- ')[0]
//        const currentModelAuthor = currentModel.split(' -- ')[1]
//        const currentModelUID = currentModel.split(' -- ')[2]
//
//        if (models[index].name===currentModelName &&
//              models[index].author===currentModelAuthor &&
//              models[index].uid===currentModelUID
//            )
//        {
//          model = models[index];
//          break;
//        }
//      }
//
//       let levelconf = undefined;
//       let timeexec = undefined;
//       if (model) {
//        levelconf = model.levelConfidence;
//        timeexec = model.temporalCost;
//       }
//
//       return (
//          <div className="tab">
//            <div className="tab-content">
//              <ModelSelector
//                ref={modelSelector}
//                name="segmentation"
//                title="Segmentation"
//                models={models}
//                currentModel={currentModel}
//                onClick={onSegmentation}
//                onSelectModel={onSelectModel}
//                usage={
//                  <p style={{ fontSize: 'smaller' }}>
//                    Select a model and click to run.
//                  </p>
//                }
//              />
//              <p style={{ fontSize: 'smaller' }}> <strong>Confidence level:</strong> {levelconf} </p>
//              <p style={{ fontSize: 'smaller' }}> <strong>Execution time:</strong> {timeexec} </p>
//            </div>
//          </div>
//     );
// }
//
export default class AutoSegmentation extends Component {
  constructor(props) {
    super(props);

    const {
      viewports,
      currentDisplaySet,
      callback,
      activeIndex
    } = this.props;

    this.modelSelector = React.createRef();
    this.notification = UINotificationService.create({});
    this.state = {
      currentModel: null,
      models: [],
      viewports: viewports,
      currentDisplaySet: currentDisplaySet,
    };
    this.uiModalService = UIModalService.create({});
    this.callback = callback
    this.viewport = viewports[activeIndex];
    this.currentDisplaySet= currentDisplaySet;
  }

  async componentDidMount() {
    await this.onInfo();
    console.log("GirderAIModules did mount correctly!")
  }

  client = () => {
    return new GirderAIModulesClient(
      this.state.url ? this.state.url : window.config.authenticationServer
    );
  };

  onInfo = async () => {
    const response = await this.client().info();
    if (response.status !== 200 || response.data.status !== 200) {
      this.notification.show({
        title: 'Girder AIModules',
        message: 'Failed to Connect to Girder',
        type: 'error',
        duration: 5000,
      });
    } else {
      // this.notification.show({
      //   title: 'Girder AIModules',
      //   message: 'Connected to Girder - Successful',
      //   type: 'success',
      //   duration: 2000,
      // });
      let models = [];
      for ( var index in response.data.models) {
          if (response.data.models[index].type === "segmentation") {
            models.push(response.data.models[index])
          }
      }
      if (models.length!=0) {
        console.log(models)
        const namemodel = models[0].name+' -- '+models[0].author+' -- '+models[0].uid;
        this.setState({ models: models, currentModel: namemodel});
      }
      else {
        const nid = this.notification.show({
          title: 'AutoSegmentation',
          message: 'No segmentation model available',
          type: 'info',
          duration: 60000,
        });
      }
    }
  };

  onSelectModel = model => {
    let currentname = model.name+' -- '+model.author
    this.setState({ currentModel: currentname});
  };


  onSegmentation = async () => {
    const nid = this.notification.show({
      title: 'Segmentation',
      message: 'Running Auto-Segmentation...',
      type: 'info',
      duration: 60000,
    });


    const {
      viewports,
      currentDisplaySet,
      callback,
      activeIndex
    } = this.props;

    this.viewport = viewports[activeIndex];
    this.currentDisplaySet = currentDisplaySet;

    const {
      StudyInstanceUID,
      sopClassUIDs,
      SeriesInstanceUID
    } = this.viewport;

    // const model = this.modelSelector.current.currentModel();

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

    const {
      name,
      author,
      type,
      tool,
      sourceType,
      file,
    } = model;
    const params = {
      dataSource: window.config.dicomWebServer, //'http://localhost/proxy/dicom-web',
      studyInstanceUID: StudyInstanceUID,
      sopClassUIDs: sopClassUIDs,
      seriesInstanceUID: SeriesInstanceUID,
      model: model,
      url: window.config.authenticationServer,
      token: window.config.user.key,
    };

    const response = await this.client().segmentation(params);
    console.log(response)

    if (response.status !== 200 || response.data.status !== 200) {
      this.notification.show({
        title: 'Segmentation',
        message: 'Failed to Run Auto Segmentation',
        type: 'error',
        duration: 5000,
      });
    } else {

      const {
        header,
        data,
        uploadfilename,
        uploaditem,
      } = response.data

      var datanum = [];

      data.forEach(function(item){
        datanum.push(1*item);
      });

      const submit = async (name, description, color, header, image) => {
        this.uiModalService.hide()
        const values = {
          name: name,
          description: description,
          color: color
        }

        let segments = {};
        let arrayImage = new Uint16Array(image);

        // console.log(header)
        // console.log(arrayImage)

        var enabledElement = cornerstoneTools.external.cornerstone.getEnabledElements()[0];

        const config = {
          url: window.config.servers.dicomWeb[0].qidoRoot,
          headers: DICOMWeb.getAuthorizationHeader(),
        };
        var enabledImageId = enabledElement.image.imageId;

        enabledImageId = enabledImageId.substring(
          enabledImageId.indexOf(config.url) + config.url.length
        );
        var splitImageId = enabledImageId.split('/');
        const enabledStudyInstanceUID = splitImageId[2];
        const enabledSeriesInstanceUID = splitImageId[4];

        const dicomWeb = new api.DICOMwebClient(config);
        var enabledSeries = await dicomWeb.retrieveSeriesMetadata({
            studyInstanceUID: enabledStudyInstanceUID,
            seriesInstanceUID: enabledSeriesInstanceUID,
        })

        // const dicomData = createDCM(enabledElement, enabledSeries, niiHeader, niiImage, values)


        var derivated = createDerivedObject(enabledSeries);
        const numberOfFrames =header['dim[3]'];
        derivated = setNumberOfFrames(derivated, numberOfFrames);

        let rgbcolor = hexToRgb(color);
        rgbcolor = [ rgbcolor.r/255, rgbcolor.g/255, rgbcolor.b/255];
        const recommendedCIELabValues = dcmjs.data.Colors.rgb2DICOMLAB(rgbcolor);

         const segment =  {
                  SegmentedPropertyCategoryCodeSequence: {
                       CodeValue: "123037004",
                       CodingSchemeDesignator: "SCT",
                       CodeMeaning: "Anatomical Structure"
                  },
                  SegmentNumber: 1,
                  SegmentLabel: name,
                  SegmentDescription: description,
                  SegmentAlgorithmType: "AUTOMATIC",
                  SegmentAlgorithmName: this.state.currentModel,
                  RecommendedDisplayCIELabValue: [ recommendedCIELabValues[0],
                               recommendedCIELabValues[1], recommendedCIELabValues[2]],
                  SegmentedPropertyTypeCodeSequence: {
                       CodeValue: "78961009",
                       CodingSchemeDesignator: "SCT",
                       CodeMeaning: name
                   }
        };

        console.log(viewports, activeIndex)

        // console.log("CurrentDisplaySet", this.currentDisplaySet)
        // console.log("Enabled Series ?", enabledSeries)
        // console.log("This viewport ?", this.viewport)

        const referencedFrameNumbers = [];
        for (var i = 0; i < numberOfFrames; i++){
           const instanceNumber = this.currentDisplaySet.images[i]._data.metadata.InstanceNumber;
           referencedFrameNumbers.push(instanceNumber);
        }

        // console.log(referencedFrameNumbers)

        const packedarray = dcmjs.data.BitArray.pack(image)
        addSegment(segment, derivated, packedarray, referencedFrameNumbers)
        derivated.dataset.SeriesDescription = "SEG "+ description +' - 1 '
        derivated.dataset.InstanceNumber=1;
        derivated.dataset._meta = {
             MediaStorageSOPClassUID: {
             Value: [ derivated.dataset.SOPClassUID],
             vr: "UI",
           },
           MediaStorageSOPInstanceUID: {
             Value: [derivated.dataset.SOPInstanceUID],
             vr: "UI",
           },
           TransferSyntaxUID: {
             Value: ["1.2.840.10008.1.2.1"],
             vr: "UI"
           }
        }
        derivated.dataset._vrMap = {
           PixelData: "OB"
        }
        const dicomDerived = dcmjs.data.datasetToDict(derivated.dataset)

        //let bufferDerived = Buffer.from(dicomDerived.write());
        // var FileSaver = require('file-saver');
        // let filename = `test.dcm`
        // var blobDerived = new Blob([bufferDerived], { type: 'text/plain;charset=utf-8' });
        // FileSaver.saveAs(blobDerived, filename);
        console.log(derivated)
        const params2 = {
          action: "Segmentation",
          token: window.config.user.key,
          itemgirder: uploaditem,
          filegirder: uploadfilename,
          dicomfile: JSON.stringify(derivated.dataset),
        };

        const newresponse = this.client().callback(params2)
        console.log(viewports[activeIndex], this.viewport)
        this.callback(dicomDerived, true, viewports[activeIndex])
      };

      this.uiModalService.show({
              content: SegmentationLabelForm,
              title: 'Save Autosegmentation',
              contentProps: {
                name: this.state.currentModel,
                description: 'Auto Segmentation',
                color:'#76a5af',
                onSubmit: submit,
                nifitiImportation: true,
                fileHeader: header,
                fileImage: datanum,
              },
              customClassName: 'segmentationLabelForm',
              shouldCloseOnEsc: true,
              onClose: () => {
                console.log('this on close')
              }
      })

      this.notification.show({
        title: 'Segmentation',
        message: 'Run Auto Segmentation - Successful',
        type: 'success',
        duration: 2000,
      });
    }
  }



  render() {
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

    let levelconf = undefined;
    let timeexec = undefined;
    if (model) {
      levelconf = model.levelConfidence;
      timeexec = model.temporalCost;
    }

    return (
      <div className="tab">
        <div className="tab-content">
          <ModelSelector
            ref={this.modelSelector}
            name="segmentation"
            title="Segmentation"
            models={models}
            currentModel={this.state.currentModel}
            onClick={this.onSegmentation}
            onSelectModel={this.onSelectModel}
            usage={
              <p style={{ fontSize: 'smaller' }}>
                Select a model and click to run.
              </p>
            }
          />
          <p style={{ fontSize: 'smaller' }}> <strong>Confidence level:</strong> {levelconf} </p>
          <p style={{ fontSize: 'smaller' }}> <strong>Execution time:</strong> {timeexec} </p>
        </div>
      </div>
    );
  }
}


AutoSegmentation.propTypes = {
  /*
   * An object, with int index keys?
   * Maps to: state.viewports.viewportSpecificData, in `viewer`
   * Passed in MODULE_TYPES.PANEL when specifying component in viewer
   */
  viewports: PropTypes.shape({
    displaySetInstanceUID: PropTypes.string,
    frameRate: PropTypes.any,
    InstanceNumber: PropTypes.number,
    isMultiFrame: PropTypes.bool,
    isReconstructable: PropTypes.bool,
    Modality: PropTypes.string,
    plugin: PropTypes.string,
    SeriesDate: PropTypes.string,
    SeriesDescription: PropTypes.string,
    SeriesInstanceUID: PropTypes.string,
    SeriesNumber: PropTypes.any,
    SeriesTime: PropTypes.string,
    sopClassUIDs: PropTypes.arrayOf(PropTypes.string),
    StudyInstanceUID: PropTypes.string,
  }),
  currentDisplaySet: PropTypes.object,
  callback: PropTypes.func,
  activeIndex: PropTypes.number,
};
