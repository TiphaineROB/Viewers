import React, { useState, useEffect, useRef } from 'react';
import { utils, log } from '@ohif/core';
import cornerstoneTools from 'cornerstone-tools';
import CornerstoneViewport from 'react-cornerstone-viewport';

import { api } from 'dicomweb-client';
import * as dicomParser from 'dicom-parser';
import JSZip from 'jszip';
import { UIModalService, UINotificationService } from '@ohif/core';

import UploadForm from '../components/UploadForm/UploadForm';
import PromiseModal from '../components/modal';

import {
  generateUID,
  getDate,
} from './mockMetadataTools';

import {
  createDerivedObject,
  setNumberOfFrames,
  addSegment,
} from './createDerivedObject'

/**
 *
 *
 * @param {*} dicomWeb
 * @param {*} dicomDict
 * @param {*} currentSegment
 * @param {*} activeLabelMaps3D
 * @param {*} callback
 * @returns
 *
 */
export default async function uploadSegment(
  dicomWeb,
  dicomDict,
  currentSegment,
  activeLabelMaps3D,
  callback,
  newSeg=false,
) {

  const uiModalService = UIModalService.create({});
  const dcmjs = require('dcmjs')

  const confirmedAction = (data) => {
    uiModalService.hide()

    // const element = document.getElementsByClassName("viewport-element")[0];
    // const globalToolStateManager =
    //         cornerstoneTools.globalImageIdSpecificToolStateManager;
    // const toolState = globalToolStateManager.saveToolState();
    //
    // const stackToolState = cornerstoneTools.getToolState(element, "stack");
    //
    //
    const meta = dicomDict.meta

    var newDicomDict = new dcmjs.data.DicomDict(meta);
    newDicomDict.dict = dicomDict.dict;
    const dataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(newDicomDict.dict);

    const newseg = new dcmjs.derivations.Segmentation([dataset]);
    //const newseg = createDerivedObject()
    if (newseg.referencedDataset.PerFrameFunctionalGroupsSequence[0]
        .PlaneOrientationSequence === undefined )
    {
      newseg.referencedDataset
          .PerFrameFunctionalGroupsSequence.forEach( (perFrameGroup, index) => {
            perFrameGroup.PlaneOrientationSequence = dcmjs.derivations
                    .DerivedDataset.copyDataset(
                      newseg.referencedDataset.SharedFunctionalGroupsSequence[0]
                        .PlaneOrientationSequence
                    )
          });
    }

    newseg.setNumberOfFrames(newseg.referencedDataset.NumberOfFrames);

    let referencedFrameNumbers = [];
    newseg.referencedDataset.PerFrameFunctionalGroupsSequence.forEach(perFrameGroup => {
      referencedFrameNumbers.push(perFrameGroup.FrameContentSequence[0].DimensionIndexValues[1]);
    });
    let segmentIndex = [];
    activeLabelMaps3D.labelmaps2D.forEach( (labelmap, index) => {
      segmentIndex.push(index)
    });

    // newseg.addSegmentFromLabelmap(newseg.referencedDataset.SegmentSequence,
    //     [activeLabelMaps3D.labelmaps2D], segmentIndex, referencedFrameNumbers)


    const array = new Uint16Array(activeLabelMaps3D.buffer)
    const packedarray = dcmjs.data.BitArray.pack(array)
    addSegment(newseg.referencedDataset.SegmentSequence, newseg,
        packedarray, referencedFrameNumbers)
    //newseg.addSegment(newseg.referencedDataset.SegmentSequence,
    console.log(newseg)

    newseg.dataset._meta = {
        MediaStorageSOPClassUID: {
        Value: [ newseg.dataset.SOPClassUID],
        vr: "UI",
      },
      MediaStorageSOPInstanceUID: {
        Value: [ newseg.dataset.SOPInstanceUID],
        vr: "UI",
      },
      TransferSyntaxUID: {
          Value: ["1.2.840.10008.1.2.1"],
          vr: "UI"
      }
    }
    console.log(activeLabelMaps3D)

    const dicomDerived = dcmjs.data.datasetToDict(newseg.dataset)

    // let bufferDerived = Buffer.from(dicomDerived.write());
    //
    // var FileSaver = require('file-saver');
    // let filename = `test.dcm`
    // var blobDerived = new Blob([bufferDerived], { type: 'text/plain;charset=utf-8' });


    // const derivedParsed = dicomParser.parseDicom(bufferDerived);
    // console.log(derivedParsed)

    // FileSaver.saveAs(blobDerived, filename);
    callback(dicomWeb, dicomDict, dicomDerived, data.removePrevious)

  }

  uiModalService.show({
          content: UploadForm,
          title: 'Upload Changes',
          contentProps: {
            callback: confirmedAction,
          },
          customClassName: 'uploadForm',
          shouldCloseOnEsc: true,
          onClose: () => {
            console.log("Escape Upload Form")
          }
  })

}
