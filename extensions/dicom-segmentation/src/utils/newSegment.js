import React, { useState, useEffect, useRef } from 'react';
import { utils, log } from '@ohif/core';
import cornerstoneTools from 'cornerstone-tools';
import CornerstoneViewport from 'react-cornerstone-viewport';

import { api } from 'dicomweb-client';
import * as dicomParser from 'dicom-parser';
import JSZip from 'jszip';
import { UIModalService, UINotificationService } from '@ohif/core';

import SegmentationLabelForm from '../components/SegmentationForm/SegmentationLabelForm';
import PromiseModal from '../components/modal';

import {
  generateUID,
  getDate,
} from './mockMetadataTools';

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
* @param {*} enabledSeries
 * @param {*} enabledSeriesMeta
 * @param {*} callback
 * @returns
 *
 */
export default async function newSegment(
  enabledSeries,
  enabledSeriesMeta,
  callback
) {

  const uiModalService = UIModalService.create({});
  const dcmjs = require('dcmjs')

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

  const submit = (name, description, color, header, image) => {

    uiModalService.hide()

    var derivated = createDerivedObject(enabledSeries);
    const numberOfFrames = enabledSeries.length;

    derivated = setNumberOfFrames(derivated, numberOfFrames);

    const rgbcolor = hexToRgb(color);
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
             SegmentLabel: name,
             SegmentDescription: description,
             SegmentAlgorithmType: "MANUAL",
             SegmentAlgorithmName: "Unknown Source",
             RecommendedDisplayCIELabValue: [ recommendedCIELabValues[0],
                          recommendedCIELabValues[1], recommendedCIELabValues[2]],
             SegmentedPropertyTypeCodeSequence: {
                  CodeValue: "78961009",
                  CodingSchemeDesignator: "SCT",
                  CodeMeaning: name
              }
         };

    const referencedFrameNumbers = [];
    for (var i = 0; i < numberOfFrames; i++){
      referencedFrameNumbers.push(i+1);
    }

    const emptyArray = new Uint8Array(
      derivated.dataset.PixelData
    )
    addSegment(segment, derivated, emptyArray, referencedFrameNumbers)

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

    //Here header and image should be empty
    callback(dicomDerived)
  }

  uiModalService.show({
    content: SegmentationLabelForm,
    title: 'Create new segmentation',
    contentProps: {
      name: 'New',
      description: '',
      color:'#a45e7e',
      onSubmit: submit,
      nifitiImportation: false,
      fileHeader: {},
      fileImage: {},
    },
    customClassName: 'segmentationLabelForm',
    shouldCloseOnEsc: true,
    onClose: () => {
      console.log(' Close Segmentation Label Form')
    }
  })

}
