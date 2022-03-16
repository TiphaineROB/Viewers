import React, { useState, useEffect, useRef } from 'react';
import { utils, log } from '@ohif/core';
import cornerstoneTools from 'cornerstone-tools';
import CornerstoneViewport from 'react-cornerstone-viewport';

import axios from 'axios';
import { api } from 'dicomweb-client';
import * as dicomParser from 'dicom-parser';
import JSZip from 'jszip';
import { UIModalService, UINotificationService } from '@ohif/core';

import SegmentationLabelForm from '../components/SegmentationForm/SegmentationLabelForm';
import PromiseModal from '../components/modal';

import createJsonDCM from './createJsonDCM.js';

import {
  sendToServer,
  removeFromServer,
  hexToRgb,
} from './mockMetadataTools';


import {
  createDerivedObject,
  setNumberOfFrames,
  addSegment,
} from './createDerivedObject'

/**
 *
 *
 * @param {*} file
 * @param {*} callback
 * @returns
 *
 */
export default async function loadFiles(
  file,
  callback
) {
  const notification = UINotificationService.create({});
  const uiModalService = UIModalService.create({});
  const dcmjs = require("dcmjs");

  var dcms = [];


  var enabledElement = cornerstoneTools.external.cornerstone.getEnabledElements()[0];

  const config = {
    url: window.config.servers.dicomWeb[0].qidoRoot,
    // headers: DICOMWeb.getAuthorizationHeader(window.config.servers.dicomWeb[0]),
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

  const {
    name,
    lastModifiedDate,
    type
  } = file;

  let validSeg = true;
  let message = "Unknown error";

  const readDCM = function (byteData) {
    var dcmData = dicomParser.parseDicom(byteData)
    var modality = dcmData.string('x00080060');
    var studyInstanceUID = dcmData.string('x0020000d');
    if ( modality !== 'SEG' )
    {
      validSeg = false;
      message = "Not a segment";
    }
    if ( studyInstanceUID !== enabledStudyInstanceUID) {
      notification.show({
        title: 'Load Segments',
        message: 'Loading segment but not available in this study',
        type: 'warning',
        duration: 4000,
      });
    }
    return dcmData;
  }

  const refModal = React.createRef();

  const transformNii2DCM = async (niiHeader, niiImage, niiExt) => {

    var enabledX = enabledElement.image.columns,
      enabledY = enabledElement.image.rows,
      enabledZ = enabledSeries.length,
      enabledSpacingX = enabledElement.image.columnPixelSpacing,
      enabledSpacingY = enabledElement.image.rowPixelSpacing,
      enabledSpacingZ = enabledSeries[0]['00180050'].Value[0];
    var niiX = niiHeader.dims[1],
      niiY = niiHeader.dims[2],
      niiZ = niiHeader.dims[3],
      niiSpacingX = niiHeader.pixDims[1],
      niiSpacingY = niiHeader.pixDims[2],
      niiSpacingZ = niiHeader.pixDims[3];

    if ( enabledX !== niiX || enabledY !== niiY || enabledZ !== niiZ ||
        enabledSpacingX !== niiSpacingX || enabledSpacingY !== niiSpacingY) {

        notification.show({
          title: 'Load Segments',
          message: 'Nifti dims and spacing does not match current series, not loading',
          type: 'error',
          duration: 4000,
        });
    }
    else {

        const submit = (name, description, color, header, image) => {
          uiModalService.hide()
          const values = {
            name: name,
            description: description,
            color: color
          }
          const dicomData = createDCM(enabledElement, enabledSeries, niiHeader, niiImage, values)
          callback(dicomData)
        };

        uiModalService.show({
                content: SegmentationLabelForm,
                title: 'Load Nifti as Segmentation',
                contentProps: {
                  name: 'Imported',
                  description: 'imported',
                  color:'#a45e7e',
                  onSubmit: submit,
                  nifitiImportation: true,
                  fileHeader: niiHeader,
                  fileImage: niiImage,
                },
                customClassName: 'segmentationLabelForm',
                shouldCloseOnEsc: true,
                onClose: () => {
                  console.log('this on close')
                }
        })
      }
  }

  const serverPythonTransform = async (dataset, segmentation) => {
    const server = new URL('http://localhost:8080/api/v1/');
    let url = new URL('radiomicsOHIF/', server);
    url = new URL('pydicomseg/', url);
    const strurl = url.toString()

    const params = {
      metadata: dataset.meta,
      SOPInstanceUID: dataset.dict['00080018'].Value[0],
      SeriesInstanceUID: dataset.dict['0020000E'].Value[0],
      StudyInstanceUID: dataset.dict['0020000D'].Value[0],
      orthanc: 'http://localhost/proxy/dicom-web'
    }

    return axios
      .post(strurl, null, {
        params: params, // Girder might not be able to get content type of the request
        headers: {
          accept: ['application/json', 'multipart/form-data'],
        },
      })
      .then(function(response) {
          return response;
      })
      .catch(function(error) {
        return error;
      })
      .finally(function() {});
  }

  const createDCM = (referencedInstance, referencedSeries, niiHeader, niiImage, modalValues) => {
    console.log("Create DCM with referencedseries and nii image and header")

    console.log(niiHeader)

    let segments = {};

    let arrayImage = new Uint16Array(niiImage);

    // First option
    const jsonDataset = createJsonDCM(referencedSeries, niiHeader, modalValues)
    const dataset = JSON.parse(jsonDataset);
    dataset.PixelData = arrayImage.buffer;

    // Second option - cleaner
    var derivated = createDerivedObject(referencedSeries);
    const numberOfFrames = niiHeader.dims[3];
    derivated = setNumberOfFrames(derivated, numberOfFrames);
    // console.log(derivated)

    const rgbcolor = hexToRgb(modalValues.color);
    const recommendedCIELabValues = dcmjs.data.Colors.rgb2DICOMLAB([
        rgbcolor.r,
        rgbcolor.g,
        rgbcolor.b
    ]);

    const segment =  {
             SegmentedPropertyCategoryCodeSequence: {
                  CodeValue: "123037004",
                  CodingSchemeDesignator: "SCT",
                  CodeMeaning: "Anatomical Structure"
             },
             SegmentNumber: 1,
             SegmentLabel: modalValues.name,
             SegmentDescription: modalValues.description,
             SegmentAlgorithmType: "MANUAL",
             SegmentAlgorithmName: "Unknown Source",
             RecommendedDisplayCIELabValue: [ recommendedCIELabValues[0],
                          recommendedCIELabValues[1], recommendedCIELabValues[2]],
             SegmentedPropertyTypeCodeSequence: {
                  CodeValue: "78961009",
                  CodingSchemeDesignator: "SCT",
                  CodeMeaning: modalValues.name
              }
         };
    const referencedFrameNumbers = [];
    for (var i = numberOfFrames; i > 0; i--){
      referencedFrameNumbers.push(i);
    }
    
    const packedarray = dcmjs.data.BitArray.pack(arrayImage)
    addSegment(segment, derivated, packedarray, referencedFrameNumbers)

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

    let bufferDerived = Buffer.from(dicomDerived.write());

    // var FileSaver = require('file-saver');
    // let filename = `test.dcm`
    // var blobDerived = new Blob([bufferDerived], { type: 'text/plain;charset=utf-8' });
    //
    // const derivedParsed = dicomParser.parseDicom(bufferDerived);
    //
    // FileSaver.saveAs(blobDerived, filename);

    // const t0 = performance.now();
    // let bufferImg = Buffer.from(arrayImage);
    // // const jsonarray = Object.assign({}, array);
    // const jsonbufferImg =JSON.stringify(bufferImg)
    // const t1 = performance.now();
    // console.log("Conversion array to json : ", t1-t0);

    //const dicomDict = dcmjs.data.datasetToDict(dataset)
    //let buffer = Buffer.from(dicomDict.write());
    // var blob = new Blob([buffer], { type: 'text/plain;charset=utf-8' });
    // const dicomparsed = dicomParser.parseDicom(buffer);

    // await sendToServer(dicomDict);
    // const response = await serverPythonTransform(dicomDict);
    // await removeFromServer(dicomDict);
    // console.log(response)
    return dicomDerived;

  }

  const readNII = async (file) => {
    var nifti = require('nifti-reader-js')
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const buffer = reader.result;

          var niftiHeader = null,
            niftiImage = null,
            niftiExt = null;
          if (nifti.isCompressed(buffer)) {
              data = nifti.decompress(buffer);
          }

          if (nifti.isNIFTI(buffer)) {
              niftiHeader = nifti.readHeader(buffer);
              niftiImage = nifti.readImage(niftiHeader, buffer);

              if (nifti.hasExtension(niftiHeader)) {
                  niftiExt = nifti.readExtensionData(niftiHeader, buffer);
              }
          }
          await transformNii2DCM(niftiHeader, niftiImage, niftiExt);
          resolve([]);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsArrayBuffer(file)
    });
  }

  var filereaderDCM = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const buffer = reader.result;
          const dicomData = dcmjs.data.DicomMessage.readFile(buffer)
          console.log('DMC DicomDict : ', dicomData)
          const modality = dicomData.dict['00080060'].Value[0];
          const studyInstanceUID = dicomData.dict['0020000D'].Value[0];

          if ( modality !== 'SEG' )
          {
            validSeg = false;
            message = "Not a segment";
          }
          if ( studyInstanceUID !== enabledStudyInstanceUID) {
            notification.show({
              title: 'Load Segments',
              message: 'Loading segment but not available in this study',
              type: 'warning',
              duration: 4000,
            });
          }

          if (!validSeg)
          {
            notification.show({
              title: 'Load Segments',
              message: message,
              type: 'error',
              duration: 2000,
            });
            resolve([]);
          }
          // else {
          //   notification.show({
          //     title: 'Load Segments',
          //     message: 'Segment is OK, but still a WIP',
          //     type: 'success',
          //     duration: 2000,
          //   });
          // }
          // Resolve the promise with the response value
          const tmpdcms = [dicomData];
          sendToServer(dicomData);
          callback(dicomData)
          resolve(tmpdcms);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsArrayBuffer(file)
    });
  }


  const switchfct = async (type) => {
    switch(type) {
      case 'application/dicom':
        await filereaderDCM(file)
        break;

      case '':
        if ( name.includes('.nii') ) {
          await readNII(file);
          // dcms = dcms.concat(results);
          break;
        }
      default:
        notification.show({
          title: 'Load Segments',
          message: 'Extension not supported',
          type: 'error',
          duration: 2000,
        });
        break;
    }

  }
  await switchfct(type);
}

// TO FINISH ! - correct dcm reading
// case 'application/zip':
//
//   JSZip.loadAsync(file)                                   // 1) read the Blob
//   .then(function(zip) {
//
//       var zipfiles = [];
//       // Transform zip files in a array
//       zip.forEach( function (relativePath, zipEntry) {
//         zipfiles = zipfiles.concat(zipEntry);
//       })
//
//       zipfiles.every( function (zipEntry) {
//         const byteArray = zipEntry._data.compressedContent;
//
//         if ( zipEntry.name.includes('.dcm') ) {
//           console.logo(readDCM(byteArray))
//           //dcmjs.data.DicomMessage.readFile(byteData)
//         }
//         else if ( zipEntry.name.includes('.nii') ) {
//           // console.log(file)
//           // readNII(file);
//           console.log('zipEntry nifti TODO')
//         }
//         else {
//           message = "Not a dcm or nii file";
//           validSeg = false;
//         }
//         return validSeg; // false if conditions are not match true is we can continue
//       });
//
//       if (!validSeg)
//       {
//         notification.show({
//           title: 'Load Segments',
//           message: message,
//           type: 'error',
//           duration: 2000,
//         });
//       }
//       else {
//         notification.show({
//           title: 'Load Segments',
//           message: 'Segment is OK, but still a WIP',
//           type: 'success',
//           duration: 2000,
//         });
//       }
//
//   }, function (e) {
//       console.log(e)
//   });
//   break;
// NOt working
// var test = new dcmjs.data.ReadBufferStream(niiImage, true);
// console.log('Buffer stream :', test.buffer)
//
// // not working
// test = new dcmjs.data.BitArray.unpack(niiImage)
// console.log('UNpack : ', test.buffer)
//
// // not working
// test = new dcmjs.data.BitArray.pack(niiImage)
// console.log('Pack :', test.buffer)
//
// test = new dcmjs.data.BitArray.getBytesForBinaryFrame(dataset.rows*dataset.columns)
// console.log('getBytes :', test)
//
// test = new dcmjs.data.WriteBufferStream(niiImage, true)
// console.log('write buffer  stream :', test)


// Eventuellement pour créer des labelsmaps2D
// dataset.SegmentSequence.forEach(segment => {
//   const cielab = segment.RecommendedDisplayCIELabValue;
//   const rgba = dcmjs.data.Colors.dicomlab2RGB(cielab).map(x => Math.round(x * 255));
//   rgba.push(255);
//
//   console.log(segment)
//   segments[segment.SegmentNumber] = {
//       color: rgba,
//       functionalGroups: [],
//       offset: null,
//       size: null,
//       pixelData: null,
//     }
//
//   dataset.PerFrameFunctionalGroupsSequence.forEach(functionalGroup => {
//     let segmentNumber = functionalGroup.SegmentIdentificationSequence[0].ReferencedSegmentNumber;
//     segments[segmentNumber].functionalGroups.push(functionalGroup);
//   })
//
//   let frameSize = Math.ceil(dataset.Rows * dataset.Columns / 1);
//   let nextOffset = 0;
//
//   Object.keys(segments).forEach(segmentKey => {
//     const segment = segments[segmentKey];
//     segment.numberOfFrames = segment.functionalGroups.length;
//
//     segment.size = segment.numberOfFrames * frameSize;
//     segment.offset = nextOffset;
//     nextOffset  = segment.offset + segment.size
//     const packedSegment = dataset.PixelData.slice(segment.offset, nextOffset);
//     segment.pixelData = dcmjs.data.BitArray.unpack(packedSegment);
//
//   });
// });
// //dataset.PixelData = segments[1].pixelData.buffer
// console.log(segments)
// console.log(dataset)
