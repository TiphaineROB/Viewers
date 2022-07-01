import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import cornerstoneTools, {
  importInternal,
  getToolState,
  toolColors,
  getModule,
  globalImageIdSpecificToolStateManager,
  util,
} from 'cornerstone-tools';
const { setters, getters, state } = getModule('segmentation');
import cornerstone from 'cornerstone-core';
import moment from 'moment';
import classNames from 'classnames';
import { utils, log, classes, DICOMWeb, errorHandler } from '@ohif/core';
import { ScrollableArea, TableList, Icon } from '@ohif/ui';
import DICOMSegTempCrosshairsTool from '../../tools/DICOMSegTempCrosshairsTool';

import setActiveLabelmap from '../../utils/setActiveLabelMap';
import refreshViewports from '../../utils/refreshViewports';



import { api } from 'dicomweb-client';
import JSZip from 'jszip';
import { UINotificationService } from '@ohif/core';
import * as dicomParser from 'dicom-parser';
import loadFiles from '../../utils/loadFiles';
import downloadFile from '../../utils/downloadFile'
import { uploadSegment, uploadNewSegment } from '../../utils/uploadSegment'
import newSegment from '../../utils/newSegment'

import {
  sendToServer,
  createSegDisplaySet,
} from '../../utils/mockMetadataTools';

import SegmentationCustom from '../../utils/customGenerateToolState.js';
import interpolationTool from '../../utils/interpolationTool.js';

import {
  BrushColorSelector,
  BrushRadius,
  SegmentationItem,
  SegmentItem,
  SegmentationSelect,
} from '../index';

import './SegmentationPanel.css';
//import '../../../../girder-radiomics/src/components/GirderRadiomicsPanel.styl';
import SegmentationSettings from '../SegmentationSettings/SegmentationSettings';
import AutoSegmentation from '../AutoSegmentation/AutoSegmentation';


const { studyMetadataManager, xhrRetryRequestHook} = utils;
const { MetadataProvider } = classes;

const { getXHRRetryRequestHook } = xhrRetryRequestHook;


/**
 * SegmentationPanel component
 *
 * @param {Array} props.studies - Studies data
 * @param {Array} props.viewports - Viewports data (viewportSpecificData)
 * @param {number} props.activeIndex - Active viewport index
 * @param {boolean} props.isOpen - Boolean that indicates if the panel is expanded
 * @param {Function} props.onSegmentItemClick - Segment click handler
 * @param {Function} props.onSegmentVisibilityChange - Segment visibiliy change handler
 * @param {Function} props.onConfigurationChange - Configuration change handler
 * @param {Function} props.activeContexts - List of active application contexts
 * @param {Function} props.contexts - List of available application contexts
 * @returns component
 */
const SegmentationPanel = ({
  studies,
  viewports,
  activeIndex,
  isOpen,
  onSegmentItemClick,
  onSegmentVisibilityChange,
  onConfigurationChange,
  onDisplaySetLoadFailure,
  onSelectedSegmentationChange,
  activeContexts = [],
  contexts = {},
}) => {

  const isVTK = () => activeContexts.includes(contexts.VTK);
  const isCornerstone = () => activeContexts.includes(contexts.CORNERSTONE);


  /*
   * TODO: wrap get/set interactions with the cornerstoneTools
   * store with context to make these kind of things less blurry.
   */
  const { configuration } = cornerstoneTools.getModule('segmentation');
  const DEFAULT_BRUSH_RADIUS = configuration.radius || 10;

  /*
   * TODO: We shouldn't hardcode brushColor color, in the future
   * the SEG may set the colorLUT to whatever it wants.
   */
  const [state, setState] = useState({
    brushRadius: DEFAULT_BRUSH_RADIUS,
    brushColor: 'rgba(221, 85, 85, 1)',
    selectedSegment: 0,
    selectedSegmentation: 0,
    showSettings: false,
    labelMapList: [],
    segmentList: [],
    segmentsHidden: [],
    segmentNumbers: [],
    isLoading: false,
    isDisabled: true,
  });

  // temporary uploaded segments that should be load as well
  let labelMapListTmp = [];

  let getActiveViewport = () => viewports[activeIndex];

  const getFirstImageId = () => {
    const { StudyInstanceUID, displaySetInstanceUID } = getActiveViewport();
    const studyMetadata = studyMetadataManager.get(StudyInstanceUID);
    return studyMetadata.getFirstImageId(displaySetInstanceUID);
  };

  const getActiveLabelMaps3D = () => {
    const { labelmaps3D, activeLabelmapIndex } = getBrushStackState();
    return labelmaps3D[activeLabelmapIndex];
  };

  const getActiveLabelMapIndex = () => {
    const { activeLabelmapIndex } = getBrushStackState();
    return activeLabelmapIndex;
  };

  const getActiveSegmentIndex = () => {
    const { activeSegmentIndex } = getActiveLabelMaps3D();
    return activeSegmentIndex;
  };

  const getActiveLabelMaps2D = () => {
    const { labelmaps2D } = getActiveLabelMaps3D();
    return labelmaps2D;
  };

  const getCurrentDisplaySet = () => {
    const { StudyInstanceUID, displaySetInstanceUID } = getActiveViewport();
    const studyMetadata = studyMetadataManager.get(StudyInstanceUID);
    const allDisplaySets = studyMetadata.getDisplaySets();
    return allDisplaySets.find(
      ds => ds.displaySetInstanceUID === displaySetInstanceUID
    );
  };

  const setActiveSegment = segmentIndex => {
    const activeSegmentIndex = getActiveSegmentIndex();
    const activeViewport = getActiveViewport();

    if (segmentIndex === activeSegmentIndex) {
      log.info(`${activeSegmentIndex} is already the active segment`);
      return;
    }

    const labelmap3D = getActiveLabelMaps3D();
    labelmap3D.activeSegmentIndex = segmentIndex;

    /**
     * Activates the correct label map if clicked segment
     * does not belong to the active labelmap
     */
    const { StudyInstanceUID } = activeViewport;
    const studyMetadata = studyMetadataManager.get(StudyInstanceUID);
    const allDisplaySets = studyMetadata.getDisplaySets();
    let selectedSegmentation;
    let newLabelmapIndex = getActiveLabelMapIndex();

    allDisplaySets.forEach(displaySet => {
      if (displaySet.labelmapSegments) {
        Object.keys(displaySet.labelmapSegments).forEach(labelmapIndex => {
          if (
            displaySet.labelmapSegments[labelmapIndex].includes(segmentIndex)
          ) {
            newLabelmapIndex = labelmapIndex;
            selectedSegmentation =
              displaySet.hasOverlapping === true
                ? displaySet.originLabelMapIndex
                : labelmapIndex;
          }
        });
      }
    });

    const brushStackState = getBrushStackState();
    brushStackState.activeLabelmapIndex = newLabelmapIndex;
    if (selectedSegmentation) {
      setState(state => ({ ...state, selectedSegmentation }));
    }

    refreshViewports();

    return segmentIndex;
  };

  useEffect(() => {
    const labelmapModifiedHandler = event => {
      log.warn('Segmentation Panel: labelmap modified', event);
      refreshSegmentations();
    };

    /*
     * TODO: Improve the way we notify parts of the app that depends on segs to be loaded.
     *
     * Currently we are using a non-ideal implementation through a custom event to notify the segmentation panel
     * or other components that could rely on loaded segmentations that
     * the segments were loaded so that e.g. when the user opens the panel
     * before the segments are fully loaded, the panel can subscribe to this custom event
     * and update itself with the new segments.
     *
     * This limitation is due to the fact that the cs segmentation module is an object (which will be
     * updated after the segments are loaded) that React its not aware of its changes
     * because the module object its not passed in to the panel component as prop but accessed externally.
     *
     * Improving this event approach to something reactive that can be tracked inside the react lifecycle,
     * allows us to easily watch the module or the segmentations loading process in any other component
     * without subscribing to external events.
     */
    document.addEventListener(
      'extensiondicomsegmentationsegloaded',
      refreshSegmentations
    );
    document.addEventListener(
      'extensiondicomsegmentationsegselected',
      updateSegmentationComboBox
    );

    /*
     * These are specific to each element;
     * Need to iterate cornerstone-tools tracked enabled elements?
     * Then only care about the one tied to active viewport?
     */
    cornerstoneTools.store.state.enabledElements.forEach(enabledElement =>
      enabledElement.addEventListener(
        'cornerstonetoolslabelmapmodified',
        labelmapModifiedHandler
      )
    );

    return () => {
      document.removeEventListener(
        'extensiondicomsegmentationsegloaded',
        refreshSegmentations
      );
      document.removeEventListener(
        'extensiondicomsegmentationsegselected',
        updateSegmentationComboBox
      );
      cornerstoneTools.store.state.enabledElements.forEach(enabledElement =>
        enabledElement.removeEventListener(
          'cornerstonetoolslabelmapmodified',
          labelmapModifiedHandler
        )
      );
    };
  }, [activeIndex, viewports]);

  const updateSegmentationComboBox = (e) => {
    const index = e.detail.activatedLabelmapIndex;
    if (index !== -1) {
      setState(state => ({ ...state, selectedSegmentation: index }));
    } else {
      cleanSegmentationComboBox();
    }
  }

  const cleanSegmentationComboBox = () => {
    setState(state => ({
      ...state,
      segmentsHidden: [],
      segmentNumbers: [],
      labelMapList: [],
      segmentList: [],
      isDisabled: true,
      selectedSegmentation: -1,
    }));
  }

  const refreshSegmentations = () => {
    const activeViewport = getActiveViewport();
    const isDisabled = !activeViewport || !activeViewport.StudyInstanceUID;
    if (!isDisabled) {
      const brushStackState = getBrushStackState();
      if (brushStackState) {
        const labelMapList = getLabelMapList();
        const {
          items: segmentList,
          numbers: segmentNumbers,
          segmentsHidden,
        } = getSegmentList();
        setState(state => ({
          ...state,
          segmentsHidden,
          segmentNumbers,
          labelMapList,
          segmentList,
          isDisabled,
        }));
      } else {
        setState(state => ({
          ...state,
          segmentsHidden: [],
          segmentNumbers: [],
          labelMapList: [],
          segmentList: [],
          isDisabled,
        }));
      }
    }
  };

  useEffect(() => {
    refreshSegmentations();
  }, [
    viewports,
    activeIndex,
    isOpen,
    state.selectedSegmentation,
    activeContexts,
    state.isLoading,
  ]);

  /* Handle open/closed panel behaviour */
  useEffect(() => {
    setState(state => ({
      ...state,
      showSettings: state.showSettings && !isOpen,
    }));
  }, [isOpen]);

  const getLabelMapList = () => {
    const activeViewport = getActiveViewport();
    let sopInstanceUIDs = [];
    /* Get list of SEG labelmaps specific to active viewport (reference series) */
    const referencedSegDisplaysets = _getReferencedSegDisplaysets(
      activeViewport.StudyInstanceUID,
      activeViewport.SeriesInstanceUID
    );

    const filteredReferencedSegDisplaysets = referencedSegDisplaysets.filter(
      (segDisplay => segDisplay.loadError !== true));
    const results = filteredReferencedSegDisplaysets.map((displaySet, index) => {
      const {
        labelmapIndex,
        originLabelMapIndex,
        hasOverlapping,
        SeriesDate,
        SeriesTime,
        metadata,
      } = displaySet;

      /* Map to display representation */
      const dateStr = `${SeriesDate}:${SeriesTime}`.split('.')[0];
      const date = moment(dateStr, 'YYYYMMDD:HHmmss');
      const displayDate = date.format('ddd, MMM Do YYYY, h:mm:ss a');

      const displayDescription = displaySet.SeriesDescription; //+' - '+ displaySet.ContentDescription;
      sopInstanceUIDs.push(metadata.SOPInstanceUID);
      return {
        value: hasOverlapping === true ? originLabelMapIndex : labelmapIndex,
        title: displayDescription,
        description: displayDate,
        metadata: metadata,
        onClick: async () => {
          const activatedLabelmapIndex = await setActiveLabelmap(
            activeViewport,
            studies,
            displaySet,
            onSelectedSegmentationChange,
            onDisplaySetLoadFailure
          );
          setState(state => ({
            ...state,
            selectedSegmentation: activatedLabelmapIndex,
          }));
        },
      };
    });
    state.labelMapList.forEach( labelMap => {
      if (!sopInstanceUIDs.includes(labelMap.metadata.SOPInstanceUID)) {
          sopInstanceUIDs.push(labelMap.metadata.SOPInstanceUID)
          results.push(labelMap);
      }
    }),
    labelMapListTmp.forEach( labelMap => {
      if (!sopInstanceUIDs.includes(labelMap.metadata.SOPInstanceUID)) {
          sopInstanceUIDs.push(labelMap.metadata.SOPInstanceUID)
          results.push(labelMap);
      }
    });
    return results;
  };

  const setCurrentSelectedSegment = segmentNumber => {
    setActiveSegment(segmentNumber);

    const sameSegment = state.selectedSegment === segmentNumber;
    if (!sameSegment) {
      setState(state => ({ ...state, selectedSegment: segmentNumber }));
    }

    const validIndexList = [];
    getActiveLabelMaps2D().forEach((labelMap2D, index) => {
      if (labelMap2D.segmentsOnLabelmap.includes(segmentNumber)) {
        validIndexList.push(index);
      }
    });

    const avg = array => array.reduce((a, b) => a + b) / array.length;
    const average = avg(validIndexList);
    const closest = validIndexList.reduce((prev, curr) => {
      return Math.abs(curr - average) < Math.abs(prev - average) ? curr : prev;
    });

    if (isCornerstone()) {
      const element = getEnabledElement();
      const toolState = cornerstoneTools.getToolState(element, 'stack');

      if (!toolState) return;

      const imageIds = toolState.data[0].imageIds;
      const imageId = imageIds[closest];
      const frameIndex = imageIds.indexOf(imageId);

      const SOPInstanceUID = cornerstone.metaData.get(
        'SOPInstanceUID',
        imageId
      );
      const StudyInstanceUID = cornerstone.metaData.get(
        'StudyInstanceUID',
        imageId
      );

      DICOMSegTempCrosshairsTool.addCrosshair(element, imageId, segmentNumber);

      onSegmentItemClick({
        StudyInstanceUID,
        SOPInstanceUID,
        frameIndex,
        activeViewportIndex: activeIndex,
      });
    }

    if (isVTK()) {
      const labelMaps3D = getActiveLabelMaps3D();
      const currentDisplaySet = getCurrentDisplaySet();
      const frame = labelMaps3D.labelmaps2D[closest];

      onSegmentItemClick({
        studies,
        StudyInstanceUID: currentDisplaySet.StudyInstanceUID,
        displaySetInstanceUID: currentDisplaySet.displaySetInstanceUID,
        SOPClassUID: getActiveViewport().sopClassUIDs[0],
        SOPInstanceUID: currentDisplaySet.SOPInstanceUID,
        segmentNumber,
        frameIndex: closest,
        frame,
      });
    }
  };

  const getColorLUTTable = () => {
    const { state } = cornerstoneTools.getModule('segmentation');
    const { colorLUTIndex } = getActiveLabelMaps3D();
    return state.colorLutTables[colorLUTIndex];
  };

  const getEnabledElement = () => {
    const enabledElements = cornerstone.getEnabledElements();
    return enabledElements[activeIndex].element;
  };

  const onSegmentVisibilityChangeHandler = (isVisible, segmentNumber) => {
    /** Get all labelmaps with this segmentNumber (overlapping segments) */
    const { labelmaps3D } = getBrushStackState();
    const possibleLabelMaps3D = labelmaps3D.filter(({ labelmaps2D }) => {
      return labelmaps2D.some(({ segmentsOnLabelmap }) =>
        segmentsOnLabelmap.includes(segmentNumber)
      );
    });

    let segmentsHidden = [];
    possibleLabelMaps3D.forEach(labelmap3D => {
      labelmap3D.segmentsHidden[segmentNumber] = !isVisible;

      segmentsHidden = [
        ...new Set([...segmentsHidden, ...labelmap3D.segmentsHidden]),
      ];
    });

    setState(state => ({ ...state, segmentsHidden }));

    refreshSegmentations();
    refreshViewports();

    if (isVTK()) {
      onSegmentVisibilityChange(segmentNumber, isVisible);
    }
  };

  const getSegmentList = () => {
    /*
     * Newly created segments have no `meta`
     * So we instead build a list of all segment indexes in use
     * Then find any associated metadata
     */
    const uniqueSegmentIndexes = getActiveLabelMaps2D()
      .reduce((acc, labelmap2D) => {
        if (labelmap2D) {
          const segmentIndexes = labelmap2D.segmentsOnLabelmap;

          for (let i = 0; i < segmentIndexes.length; i++) {
            if (!acc.includes(segmentIndexes[i]) && segmentIndexes[i] !== 0) {
              acc.push(segmentIndexes[i]);
            }
          }
        }

        return acc;
      }, [])
      .sort((a, b) => a - b);


    const labelmap3D = getActiveLabelMaps3D();
    const colorLutTable = getColorLUTTable();
    const hasLabelmapMeta = labelmap3D.metadata && labelmap3D.metadata.data;

    const segmentList = [];
    const segmentNumbers = [];
    for (let i = 0; i < uniqueSegmentIndexes.length; i++) {
      const segmentIndex = uniqueSegmentIndexes[i];

      const color = colorLutTable[segmentIndex];
      let segmentLabel = '(unlabeled)';
      let segmentNumber = segmentIndex;

      /* Meta */
      if (hasLabelmapMeta) {
        const segmentMeta = labelmap3D.metadata.data[segmentIndex];
        if (segmentMeta) {
          segmentNumber = segmentMeta.SegmentNumber;
          segmentLabel = segmentMeta.SegmentLabel;
        }
      }

      const sameSegment = state.selectedSegment === segmentNumber;

      segmentNumbers.push(segmentNumber);
      segmentList.push(
        <SegmentItem
          key={segmentNumber}
          itemClass={`segment-item ${sameSegment && 'selected'}`}
          onClick={setCurrentSelectedSegment}
          label={segmentLabel}
          index={segmentNumber}
          color={color}
          visible={!labelmap3D.segmentsHidden[segmentIndex]}
          onVisibilityChange={onSegmentVisibilityChangeHandler}
        />
      );
    }

    return {
      items: segmentList,
      numbers: segmentNumbers,
      segmentsHidden: labelmap3D.segmentsHidden,
    };

    /*
     * Let's iterate over segmentIndexes ^ above
     * If meta has a match, use it to show info
     * If now, add "no-meta" class
     * Show default name
     */
  };

  const updateBrushSize = evt => {
    const updatedRadius = Number(evt.target.value);

    if (updatedRadius !== brushRadius) {
      setState(state => ({ ...state, brushRadius: updatedRadius }));
      const module = cornerstoneTools.getModule('segmentation');
      module.setters.radius(updatedRadius);
    }
  };

  const decrementSegment = event => {
    const activeSegmentIndex = getActiveSegmentIndex();
    event.preventDefault();
    if (activeSegmentIndex > 1) {
      activeSegmentIndex--;
    }
    setState(state => ({ ...state, selectedSegment: activeSegmentIndex }));
    updateActiveSegmentColor();
  };

  const incrementSegment = event => {
    const activeSegmentIndex = getActiveSegmentIndex();
    event.preventDefault();
    activeSegmentIndex++;
    setState(state => ({ ...state, selectedSegment: activeSegmentIndex }));
    updateActiveSegmentColor();
  };

  const updateActiveSegmentColor = () => {
    const color = getActiveSegmentColor();
    setState(state => ({ ...state, brushColor: color }));
  };

  const getBrushStackState = () => {
    const module = cornerstoneTools.getModule('segmentation');
    const firstImageId = getFirstImageId();
    const brushStackState = module.state.series[firstImageId];
    return brushStackState;
  };

  const getActiveSegmentColor = () => {
    const brushStackState = getBrushStackState();
    if (!brushStackState) {
      return 'rgba(255, 255, 255, 1)';
    }
    const colorLutTable = getColorLUTTable();
    const color = colorLutTable[labelmap3D.activeSegmentIndex];
    return `rgba(${color.join(',')})`;
  };

  const updateConfiguration = newConfiguration => {
    configuration.renderFill = newConfiguration.renderFill;
    configuration.renderOutline = newConfiguration.renderOutline;
    configuration.shouldRenderInactiveLabelmaps =
      newConfiguration.shouldRenderInactiveLabelmaps;
    configuration.fillAlpha = newConfiguration.fillAlpha;
    configuration.outlineAlpha = newConfiguration.outlineAlpha;
    configuration.outlineWidth = newConfiguration.outlineWidth;
    configuration.fillAlphaInactive = newConfiguration.fillAlphaInactive;
    configuration.outlineAlphaInactive = newConfiguration.outlineAlphaInactive;
    onConfigurationChange(newConfiguration);
    refreshViewports();
  };

  const onVisibilityChangeHandler = isVisible => {
    let segmentsHidden = [];
    state.segmentNumbers.forEach(segmentNumber => {
      if (isVTK()) {
        onSegmentVisibilityChange(segmentNumber, isVisible);
      }

      /** Get all labelmaps with this segmentNumber (overlapping segments) */
      const { labelmaps3D } = getBrushStackState();
      const possibleLabelMaps3D = labelmaps3D.filter(({ labelmaps2D }) => {
        return labelmaps2D.some(({ segmentsOnLabelmap }) =>
          segmentsOnLabelmap.includes(segmentNumber)
        );
      });

      possibleLabelMaps3D.forEach(labelmap3D => {
        labelmap3D.segmentsHidden[segmentNumber] = !isVisible;
        segmentsHidden = [
          ...new Set([...segmentsHidden, ...labelmap3D.segmentsHidden]),
        ];
      });
    });

    setState(state => ({ ...state, segmentsHidden }));

    refreshSegmentations();
    refreshViewports();
  };

  const disabledConfigurationFields = [
    'outlineAlpha',
    'shouldRenderInactiveLabelmaps',
  ];

  const selectedSegmentationOption = state.labelMapList.find(
    i => i.value === state.selectedSegmentation
  )

  // Added functions
  const notification = UINotificationService.create({});

  const callbackSegmentations = async (dcm, save=true, viewport=undefined) => {
    const dcmjs = require("dcmjs");
    const buffer = Buffer.from(dcm.write());
    var blob = new Blob([buffer], { type: 'text/plain;charset=utf-8' });

    const dataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(
      dcm.dict
    );
    const test = new dcmjs.data.ReadBufferStream(buffer.buffer);

    const parsed = dicomParser.parseDicom(buffer)

    try {


      const element = document.getElementsByClassName("viewport-element")[0];
      const globalToolStateManager =
              cornerstoneTools.globalImageIdSpecificToolStateManager;
      const toolState = globalToolStateManager.saveToolState();

      const stackToolState = cornerstoneTools.getToolState(element, "stack");
      const imageIds = stackToolState.data[0].imageIds;


      // console.log("Segmentation panel", imageIds)

      let imagePromises = [];
      for (let i = 0; i < imageIds.length; i++) {
        imagePromises.push(cornerstone.loadImage(imageIds[i]));
      }

      const segments = [];
      const { getters, setters } = cornerstoneTools.getModule('segmentation');


      const { labelmaps3D } = getters.labelmaps3D(element);

      if (!labelmaps3D) {
        console.log("Current LabelMaps3D is empty... Loading new ")
      }

      const t0 = performance.now();

      const { Segmentation } = dcmjs.adapters.Cornerstone;
      const toolstate = Segmentation.generateToolState( imageIds ,
            parsed.byteArray.buffer, MetadataProvider)

      const segDisplaySet = createSegDisplaySet(dataset, buffer.buffer);

      const activeViewport = typeof viewport != "undefined" ? viewport : getActiveViewport();
      if (activeViewport != getActiveViewport()){
        getActiveViewport = () => activeViewport;
      }

      await segDisplaySet.load(activeViewport, studies);
      const {
        labelmapBufferArray,
        segMetadata,
        segmentsOnFrame
      } = toolstate;


      setters.labelmap3DByFirstImageId(
          imageIds[0],
          labelmapBufferArray[0],
          1,
          segMetadata,
          imageIds.length,
          segmentsOnFrame
      );

      let labelmaplist = getLabelMapList();
      const hasOverlapping = false;
      const activatedLabelmapIndex = labelmaplist.length;
      const dateStr = `${dataset.SeriesDate}:${dataset.SeriesTime}`.split('.')[0];
      const date = moment(dateStr, 'YYYYMMDD:HHmmss');
      const displayDate = date.format('ddd, MMM Do YYYY, h:mm:ss a');
      const newElementLabelMap = {
        value: hasOverlapping === true ? originLabelMapIndex : activatedLabelmapIndex,
        title: dataset.SeriesDescription,
        description: displayDate,
        metadata: dataset,
        onClick: async () => {
          setState(state => ({
            ...state,
            selectedSegmentation: activatedLabelmapIndex,
          }));
        },
      };
      labelmaplist.push(newElementLabelMap);
      labelMapListTmp.push(newElementLabelMap);
      if (studies[0].derivedDisplaySets === undefined){
        studies[0].derivedDisplaySets = []
      }
      var count = studies[0].derivedDisplaySets.length;
      studies[0].derivedDisplaySets.push(segDisplaySet)
      studies[0].displaySets.push(segDisplaySet)

      // console.log(activeViewport, viewports[activeIndex])
      // console.log(studies)
      // console.log(segDisplaySet)
      // console.log("before setActiveLabelMap")


      const results = await setActiveLabelmap(
        activeViewport,
        studies,
        segDisplaySet,
        onSelectedSegmentationChange,
        onDisplaySetLoadFailure
      );
      setActiveSegment(1)

      // console.log("After setActiveLabelMap")

      const t1 = performance.now();
      console.log(`Decode SEG and load to cornerstone: ${t1-t0}`)

      if (save) {
        sendToServer(dcm);
        notification.show({
          title: 'Loading Segmentation',
          message: 'Success, Might need to refresh the page',
          type: 'success',
          duration: 2000,
        });
      }
      refreshSegmentations();
      // refreshViewports();

    } catch (err) {
      console.log(err)
      notification.show({
        title: 'Loading Segmentation',
        message: err,
        type: 'error',
        duration: 2000,
      });
    }
  }


  const uploadSegmentations = async () => {
    const dcmjs = require('dcmjs')
    var activeLabelMaps3D;
    var currentSegment;
    try {
      activeLabelMaps3D = getActiveLabelMaps3D();
      currentSegment = selectedSegmentationOption;

      // console.log(activeLabelMaps3D)

      // console.log(currentSegment)

      if (!activeLabelMaps3D || currentSegment === undefined){
        notification.show({
          title: 'Upload Segment',
          message: 'empty...',
          type: 'warning',
          duration: 2000,
        });
      }
      const config = {
        url: window.config.servers.dicomWeb[0].qidoRoot,
        headers: DICOMWeb.getAuthorizationHeader(),
        errorInterceptor: errorHandler.getHTTPErrorHandler(),
        requestHooks: [xhrRetryRequestHook()],
      };
      const dicomWeb = new api.DICOMwebClient(config);

      const studyInstanceUID = currentSegment.metadata.StudyInstanceUID;
      const seriesInstanceUID = currentSegment.metadata.SeriesInstanceUID;
      const sopInstanceUID = currentSegment.metadata.SOPInstanceUID;

      var options = {
        studyInstanceUID: studyInstanceUID,
        seriesInstanceUID: seriesInstanceUID,
        sopInstanceUID: sopInstanceUID
      }

      const callbackUpload = (dicomWeb, dicomDict, newDicomDict, removePrevious) => {
          if (removePrevious){
            // Needs to use another methods than the dicomWeb
            console.log("TODO remove previous ?")
          }
          callbackSegmentations(newDicomDict, true, getActiveViewport());
      }
      try {
        const instance = await dicomWeb.retrieveInstance(options)
        var dicomData = dcmjs.data.DicomMessage.readFile(instance);

        await uploadSegment(dicomWeb, dicomData, getCurrentDisplaySet(), currentSegment, activeLabelMaps3D, callbackUpload);
      }
      catch (err){
        console.log(err)
        if (err.message === "request failed"){
          // console.log("Current Segment", currentSegment)
          await uploadNewSegment(dicomWeb,  getCurrentDisplaySet(), currentSegment, activeLabelMaps3D, callbackUpload);
          }
      }


    } catch (err) {
      console.log(err)
      notification.show({
        title: 'Upload Segment',
        message: 'No segments available',
        type: 'error',
        duration: 2000,
      });
      return;
    }
  };


  const createSegment = async () => {
    const config = {
      url: window.config.servers.dicomWeb[0].qidoRoot,
      headers: DICOMWeb.getAuthorizationHeader(),
    };

    var enabledElement = cornerstoneTools.external.cornerstone.getEnabledElements()[0];
    var enabledImageId = enabledElement.image.imageId;

    enabledImageId = enabledImageId.substring(
      enabledImageId.indexOf(config.url) + config.url.length
    );
    var splitImageId = enabledImageId.split('/');
    const enabledStudyInstanceUID = splitImageId[2];
    const enabledSeriesInstanceUID = splitImageId[4];

    const dicomWeb = new api.DICOMwebClient(config);

    const enabledSeriesMeta = await dicomWeb.retrieveSeriesMetadata({
      studyInstanceUID: enabledStudyInstanceUID,
      seriesInstanceUID: enabledSeriesInstanceUID,
    })
    const enabledSeries = await dicomWeb.retrieveSeries({
      studyInstanceUID: enabledStudyInstanceUID,
      seriesInstanceUID: enabledSeriesInstanceUID,
    })

    const callbackNewSegment = (dicomDerived) => {
      const labelMapsList = getLabelMapList();
      // console.log("callbacknewsegment")
      let upload=false;
      callbackSegmentations(dicomDerived, upload);
      notification.show({
        title: 'Create Segments',
        message: "Ready to be modified, don't forget to save",
        type: 'success',
        duration: 9000,
      });
    }

    const currentDisplaySet = getCurrentDisplaySet();
    await newSegment(enabledSeries, currentDisplaySet, enabledSeriesMeta, callbackNewSegment)
  };


  const downloadSegment = () => {
    downloadFile(selectedSegmentationOption);
  };

  const loadSegmentations = async () => {
    const files = inputRef.current.files
    if (files.length === 0) {
      notification.show({
        title: 'Load Segments',
        message: 'No file selected, nothing to do',
        type: 'warning',
        duration: 2000,
      });
    }
    else {
      var dcmfiles = []
      for (let i = 0; i < files.length; i++) {
        let file = files[i];
        await loadFiles(file, getActiveViewport(), getCurrentDisplaySet(), callbackSegmentations)
      }
    }
  };

  const callInterpolationTool = async () => {
    console.log("Inter-slices interpolation segmentation tool")
    const currentDisplaySet = getCurrentDisplaySet();
    // console.log("CurrentDisplaySet : ", currentDisplaySet)

    if ( ! getBrushStackState()) {
      notification.show({
        title: 'Inter-slice interpolation',
        message: "At least two slices should be segmented",
        type: 'warning',
        duration: 2000,
      });
      return;
    }
    var activeLabelMaps3D = getActiveLabelMaps3D();

    console.log(activeLabelMaps3D)

    var notEmpty = activeLabelMaps3D.labelmaps2D.filter( obj => Object.keys(obj).length !== 0).length;
    if (notEmpty < 2) {
      notification.show({
        title: 'Inter-slice interpolation',
        message: "At least two slices should be segmented",
        type: 'warning',
        duration: 2000,
      });
      return;
    }

    var firstSeg = {}, secondSeg = {}, firstIdx = 0, secondIdx = 0;
    var countInter = 0, nbInter = notEmpty-1;

    var toInterpolate = []


    var enabledElement = cornerstone.getEnabledElements()[0];
    var element = enabledElement.element;

  //  var labelmap3D = getters.labelmap3D(element);

    const { rows, columns } = enabledElement.image;

    const config = {
      url: window.config.servers.dicomWeb[0].qidoRoot,
      headers: DICOMWeb.getAuthorizationHeader(),
    };

    var enabledImageId = cornerstone.getImage(element).imageId

    enabledImageId = enabledImageId.substring(
      enabledImageId.indexOf(config.url) + config.url.length
    );
    var splitImageId = enabledImageId.split('/');
    const enabledStudyInstanceUID = splitImageId[2];
    const enabledSeriesInstanceUID = splitImageId[4];
    const enabledInstanceUID = splitImageId[6]

    const dicomWeb = new api.DICOMwebClient(config);
    var enabledSeries = await dicomWeb.retrieveSeriesMetadata({
        studyInstanceUID: enabledStudyInstanceUID,
        seriesInstanceUID: enabledSeriesInstanceUID,
    })

    const enabledSeriesMeta = await dicomWeb.retrieveSeriesMetadata({
      studyInstanceUID: enabledStudyInstanceUID,
      seriesInstanceUID: enabledSeriesInstanceUID,
    })

    await activeLabelMaps3D.labelmaps2D.forEach( async (obj, idx) => {
        let firstSliceEmpty = Object.keys(firstSeg).length === 0
        if (firstSliceEmpty) {
          firstSeg = obj
          firstIdx = idx
        } else {
          let secondSliceEmpty = Object.keys(secondSeg).length === 0
          if (secondSliceEmpty) {
            secondIdx = idx;
            secondSeg = obj;

          } else {
            firstSeg = secondSeg;
            firstIdx = secondIdx;
            secondSeg = obj;
            secondIdx = idx;

          }

          await interpolationTool(
              element,
              activeLabelMaps3D,
              enabledSeries,
              firstIdx, firstSeg,
              secondIdx, secondSeg,
              nbInter, countInter
          )

        }
    })
    if (activeLabelMaps3D.metadata.length === 0) {

        const callbackNewSegment = (dicomDerived) => {
          const labelMapsList = getLabelMapList();
          let upload=false;
          callbackSegmentations(dicomDerived, upload);
          notification.show({
            title: 'Create Segments',
            message: "Ready to be modified, don't forget to save",
            type: 'success',
            duration: 9000,
          });
        }

        newSegment(
          enabledSeries,
          currentDisplaySet,
          enabledSeriesMeta,
          callbackNewSegment,
          true,
          activeLabelMaps3D,
        )
      }
      // else {
      //   console.log("Refresh segmentation ?")
      //
      //   refreshSegmentations()
      //   refreshViewports()
      // }

  };

  const inputRef = useRef(null);

  // console.log("Segmentation panel viewports: ", viewports)
  // const autoSegmentationComponent = AutoSegmentation(activeIndex, viewports, getCurrentDisplaySet(), callbackSegmentations)
  // console.log(autoSegmentationComponent)

  if (state.showSettings) {
    return (
      <SegmentationSettings
        disabledFields={isVTK() ? disabledConfigurationFields : []}
        configuration={configuration}
        onBack={() => setState(state => ({ ...state, showSettings: false }))}
        onChange={updateConfiguration}
      />
    );
  } else {
    return (
      <div
        className={classNames('dcmseg-segmentation-panel', {
          disabled: state.isDisabled,
        })}
      >
        {false && (
          <form className="selector-form">
            <BrushColorSelector
              defaultColor={state.brushColor}
              index={state.selectedSegment}
              onNext={incrementSegment}
              onPrev={decrementSegment}
            />
            <BrushRadius
              value={state.brushRadius}
              onChange={updateBrushSize}
              min={configuration.minRadius}
              max={configuration.maxRadius}
            />
          </form>
        )}
        <Icon
          className="cog-icon"
          name="cog"
          width="25px"
          height="25px"
          onClick={() => setState(state => ({ ...state, showSettings: true }))}
        />
        <h3>Segmentations</h3>
        <div className="segmentations">
          <SegmentationSelect
            value={selectedSegmentationOption}
            formatOptionLabel={SegmentationItem}
            options={state.labelMapList}
          />
        </div>

        <p style={{ fontSize: 'smaller' }}>
            Complementary tools
        </p>
        <button onClick={callInterpolationTool} className="ui-btn-hover-c" title='Save Changes on server'>
            &nbsp;
            <Icon name="brush" width="12px" height="12px"/>
            &nbsp;&nbsp;&nbsp; Inter-slices interpolation tool &nbsp;&nbsp;
        </button>

        <br style={{ margin: '3px' }} />

        <div className="SegmentsSection">
          <div className="header">
            <div>
              Add or load new segments.
            </div>
          </div>
            <br style={{ margin: '3px' }} />
            <table width="100%">
              <tbody>
                  <tr>
                    <td>
                        <button onClick={createSegment} className="ui-btn-hover-b" title='Add Segment'>
                          &nbsp;
                          <Icon name="plus" width="12px" height="12px" margins="10px"/>
                          &nbsp; New &nbsp;
                        </button>
                        &nbsp;
                        <button onClick={loadSegmentations} className="ui-btn-hover-b" title='Load segments'>
                          &nbsp;&nbsp;
                          <Icon name="rotate" width="12px" height="12px" margins="10px"/>
                          &nbsp; Start Loading Segments &nbsp;
                        </button>
                        <input
                          id="files"
                          width="20%"
                          className="ui-btn-hover-c"
                          type="file"
                          ref={inputRef }
                          multiple
                          size="1"
                        />

                    </td>
                  </tr>
              </tbody>
            </table>



            <p style={{ fontSize: 'smaller' }}>
                Synchronize server and download locally segments.
            </p>
            <button onClick={uploadSegmentations} className="ui-btn-hover-b" title='Save Changes on server'>
                &nbsp;
                <Icon name="save" width="12px" height="12px"/>
                &nbsp;&nbsp;&nbsp;&nbsp; Save changes on server &nbsp;&nbsp;
            </button>

            <button onClick={downloadSegment} className="ui-btn-hover-a" title='Download Segment'>
                &nbsp;
                <Icon name="angle-double-down" width="12px" height="12px" />
                &nbsp; Download segment locally &nbsp;
            </button>
            <br/>
        </div>

        <SegmentsSection
          count={state.segmentList.length}
          isVisible={
            state.segmentsHidden.filter(isHidden => isHidden === true).length <
            state.segmentNumbers.length
          }
          onVisibilityChange={onVisibilityChangeHandler}
        >
          <ScrollableArea>
            <TableList headless>{state.segmentList}</TableList>
          </ScrollableArea>
        </SegmentsSection>
        <br style={{ margin: '3px' }} />
        <div className="SegmentsSection">
          <div className="header">
            <div>
              Use semi-automatic segmentation. WIP
            </div>
          </div>
          <br style={{ margin: '3px' }} />
          <AutoSegmentation
            viewports={viewports}
            activeIndex={activeIndex}
            currentDisplaySet={getCurrentDisplaySet()}
            callback={callbackSegmentations}
          />
        </div>
      </div>
    );
  }
};


SegmentationPanel.propTypes = {
  /*
   * An object, with int index keys?
   * Maps to: state.viewports.viewportSpecificData, in `viewer`
   * Passed in MODULE_TYPES.PANEL when specifying component in viewer
   */
  viewports: PropTypes.shape({
    displaySetInstanceUID: PropTypes.string,
    frameRate: PropTypes.any,
    InstanceNumber: PropTypes.number,
    isMultiFrame: PropTypes.bool,
    isReconstructable: PropTypes.bool,
    Modality: PropTypes.string,
    plugin: PropTypes.string,
    SeriesDate: PropTypes.string,
    SeriesDescription: PropTypes.string,
    SeriesInstanceUID: PropTypes.string,
    SeriesNumber: PropTypes.any,
    SeriesTime: PropTypes.string,
    sopClassUIDs: PropTypes.arrayOf(PropTypes.string),
    StudyInstanceUID: PropTypes.string,
  }),
  activeIndex: PropTypes.number.isRequired,
  studies: PropTypes.array.isRequired,
  isOpen: PropTypes.bool.isRequired,
};
SegmentationPanel.defaultProps = {};

/**
 * Returns SEG DisplaySets that reference the target series, sorted by dateTime
 *
 * @param {string} StudyInstanceUID
 * @param {string} SeriesInstanceUID
 * @returns Array
 */
const _getReferencedSegDisplaysets = (StudyInstanceUID, SeriesInstanceUID) => {
  /* Referenced DisplaySets */
  const studyMetadata = studyMetadataManager.get(StudyInstanceUID);
  const referencedDisplaysets = studyMetadata.getDerivedDatasets({
    referencedSeriesInstanceUID: SeriesInstanceUID,
    Modality: 'SEG',
  });

  /* Sort */
  referencedDisplaysets.sort((a, b) => {
    const aNumber = Number(`${a.SeriesDate}${a.SeriesTime}`);
    const bNumber = Number(`${b.SeriesDate}${b.SeriesTime}`);
    return bNumber - aNumber;
  });

  return referencedDisplaysets;
};

const SegmentsSection = ({
  count,
  children,
  isVisible: defaultVisibility,
  onVisibilityChange,
}) => {
  const [isVisible, setIsVisible] = useState(defaultVisibility);

  const onVisibilityChangeHandler = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    onVisibilityChange(newVisibility);
  };

  useEffect(() => {
    setIsVisible(defaultVisibility);
  }, [defaultVisibility]);

  return (
    <div className="SegmentsSection">
      <div className="header">
        <div>Segments</div>
        <div className="icons">
          <Icon
            className={`eye-icon ${isVisible && 'expanded'}`}
            name={isVisible ? 'eye' : 'eye-closed'}
            width="20px"
            height="20px"
            onClick={onVisibilityChangeHandler}
          />
          <div className="count">{count}</div>
        </div>
      </div>
      {children}
    </div>
  );
};

const noop = () => {};

SegmentsSection.defaultProps = {
  onVisibilityChange: noop,
};



export default SegmentationPanel;
