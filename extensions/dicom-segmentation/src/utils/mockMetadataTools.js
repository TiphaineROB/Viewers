import React, { useState, useEffect, useRef } from 'react';
import { utils, log, DICOMWeb, errorHandler} from '@ohif/core';
import cornerstoneTools from 'cornerstone-tools';
import CornerstoneViewport from 'react-cornerstone-viewport';
import { UINotificationService } from '@ohif/core';
import { api } from 'dicomweb-client';

const { studyMetadataManager, xhrRetryRequestHook, DicomLoaderService } = utils;
const { getXHRRetryRequestHook } = xhrRetryRequestHook;
import getSourceDisplaySet from '../getSourceDisplaySet';

import {
  _parseSeg,
  _getImageIdsForDisplaySet,
} from '../getOHIFDicomSegSopClassHandler';

import loadSegmentation from '../loadSegmentation';

import dcmjs from 'dcmjs';
const { DicomMessage, DicomMetaDictionary } = dcmjs.data;


/**
 *
 *
 * @param {*} dicomDict
 *
 */

export async function sendToServer(dicomDict) {
  // var file = new File([blob], "current.dcm", {type: "application/dicom+json"});
  const notification = UINotificationService.create({});
  const config = {
    url: window.config.servers.dicomWeb[0].qidoRoot,
    headers: DICOMWeb.getAuthorizationHeader(),
    errorInterceptor: errorHandler.getHTTPErrorHandler(),
    requestHooks: [xhrRetryRequestHook()],
  };

  const part10Buffer = dicomDict.write();

  const dicomWeb = new api.DICOMwebClient(config);
  const options = {
    datasets: [part10Buffer],
  };

  await dicomWeb.storeInstances(options);
  // notification.show({
  //   title: 'Uploading Segments',
  //   message: 'One may have to refresh page',
  //   type: 'success',
  //   duration: 2000,
  // });

  var FileSaver = require('file-saver');
  let filename = `test-toserver.dcm`
  var blob = new Blob([part10Buffer], { type: 'text/plain;charset=utf-8' });
  FileSaver.saveAs(blob, filename);
}

/**
 *
 *
 * @param {*} dicomDict
 *
 */

export async function removeFromServer(dicomDict) {
  // var file = new File([blob], "current.dcm", {type: "application/dicom+json"});
  const notification = UINotificationService.create({});
  const config = {
    url: window.config.servers.dicomWeb[0].qidoRoot,
    headers: DICOMWeb.getAuthorizationHeader(),
    errorInterceptor: errorHandler.getHTTPErrorHandler(),
    requestHooks: [xhrRetryRequestHook()],
  };

  const part10Buffer = dicomDict.write();

  const dicomWeb = new api.DICOMwebClient(config);
  // console.log(dicomWeb)

  // const options = {
  //   datasets: [part10Buffer],
  // };
  //
  // await dicomWeb.storeInstances(options);
  // notification.show({
  //   title: 'Uploading Segments',
  //   message: 'One may have to refresh page',
  //   type: 'success',
  //   duration: 2000,
  // });
}


/**
 *
 * @returns
 *
 */
export function getDate() {
  var date = ''+new Date().getDate();
  if (date.length === 1){
    date='0'+date;
  }
  var month = ''+(new Date().getMonth() + 1); //To get the Current Month
  if (month.length === 1){
    month='0'+month;
  }
  var year = ''+new Date().getFullYear(); //To get the Current Year

  const fulldate = year+month+date
  return fulldate;
}

export function getTime() {
  var secs = ''+new Date().getSeconds();
  if (secs.length === 1){
    secs='0'+secs;
  }
  var mins = ''+(new Date().getMinutes() + 1); //To get the Current Month
  if (mins.length === 1){
    mins='0'+mins;
  }
  var hour = ''+new Date().getHours(); //To get the Current Year
  if (hour.length === 1){
    hour='0'+hour;
  }
  const fulltime = hour+mins+secs
  return fulltime;
}

/**
 *
 *
 * @param {*} dataset
 * @param {*} dicomBuffer
 * @returns
 *
 */
export function createSegDisplaySet(dataset, dicomBuffer) {
  const {
    SeriesDate,
    SeriesTime,
    SeriesDescription,
    FrameOfReferenceUID,
    SOPInstanceUID,
    SeriesInstanceUID,
    StudyInstanceUID,
    SeriesNumber,
    PixelData,
  } = dataset;

  const segDisplaySet = {
    Modality: 'SEG',
    displaySetInstanceUID: utils.guid(),
    SOPInstanceUID,
    SeriesInstanceUID,
    StudyInstanceUID,
    FrameOfReferenceUID,
    // authorizationHeaders,
    isDerived: true,
    referencedDisplaySetUID: null, // Assigned when loaded.
    labelmapIndex: null, // Assigned when loaded.
    isLoaded: false,
    loadError: false,
    hasOverlapping: false,
    dicomBuffer: dicomBuffer,
    SeriesDate,
    SeriesTime,
    SeriesNumber,
    SeriesDescription,
    dataset,
  };

  segDisplaySet.getSourceDisplaySet = function(studies, activateLabelMap = true, onDisplaySetLoadFailureHandler) {
    return getSourceDisplaySet(studies, segDisplaySet, activateLabelMap, onDisplaySetLoadFailureHandler);
  };

  segDisplaySet.load = async function(referencedDisplaySet, studies) {
    segDisplaySet.isLoaded = true;
    const { StudyInstanceUID } = referencedDisplaySet;
    const segArrayBuffer = segDisplaySet.dicomBuffer;

    const dicomData = DicomMessage.readFile(segArrayBuffer);
    const dataset = DicomMetaDictionary.naturalizeDataset(dicomData.dict);
    dataset._meta = DicomMetaDictionary.namifyDataset(dicomData.meta);
    // console.log(_getImageIdsForDisplaySet)

    const imageIds = _getImageIdsForDisplaySet(
      studies,
      StudyInstanceUID,
      referencedDisplaySet.SeriesInstanceUID
    );

    const results = await _parseSeg(segArrayBuffer, imageIds);
    if (results === undefined) {
      return;
    }
    const {
      labelmapBufferArray,
      segMetadata,
      segmentsOnFrame,
      segmentsOnFrameArray,
    } = results;
    let labelmapIndex;
    if (labelmapBufferArray.length > 1) {
      let labelmapIndexes = [];
      for (let i = 0; i < labelmapBufferArray.length; ++i) {
        labelmapIndexes.push(
          await loadSegmentation(
            imageIds,
            segDisplaySet,
            labelmapBufferArray[i],
            segMetadata,
            segmentsOnFrame,
            segmentsOnFrameArray[i]
          )
        );
      }
      /**
       * Since overlapping segments have virtual labelmaps,
       * originLabelMapIndex is used in the panel to select the correct dropdown value.
       */
      segDisplaySet.hasOverlapping = true;
      segDisplaySet.originLabelMapIndex = labelmapIndexes[0];
      labelmapIndex = labelmapIndexes[0];
      console.warn('Overlapping segments!');
    } else {
      labelmapIndex = await loadSegmentation(
        imageIds,
        segDisplaySet,
        labelmapBufferArray[0],
        segMetadata,
        segmentsOnFrame,
        []
      );
    }
  };
  return segDisplaySet;
}

/**
 *
 *
 * @param {*} n
 * @returns
 *
 */
export function generateUID(n) {
        var add = 1, max = 12 - add;   // 12 is the min safe number Math.random() can generate without it starting to pad the end with zeros.

        if ( n > max ) {
                return generateUID(max) + generateUID(n - max);
        }

        max        = Math.pow(10, n+add);
        var min    = max/10; // Math.pow(10, n) basically
        var number = Math.floor( Math.random() * (max - min + 1) ) + min;

        return ("" + number).substring(add);
}

/**
 *
 *
 * @param {*} hex
 * @returns
 *
 */
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 *
 *
 * @param {*} name
 * @param {*} description
 * @param {*} color
 * @returns
 *
 */
export function getMockSegmentSequence(name, description, color){
  const dcmjs = require("dcmjs");
  const rgbcolor = hexToRgb(color);
  const RecommendedDisplayCIELabValue = dcmjs.data.Colors.rgb2DICOMLAB([
      rgbcolor.r,
      rgbcolor.g,
      rgbcolor.b
  ]);
  return `   {
           "SegmentedPropertyCategoryCodeSequence": {
                "CodeValue": "123037004",
                "CodingSchemeDesignator": "SCT",
                "CodeMeaning": "Anatomical Structure"
           },
           "SegmentNumber": 1,
           "SegmentLabel": "${name}",
           "SegmentAlgorithmType": "${description}",
           "SegmentAlgorithmName": "Unknown Source",
           "RecommendedDisplayCIELabValue": [ "${RecommendedDisplayCIELabValue[0]}", "${RecommendedDisplayCIELabValue[1]}", "${RecommendedDisplayCIELabValue[2]}"],
           "SegmentedPropertyTypeCodeSequence": {
                "CodeValue": "78961009",
                "CodingSchemeDesignator": "SCT",
                "CodeMeaning": "${name}"
            }
       }`;
}

/**
 *
 *
 * @param {*} enabledSeries
 * @returns
 *
 */
export function getMockReferencedSeriesSequence(enabledSeries){
  // for each frame need ReferencedSOPClassUID and ReferencedSOPInstanceUID
  var arrayReferencedInstanceSequence = [];
  for ( var i=enabledSeries.length-1 ; i >= 0; i--){
    arrayReferencedInstanceSequence.push(`  {
                "ReferencedSOPClassUID": "${enabledSeries[i]["00080016"].Value[0]}",
                "ReferencedSOPInstanceUID": "${enabledSeries[i]["00080018"].Value[0]}"
              }`)
  }
  return `  {
           "ReferencedInstanceSequence": [ ${arrayReferencedInstanceSequence} ],
           "SeriesInstanceUID": "${enabledSeries[0]["0020000E"].Value[0]}"
       }`;
}

/**
 *
 *
 * @param {*} dimUID
 * @returns
 *
 */
export function getMockDimensionsField(dimUID) { // TODO
  return ` "DimensionOrganizationSequence": [ {
              "DimensionOrganizationUID": "${dimUID}"
            } ],
           "DimensionIndexSequence": [
            {
                "DimensionOrganizationUID": "${dimUID}",
                "DimensionIndexPointer": "0062,000b",
                "FunctionalGroupPointer": "0062,000a",
                "DimensionDescriptionLabel": "ReferencedSegmentNumber"
            }, {
                "DimensionOrganizationUID": "${dimUID}",
                "DimensionIndexPointer": "0020,0032",
                "FunctionalGroupPointer": "0020,9113",
                "DimensionDescriptionLabel": "ImagePositionPatient"
            }
           ]
       `;

}

/**
 *
 *
 * @param {*} enabledSeries
 * @param {*} dimUID
 * @returns
 *
 */
export function getMockProcedureCodeSequence(enabledSeries, dimUID) { //TODO
  return '';

}


/**
 *
 *
 * @param {*} enabledSeries
 * @param {*} niiHeader
 * @returns
 *
 */
export function getMockSharedFunctionalGroupsSequence(enabledSeries, niiHeader) {
  const v1 = enabledSeries[0]["00200037"].Value[0];
  const v2 = enabledSeries[0]["00200037"].Value[1];
  const v3 = enabledSeries[0]["00200037"].Value[2];
  const v4 = enabledSeries[0]["00200037"].Value[3];
  const v5 = enabledSeries[0]["00200037"].Value[4];
  const v6 = enabledSeries[0]["00200037"].Value[5];
  //
  return ` {
          "PlaneOrientationSequence": [ { "ImageOrientationPatient": [ "${v1}", "${v2}","${v3}","${v4}","${v5}","${v6}" ] } ],
          "PixelMeasuresSequence": [
              {
                  "PixelSpacing": [ "${enabledSeries[0]["00280030"].Value[0]}", ${enabledSeries[0]["00280030"].Value[1]} ],
                  "SpacingBetweenSlices": ${niiHeader.pixDims[3]},
                  "SliceThickness": ${niiHeader.pixDims[3]}
              }
          ]
       }`;
}


/**
 *
 *
 * @param {*} enabledSeries
 * @returns
 *
 */
export function getMockPerFrameFunctionalGroupsSequence(enabledSeries) {
  var arrayPerFrameGroupsSequence = [];

  for ( var i=enabledSeries.length-1 ; i >=0; i--){
    const imgposp1 = enabledSeries[i]["00200032"].Value[0];
    const imgposp2 = enabledSeries[i]["00200032"].Value[1];
    const imgposp3 = enabledSeries[i]["00200032"].Value[2];
    var dimIndex = enabledSeries.length - i;
    arrayPerFrameGroupsSequence.push(`  {
                "DerivationImageSequence": [
                  {
                    "SourceImageSequence": [
                      {
                        "ReferencedSOPClassUID": "${enabledSeries[i]["00080016"].Value[0]}",
                        "ReferencedSOPInstanceUID": "${enabledSeries[i]["00080018"].Value[0]}",
                        "PurposeOfReferenceCodeSequence": [
                          {
                            "CodeValue": "121322",
                            "CodingSchemeDesignator": "DCM",
                            "CodeMeaning": "Source image for image processing operation"
                          }
                        ]
                      }
                    ],
                    "DerivationCodeSequence": [
                      {
                        "CodeValue": "113076",
                        "CodingSchemeDesignator": "DCM",
                        "CodeMeaning": "Segmentation"
                      }
                    ]
                  }
                ],
                "FrameContentSequence": [
                  {
                    "DimensionIndexValues": [ "${dimIndex}", "1" ]
                  }
                ],
                "PlanePositionSequence": [
                  {
                    "ImagePositionPatient": [ "${imgposp1}", "${imgposp2}", "${imgposp3}"]
                  }
                ],
                "SegmentIdentificationSequence": [
                  {
                    "ReferencedSegmentNumber": 1
                  }
                ]
              }`)
  }
  return arrayPerFrameGroupsSequence;
}


/**
 *
 *
 * @param {*} referencedSeries
 * @param {*} niiHeader
 * @param {*} modalValues
 * @returns
 *
 */
export function createJsonDCM(
  referencedSeries,
  niiHeader,
  modalValues
) {

  const name = modalValues.name;
  const description = modalValues.description;
  const color = modalValues.color;

  const sopUID = "1.2.840.10008.5.1.4.1.1.66".concat('.', generateUID(38));
  const seriesUID = "1.2.826.0.1.3680043.8.498".concat(".", generateUID(38))
  const mediaSopUID = "1.2.826.0.1.3680043.8.498".concat('.', generateUID(38));
  var framesUID = []
  for (var i = 0 ; i < niiHeader.dims[3]; i++){
    var uid = "1.2.826.0.1.3680043.8.498".concat('.', generateUID(38))
    framesUID.push(` "${uid}" `);
  }
  const dimUID = "1.2.826.0.1.3680043.8.498".concat('.', generateUID(38));
  const date = getDate();
  const time = getTime();
  // Alternative to inspect should be from referencedSeries ?
  // const dataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(newDicomDict.dict);
  // const newseg = new dcmjs.derivations.Segmentation([dataset]);

  return `{
          "AccessionNumber": "",
          "BitsAllocated": 1,
          "BitsStored": 1,
          "ClinicalTrialSeriesID": "Session1",
          "ClinicalTrialTimePointID": "1",
          "ClinicalTrialCoordinatingCenterName": "Unknown",
          "Columns": ${niiHeader.dims[1]},
          "ContentDate": ${date},
          "ContentTime": "${time}",
          "ContentDescription": "Unknown Source Investigal Use Only",
          "ContentLabel": "SEGMENTATION",
          "ContentCreatorName": "Unknown",
          "DeviceSerialNumber": 0,
          "FrameOfReferenceUID": "1.2.826.0.1.3680043.8.498.10195155395013987828201313741368576532",
          "HighBit": 0,
          "ImageType": [ "DERIVED", "PRIMARY" ],
          "InstanceCreationDate": ${date},
          "InstanceCreationTime": "",
          "InstanceNumber":  "1",
          "InstitutionName": "Unknown",
          "LossyImageCompression": "00",
          "Manufacturer": "pydicom-seg",
          "ManufacturerModelName": "",
          "Modality": "SEG",
          "NumberOfFrames": 30,
          "PatientBirthDate": "",
          "PatientID": "${referencedSeries[0]["00100020"].Value[0]}",
          "PatientName": "${referencedSeries[0]["00100010"].Value[0].Alphabetic}",
          "PatientSex": "",
          "PhotometricInterpretation": "MONOCHROME2",
          "PixelRepresentation": 1,
          "PixelSpacing": [ ${niiHeader.pixDims[1]}, ${niiHeader.pixDims[2]} ],
          "PositionReferenceIndicator": "",
          "ProcedureCodeSequence": [ {} ],
          "ReferringPhysicianName": "",
          "Rows":  ${niiHeader.dims[2]},
          "SOPClassUID": "1.2.840.10008.5.1.4.1.1.66.4",
          "SOPInstanceUID": "${mediaSopUID}",
          "SamplesPerPixel": 1,
          "SegmentsOverlap": "NO",
          "SegmentationType": "BINARY",
          "SeriesDate": ${date},
          "SeriesDescription": "Segmentation",
          "SeriesInstanceUID": "${seriesUID}",
          "SeriesNumber": 300,
          "SeriesTime": "${time}",
          "SliceThickness":  ${niiHeader.pixDims[3]},
          "SoftwareVersions": "Unknown",
          "SpecificCharacterSet": "ISO_IR 100",
          "StudyDate": "",
          "StudyDescription": "",
          "StudyID": "",
          "StudyInstanceUID": "${referencedSeries[0]["0020000D"].Value[0]}",
          "StudyTime": "",
          ${getMockDimensionsField(dimUID)},
          "PerFrameFunctionalGroupsSequence": [ ${getMockPerFrameFunctionalGroupsSequence(referencedSeries)} ],
          "ProcedureCodeSequence": [],
          "ReferencedSeriesSequence": [ ${getMockReferencedSeriesSequence(referencedSeries)} ],
          "SegmentSequence": [ ${getMockSegmentSequence(name, description, color)} ],
          "SharedFunctionalGroupsSequence": [ ${getMockSharedFunctionalGroupsSequence(referencedSeries, niiHeader)} ],
          "_meta": {
              "FileMetaInformationVersion": [],
              "ImplementationClassUID": "1.2.826.0.1.3680043.8.498.1",
              "ImplementationVersionName": "PYDICOM 2.1.2",
              "MediaStorageSOPClassUID": {
                  "Value": [
                      "1.2.840.10008.5.1.4.1.1.66.4"
                  ],
                  "vr": "UI"
              },
              "MediaStorageSOPInstanceUID": {
                  "Value": [
                      "${mediaSopUID}"
                  ],
                  "vr": "UI"
              },
              "TransferSyntaxUID": {
                  "Value": [
                      "1.2.840.10008.1.2.1"
                  ],
                  "vr": "UI"
              }
          },
          "_vrMap": {
               "PixelData": "OW"
          }
      }`;
}
