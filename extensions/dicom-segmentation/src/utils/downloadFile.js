import { utils, log, DICOMWeb} from '@ohif/core';
import cornerstoneTools from 'cornerstone-tools';
import cornerstone from 'cornerstone-core';

import * as dicomParser from 'dicom-parser';
import JSZip from 'jszip';
import { UINotificationService } from '@ohif/core';
import { api } from 'dicomweb-client';

/**
 *
 *
 * @param {*} selectedSegmentationOption
 * @returns
 *
 */
export default function downloadFile(
  selectedSegmentationOption
) {
  const notification = UINotificationService.create({});

  const config = {
    url: window.config.servers.dicomWeb[0].qidoRoot,
    headers: DICOMWeb.getAuthorizationHeader(),
  };
  const dicomWeb = new api.DICOMwebClient(config);

  //Get the ID of the current selectedSegment
  const currentSegment = selectedSegmentationOption.metadata
  const studyInstanceUID = currentSegment.StudyInstanceUID;
  const seriesInstanceUID = currentSegment.SeriesInstanceUID;

  const options = {
    studyInstanceUID: studyInstanceUID,
    seriesInstanceUID: seriesInstanceUID,
  }

  dicomWeb.retrieveSeries(options).then(instances => {
    var FileSaver = require('file-saver');
    var zip = new JSZip();
    if (instances.length === 1) {
      let filename = `${seriesInstanceUID}.dcm`
      var blob = new Blob(instances, { type: 'text/plain;charset=utf-8' });
      FileSaver.saveAs(blob, filename);
      notification.show({
        title: 'Downloading segments',
        message: '3D dcm file downloaded',
        type: 'success',
        duration: 2000,
      });
    }
    else {
      let filename = `${seriesInstanceUID}.zip`
      for (let i = 0; i < instances.length; i++) {
          var blob = new Blob([instances[i]], { type: 'text/plain;charset=utf-8' });
          var blobname = `${i}.dcm`
          zip.file(blobname, blob)
      }
      zip.generateAsync({type:"blob"})
      .then(function(content) {
          saveAs(content, filename);
      }, function(err){
          console.log(err)
          notification.show({
            title: 'Downloading segments',
            message: 'Could not download segments, make sure its uploaded on the server',
            type: 'error',
            duration: 2000,
          });
      });
      notification.show({
        title: 'Downloading segments',
        message: 'Multiple instances saved in zip file',
        type: 'warning',
        duration: 2000,
      });
    }
  }, function(err){
    console.log(err)
  });
}
