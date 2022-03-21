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
 * @param {*} currentDisplaySet
 * @param {*} enabledSeriesMeta
 * @param {*} callback
 * @returns
 *
 */
export default async function newSegment(
  enabledSeries,
  currentDisplaySet,
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
    //Here header and image should be empty
    uiModalService.hide()

    var derivated = createDerivedObject(enabledSeries);
    const numberOfFrames = enabledSeries.length;

    derivated = setNumberOfFrames(derivated, numberOfFrames);
    derivated.dataset.ContentDescription = description;
    derivated.dataset.SeriesDescription = "SEG "+ description +' - Empty'

    let rgbcolor = hexToRgb(color);
    rgbcolor = [ rgbcolor.r/255, rgbcolor.g/255, rgbcolor.b/255];
    const recommendedCIELabValues = dcmjs.data.Colors.rgb2DICOMLAB(rgbcolor);

    derivated.dataset.InstanceNumber=1;
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
      const instanceNumber = currentDisplaySet.images[i]._data.metadata.InstanceNumber;
      referencedFrameNumbers.push(instanceNumber);
    }

    console.log(enabledSeries)

    const emptyArray = new Uint16Array(
      derivated.dataset.Columns * derivated.dataset.Rows * derivated.dataset.NumberOfFrames
    )

    // console.log(derivated.dataset.Columns, derivated.dataset.Rows, derivated.dataset.NumberOfFrames)
    // console.log(emptyArray)

    const packedarray = dcmjs.data.BitArray.pack(emptyArray)

    // console.log(packedarray)
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

    const part10Buffer = dicomDerived.write();

    var FileSaver = require('file-saver');
    let filename = `test-toserver.dcm`
    var blob = new Blob([part10Buffer], { type: 'text/plain;charset=utf-8' });
    FileSaver.saveAs(blob, filename);
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
