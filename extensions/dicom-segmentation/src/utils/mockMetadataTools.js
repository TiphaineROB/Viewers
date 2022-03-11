import React, { useState, useEffect, useRef } from 'react';
import { utils, log, DICOMWeb, errorHandler} from '@ohif/core';
import cornerstoneTools from 'cornerstone-tools';
import CornerstoneViewport from 'react-cornerstone-viewport';
import { UINotificationService } from '@ohif/core';
import { api } from 'dicomweb-client';

const { studyMetadataManager, xhrRetryRequestHook} = utils;
const { getXHRRetryRequestHook } = xhrRetryRequestHook;



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
