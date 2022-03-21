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
 * @param {*} currentDisplaySet
 * @param {*} currentSegment
 * @param {*} activeLabelMaps3D
 * @param {*} callback
 * @returns
 *
 */
export async function uploadSegment(
  dicomWeb,
  dicomDict,
  currentDisplaySet,
  currentSegment,
  activeLabelMaps3D,
  callback,
  newSeg=false,
) {

  const uiModalService = UIModalService.create({});
  const dcmjs = require('dcmjs')

  const confirmedAction = (data) => {
    uiModalService.hide()

    const meta = dicomDict.meta

    var newDicomDict = new dcmjs.data.DicomDict(meta);
    newDicomDict.dict = dicomDict.dict;
    const dataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(newDicomDict.dict);

    const newseg = new dcmjs.derivations.Segmentation([dataset]);
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
    for (var i = 0; i < newseg.referencedDataset.NumberOfFrames; i++){
      const instanceNumber = currentDisplaySet.images[i]._data.metadata.InstanceNumber;
      referencedFrameNumbers.push(instanceNumber);
    }


    let segmentIndex = [];
    activeLabelMaps3D.labelmaps2D.forEach( (labelmap, index) => {
      segmentIndex.push(index)
    });

    const array = new Uint16Array(activeLabelMaps3D.buffer)
    const packedarray = dcmjs.data.BitArray.pack(array)
    addSegment(newseg.referencedDataset.SegmentSequence, newseg,
        packedarray, referencedFrameNumbers)

    newseg.dataset.SeriesDescription = newseg.dataset.SeriesDescription.split(" - ")[0]+ ' - ' + data.description


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

/**
 *
 *
 * @param {*} dicomWeb
 * @param {*} currentDisplaySet
 * @param {*} currentSegment
 * @param {*} activeLabelMaps3D
 * @param {*} callback
 * @returns
 *
 */
export async function uploadNewSegment(
  dicomWeb,
  currentDisplaySet,
  currentSegment,
  activeLabelMaps3D,
  callback,
  newSeg=false,
) {

  const dcmjs = require('dcmjs')

  const _meta = {
       MediaStorageSOPClassUID: {
      Value: [ currentSegment.metadata.SOPClassUID],
      vr: "UI",
    },
    MediaStorageSOPInstanceUID: {
      Value: [ currentSegment.metadata.SOPInstanceUID],
      vr: "UI",
    },
    TransferSyntaxUID: {
        Value: ["1.2.840.10008.1.2.1"],
        vr: "UI"
    }
  }
  const _vrMap = currentSegment.metadata._vrMap;
  const _dict = currentSegment.metadata;
  // remove _vrMap from _dict
  delete _dict._vrMap;

  var dicomDict = new dcmjs.data.DicomDict(_meta);
  dicomDict.dict = _dict;
  dicomDict._vrMap = _vrMap;

  const newseg = new dcmjs.derivations.Segmentation([dicomDict.dict]);

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
  newseg.dataset.SeriesDescription = newseg.referencedDataset.SeriesDescription
  newseg.dataset.SeriesDate = newseg.referencedDataset.SeriesDate;
  newseg.dataset.SeriesTime = newseg.referencedDataset.SeriesTime;
  let referencedFrameNumbers = [];
  for (var i = 0; i < newseg.referencedDataset.NumberOfFrames; i++){
     const instanceNumber = currentDisplaySet.images[i]._data.metadata.InstanceNumber;
     referencedFrameNumbers.push(instanceNumber);
  }
  let segmentIndex = [];
  activeLabelMaps3D.labelmaps2D.forEach( (labelmap, index) => {
       segmentIndex.push(index)
  });

  const array = new Uint16Array(activeLabelMaps3D.buffer)
  const packedarray = dcmjs.data.BitArray.pack(array)
  addSegment(newseg.referencedDataset.SegmentSequence, newseg,
         packedarray, referencedFrameNumbers)

  newseg.dataset._meta = _meta;
  newseg.dataset._vrMap = _vrMap;


  if (newseg.dataset.SeriesDescription.includes("Empty"))
  {
    newseg.dataset.SeriesDescription = newseg.dataset.SeriesDescription.split("Empty")[0]+ newseg.dataset.SegmentSequence[0].SegmentLabel
  }
  const dicomDerived = dcmjs.data.datasetToDict(newseg.dataset)
  callback(dicomWeb, undefined, dicomDerived, false)


}
