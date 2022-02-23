import setActiveLabelmap from './utils/setActiveLabelMap';
import { metadata } from '@ohif/core';

export default function getSourceDisplaySet(studies, segDisplaySet, activateLabelMap = true, onDisplaySetLoadFailureHandler) {
  // console.log('GetSourceDisplaySet:: calls getReferencedDisplaySet')
  const referencedDisplaySet = metadata.StudyMetadata.getReferencedDisplaySet(segDisplaySet, studies);

  let activatedLabelmapPromise;
  if (activateLabelMap) {
    activatedLabelmapPromise = setActiveLabelmap(referencedDisplaySet, studies, segDisplaySet, undefined, onDisplaySetLoadFailureHandler);
  }

  return {
    referencedDisplaySet : referencedDisplaySet,
    activatedLabelmapPromise : activatedLabelmapPromise
  }
}
