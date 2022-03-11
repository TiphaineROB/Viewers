import React, { useState, useEffect, useRef } from 'react';
import { utils, log } from '@ohif/core';
import cornerstoneTools from 'cornerstone-tools';
import CornerstoneViewport from 'react-cornerstone-viewport';


import {
  generateUID,
  getDate,
  getTime,
  hexToRgb,
  getMockSegmentSequence,
  getMockDimensionsField,
  getMockProcedureCodeSequence,
  getMockReferencedSeriesSequence,
  getMockSharedFunctionalGroupsSequence,
  getMockPerFrameFunctionalGroupsSequence,
} from './mockMetadataTools';

/**
 *
 *
 * @param {*} referencedSeries
 * @param {*} niiHeader
 * @param {*} modalValues
 * @returns
 *
 */
export default function createJsonDCM(
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
