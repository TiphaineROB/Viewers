import cornerstoneTools, {
  importInternal,
  getToolState,
  toolColors,
  getModule,
  globalImageIdSpecificToolStateManager,
  util,
} from 'cornerstone-tools';
import cornerstone from 'cornerstone-core';
import { UIModalService, UINotificationService, DICOMWeb }  from '@ohif/core';
import { api } from 'dicomweb-client';
import InterpolatorForm from '../components/InterpolatorForm/InterpolatorForm';
import TOOL_NAMES from './TOOL_NAMES';

const { CUSTOM_TOOL } = TOOL_NAMES;
const { setters, getters, state } = getModule('segmentation');
const segmentationModule = getModule('segmentation');
cornerstoneTools.init({ showSVGCursors: true });


// Cornerstone 3rd party dev kit imports
const BaseTool = importInternal('base/BaseTool');
const BaseBrushTool = importInternal('base/BaseBrushTool');

const cursors = cornerstoneTools.import('tools/cursors');

// import cv from 'opencv4nodejs';

import cv from "@techstark/opencv-js";

//console.log(BaseBrushTool)

/**
 * @class RTStructDisplayTool - Renders RTSTRUCT data in a read only manner (i.e. as an overlay).
 * @extends cornerstoneTools.BaseTool
 */
export default class CustomTool extends BaseBrushTool {
  constructor(props = {}) {
    const defaultProps = {
      mixins: ['activeOrDisabledBinaryTool'],
      supportedInteractionTypes: ['Mouse', 'Touch', 'DoubleTap'],
      name: CUSTOM_TOOL,
      referencedToolName: CUSTOM_TOOL,
      configuration: getDefaultCustomToolConfiguration(),
      svgCursor: cursors.circleRoiCursor,
      // alwaysEraseOnClick: true,
    };

    const initialProps = Object.assign(defaultProps, props);

    super(initialProps);
    this.referencedToolName = this.initialConfiguration.referencedToolName;

    // this.paintEventData = {
    //   labelmap2D: null,
    //   labelmap3D: null,
    //   shouldErase: false,
    //   previousPixelData: null,
    // }

    setters.radius(5)
    this.updateOnMouseMove = true;
    this._paint = this._paint.bind(this);
    // this.newImageCallback = this.newImageCallback.bind(this);
    this._drawingMouseUpCallback = this._drawingMouseUpCallback.bind(this);
    this._drawing = true;
    this.activeMouseUpCallback = this.activeMouseUpCallback.bind(this);
    //this._rtStructModule = cornerstoneTools.getModule('rtstruct');
  }



  renderBrush(evt) {
    console.log("renderBrush")
  }

  /**
   * Paints the data to the labelmap.
   *
   * @protected
   * @param  {Object} evt The data object associated with the event.
   * @returns {void}
   */
  _paint(evt) {
    // console.log("paint")
    const { configuration } = segmentationModule;
    const eventData = evt.detail;
    const element = eventData.element;
    const { rows, columns } = eventData.image;
    const { x, y } = eventData.currentPoints.image;

    if (x < 0 || x > columns || y < 0 || y > rows) {
      return;
    }

    const radius = configuration.radius;

    const pointerArray = getCircle(radius, rows, columns, x, y);
    //

    // const { labelmap2D, labelmap3D, shouldErase } = this.paintEventData;
    const labelmap2D = getters.labelmap2D(element)
    const labelmap3D = getters.labelmap3D(element)
    const shouldErase = false;

    this.paintEventData = {
      labelmap2D: labelmap2D,
      labelmap3D: labelmap3D,
      shouldErase: shouldErase,
      previousPixelData: labelmap2D.labelmap2D.pixelData,
    }

    // Draw / Erase the active color.
    drawBrushPixels(
      pointerArray,
      labelmap2D.labelmap2D.pixelData,
      labelmap3D.activeSegmentIndex,
      columns,
      shouldErase
    );
    cornerstone.updateImage(evt.detail.element);
  }

  newImageCallback(evt) {
    console.log("newImage event")
  }


  async _drawingMouseUpCallback(evt) {
    console.log("_drawingMouseUpCallback")
    // console.log(evt)
    var eventData = evt.detail;
    var element = eventData.element;

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

    var enabledFrameNumber = 1;


    const dicomWeb = new api.DICOMwebClient(config);
    var enabledSeries = await dicomWeb.retrieveSeriesMetadata({
        studyInstanceUID: enabledStudyInstanceUID,
        seriesInstanceUID: enabledSeriesInstanceUID,
    })

    for (var i = 0; i < enabledSeries.length; i++) {
      if (enabledSeries[i]["00080018"].Value[0].includes(enabledInstanceUID)) {
        enabledFrameNumber = i+1;
      }
    }

    const uiModalService = UIModalService.create({});
    const submit = async ( evt, enabledSeries, currentFrame, startInd, endInd ) => {

        uiModalService.hide()

        const element = evt.element;
        const { rows, columns } = evt.image;
        const initImage = cornerstone.getImage(element);

        const initLabelmap2D = getters.labelmap2D(element)
        const initLabelmap3D = getters.labelmap3D(element)


        const inversed = currentFrame-1===initLabelmap2D.currentImageIdIndex ? false : true;

        const start = startInd < endInd ? startInd : endInd;
        const end = endInd > startInd ? endInd : startInd;

        console.log("Browse : ", start, "::", end)

        for (var i = start; i <= end ; i++) {

          var indexImagei = undefined;
          var indexInstance = undefined;

          // console.log("i value :", i)
          var workingInstance = enabledSeries[i-1];
          indexImagei = i;
          if (workingInstance["00200013"].Value[0] !== i) // Check if correct instance
          {
            for (var j = 0; j < enabledSeries.length; j++){

              if (enabledSeries[j]["00200013"].Value[0]===i){
                workingInstance = enabledSeries[j];
                break;
              }
            }
          }

          indexInstance = workingInstance["00200013"].Value[0];


          const workingFrameRef = workingInstance["00080018"].Value[0]
          var workingImg;
          // console.log(workingFrameRef)
          for ( var j = 0; j < cornerstone.imageCache.cachedImages.length; j++ ){
            var workingImageId = cornerstone.imageCache.cachedImages[j].imageId
            var workingImg = cornerstone.imageCache.cachedImages[j]
            if (workingImageId.includes(workingFrameRef)) {
              break;
            }
          }


          indexInstance = indexInstance ? indexInstance : indexImagei;
          var indexImage = inversed===false ? indexInstance-1 : enabledSeries.length-indexInstance;
  //        console.log("indexImage after workingImg for", indexImage)

          if (workingImageId!==initImage.imageId)
          {
            await cornerstone.loadImage(workingImageId)
              .then(async image => {

                await cornerstone.displayImage(element, image)
                const newElement = cornerstone.getEnabledElementsByImageId(image.imageId)[0]

                // setters.labelmap3DForElement(
                //   newElement,
                //   initLabelmap3D.buffer,
                //   initLabelmap3D.metadata,
                // )


                //To get the labelmap2D of another image in the stack which is not currently displayed:
                const labelmap2DofImageIdIndex = getters.labelmap2DByImageIdIndex(
                  initLabelmap3D,
                  indexImage,
                  rows,
                  columns
                );



                // const newLabelmap2D = getters.labelmap2D(newElement.element)
                // const newLabelmap3D = getters.labelmap3D(newElement.element)

                // console.log(initLabelmap3D.activeSegmentIndex)
                // console.log("Before computeInterpolation : ", labelmap2DofImageIdIndex.pixelData.includes(initLabelmap3D.activeSegmentIndex))
                computeInterpolation(
                  initImage.getPixelData(),
                  initLabelmap2D.labelmap2D.pixelData,
                  image.getPixelData(),
                  labelmap2DofImageIdIndex.pixelData, //newLabelmap2D.labelmap2D.pixelData,//
                  initLabelmap3D.activeSegmentIndex,
                  rows,
                  columns,
                  this._configuration.radius,
                )
                //console.log("After computeInterpolation : ", labelmap2DofImageIdIndex.pixelData.includes(initLabelmap3D.activeSegmentIndex)) // =>> OK
                // const labelmap2DofImageIdIndex2 = getters.labelmap2DByImageIdIndex(
                //   initLabelmap3D,
                //   indexImage,
                //   rows,
                //   columns
                // );
                // console.log("Recup again labelmap2D frim imageidindex", labelmap2DofImageIdIndex2.pixelData.includes(initLabelmap3D.activeSegmentIndex)) // =>> OK
                // cornerstone.updateImage(newElement.element);
            });
          }
        }
    }

    uiModalService.show({
      content: InterpolatorForm,
      title: 'Propagate segmentation',
      contentProps: {
        event: eventData,
        onSubmit: submit,
        currentIndex: enabledFrameNumber,
        max: enabledSeries.length,
        enabledSeries: enabledSeries,
      },
      customClassName: 'interpolatorForm',
      shouldCloseOnEsc: true,
      onClose: () => {
        console.log(' Close Interpolator Form')
      }
    })
    //this._endPainting(evt);

    this._drawing = false;
    this._mouseUpRender = true;
    this._stopListeningForMouseUp(element);
  }

  activeMouseUpCallback(evt) {
    console.log("Active Mouse Up Callback")
  }

  activeCallback(evt) {
   console.log(`Hello element!`);
  }
  disabledCallback(evt) {
   console.log(`Goodbye element!`);
  }
 //
 // preMouseDownCallback(evt) {
 //   this._paint(evt)
 // }
 // postMouseDownCallback(evt) {
 //    console.log('Goodbye cornerstoneTools!');
 // }
 // mouseDragCallback(evt) {
 //   console.log("Mouse Down")
 // }

}

function getDefaultCustomToolConfiguration() {
  return {
    mouseLocation: {
      handles: {
        start: {
          highlight: true,
          active: true,
        },
      },
    },
    minSpacing: 1,
    currentTool: null,
    dragColor: 'greenyellow',
    hoverColor: 'white',
    radius: 5,

    /* --- Hover options ---
    showCursorOnHover:        Shows a preview of the sculpting radius on hover.
    limitRadiusOutsideRegion: Limit max toolsize outside the subject ROI based
                              on subject ROI area.
    hoverCursorFadeAlpha:     Alpha to fade to when tool very distant from
                              subject ROI.
    hoverCursorFadeDistance:  Distance from ROI in which to fade the hoverCursor
                              (in units of radii).
    */
    showCursorOnHover: true,
    limitRadiusOutsideRegion: true,
    hoverCursorFadeAlpha: 0.5,
    hoverCursorFadeDistance: 1.2,
  };
}



/**
 * DrawBrushPixels - Adds or removes labels to a labelmap.
 *
 * @param  {number[]} pointerArray      The array of pixels to paint.
 * @param  {Object} labelmap2D          The `pixelData` array to paint to.
 * @param  {number} segmentIndex        The segment being drawn.
 * @param  {number} columns             The number of columns in the image.
 * @param  {boolean} shouldErase = false Whether we should erase rather than color pixels.
 * @returns {null}
 */
function drawBrushPixels(
  pointerArray,
  pixelData,
  segmentIndex,
  columns,
  shouldErase = false
) {
  const getPixelIndex = (x, y) => y * columns + x;

  pointerArray.forEach(point => {
    const spIndex = getPixelIndex(...point);
    // console.log("Coordinates to idx", point, spIndex)
    // if (shouldErase) {
    //   eraseIfSegmentIndex(spIndex, pixelData, segmentIndex);
    // } else {
    pixelData[spIndex] = segmentIndex;
    // }
  });
}

/**
 * Gets the pixels within the circle.
 *
 * @param  {number} radius     The radius of the circle.
 * @param  {number} rows       The number of rows.
 * @param  {number} columns    The number of columns.
 * @param  {number} [xCoord = 0] The x-location of the center of the circle.
 * @param  {number} [yCoord = 0] The y-location of the center of the circle.
 * @returns {Array.number[]}        Array of pixels contained within the circle.
 */
function getCircle(
  radius,
  rows,
  columns,
  xCoord = 0,
  yCoord = 0
) {
  const x0 = Math.floor(xCoord);
  const y0 = Math.floor(yCoord);

  if (radius === 1) {
    return [[x0, y0]];
  }

  const circleArray = [];
  let index = 0;

  for (let y = -radius; y <= radius; y++) {
    const yCoord = y0 + y;

    if (yCoord > rows || yCoord < 0) {
      continue;
    }

    for (let x = -radius; x <= radius; x++) {
      const xCoord = x0 + x;

      if (xCoord >= columns || xCoord < 0) {
        continue;
      }

      if (x * x + y * y < radius * radius) {
        circleArray[index++] = [x0 + x, y0 + y];
      }
    }
  }

  return circleArray;
}


/**
 * @param  {number[]} arr     compute average on this array
 * @returns {number}
*/
function computeAverage(arr){
  var sum = arr.reduce((a, b) => a + b, 0);
  var avg = (sum / arr.length) || 0;
  return avg
}

/**
 * ComputeInterpolation - Adds or removes labels to a labelmap.
 *
 * @param  {number[]} prevPixelData      The slice data.
 * @param  {Object} prevSegPixelData      The `pixelData` array to compute interpolation.
 * @param  {number[]} newPixelData          The `pixelData` array to paint to.

 * @param  {Object} newSegPixelData          The `pixelData` array to paint to.
 * @param  {number} segmentIndex        The segment being drawn.
 * @param  {number} columns             The number of columns in the image.
 * @returns {null}
 */
function computeInterpolation(
  prevPixelData,
  prevSegPixelData,
  newPixelData,
  newSegPixelData,
  segmentIndex,
  columns,
  rows,
  radius,
) {


  console.log("Compute Interpolation")
  console.log("OPENCV OEBJECT", cv)


  const getPixelCoord = (idx) => [ idx % columns, Math.trunc(idx / columns)] ;
  const getPixelCoordMirror = (idx) => [ Math.trunc(idx / columns), idx % columns] ;
  const getPixelIndex = (x, y) => y * columns + x;

  var indexes = []
  var insideVals = []
  var coords = []
  for (let index = 0; index < prevSegPixelData.length; index++) {
    if (prevSegPixelData[index] === 1) {
      indexes.push(index);
      insideVals.push(prevPixelData[index])
      coords.push(getPixelCoord(index))
    }
  }


  const mat = cv.matFromArray(columns, rows, cv.CV_8UC1, prevSegPixelData);
  const matPixels = cv.matFromArray(columns, rows, cv.CV_64F, prevPixelData);
  const matPixelsNew = cv.matFromArray(columns, rows, cv.CV_64F, prevPixelData);

  // Center SEG
  const ctrsMoments = cv.moments(mat)
  var cx;
  var cy;
  if (ctrsMoments['m00'] != 0) {
      cx = parseInt(ctrsMoments['m10']/ctrsMoments['m00'])
      cy = parseInt(ctrsMoments['m01']/ctrsMoments['m00'])
  }


  // Get contours for segmentation - and outside contours
  var contours = new cv.MatVector();
  const hierarchy = new cv.Mat;
  const points = {}
  var outsideCtrs = [];
  var outsideVals = [];

  cv.findContours(mat, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_NONE)

  for (let i = 0; i < contours.size(); ++i) {
     const ci = contours.get(i)
     points[i] = []
     for (let j = 0; j < ci.data32S.length; j += 2){
       let p = {}
       p.x = ci.data32S[j]
       p.y = ci.data32S[j+1]
       points[i].push(p)

       const spIndex = getPixelIndex(p.x, p.y);
       for (var xrad=0; xrad<=radius; xrad++){
         for (var yrad=0; yrad<=radius; yrad++){
           var testIdx = getPixelIndex(p.x+xrad, p.y+yrad)
           var  found = indexes.some( idx => testIdx===idx)
           if ( found ){
             console.log("Is this always false ?")
             outsideCtrs.push([p.x+xrad, p.y+yrad])
             outsideVals.push(prevPixelData[testIdx])
           }
           testIdx = getPixelIndex(p.x-xrad, p.y-yrad)
           found = indexes.some( idx => testIdx===idx)
           if ( indexes.includes(testIdx)===false){
             console.log("Is this always false ?")
             outsideCtrs.push([p.x+xrad, p.y+yrad])
             outsideVals.push(prevPixelData[testIdx])
           }
         }
       }
     }
   }

   console.log("Contours computed")
   // We have here : outsideCtrs/Vals, contours points contours seg, indexes

   // Params Sobel
   var [ degreeX, degreeY, sizeKernel, scale, delta ] = [ 1, 1, -1, 1, 0]

   let sobelX = new cv.Mat();
   let sobelY = new cv.Mat();

   const matInsideVals = cv.matFromArray(columns, rows, cv.CV_64F, insideVals);
   const matOutsideVals = cv.matFromArray(columns, rows, cv.CV_64F, outsideVals);

   cv.Sobel(matInsideVals, sobelX, cv.CV_64F, degreeX, 0, sizeKernel, scale, delta, cv.BORDER_DEFAULT);
   cv.Sobel(matInsideVals, sobelY, cv.CV_64F, 0, degreeY, sizeKernel, scale, delta, cv.BORDER_DEFAULT);
   const gradientsSegX = sobelX.data64F, gradientsSegY = sobelY.data64F;

   cv.Sobel(matOutsideVals, sobelX, cv.CV_64F, degreeX, 0, sizeKernel, scale, delta, cv.BORDER_DEFAULT);
   cv.Sobel(matOutsideVals, sobelY, cv.CV_64F, 0, degreeY, sizeKernel, scale, delta, cv.BORDER_DEFAULT);
   const gradientsOutX = sobelX.data64F, gradientsOutY = sobelY.data64F;

   console.log("Sobel computed")

   var insideMagnitudes = [], outsideMagnitudes = [];
   var insideOrientations = [], outsideOrientations = [];

   insideVals.forEach( (val, index) => {
     var mag = Math.sqrt ( Math.pow(gradientsSegX[index], 2) + Math.pow(gradientsSegY[index], 2) )
     insideMagnitudes.push(mag)
     var artan = Math.atan2(gradientsSegX[index], gradientsSegY[index])
     insideOrientations.push(artan*(180 / Math.PI) % 180)
   })

   outsideVals.forEach( (val, index) => {
     var mag = Math.sqrt ( Math.pow(gradientsOutX[index], 2) + Math.pow(gradientsOutY[index], 2) )
     outsideMagnitudes.push(mag)
     var artan = Math.atan2(gradientsOutX[index], gradientsOutY[index])
     outsideOrientations.push(artan*(180 / Math.PI) % 180)
   })

   console.log("---- Info Inside Segmentation")
   console.log("Size seg : ", insideVals.length)
   console.log("Average : ", computeAverage(insideVals), " Min : ", Math.min(...insideVals), " Max: ", Math.max(...insideVals))
   console.log("Magnitudes average : ", computeAverage(insideMagnitudes))
   console.log("Magnitude Min : ", Math.min(...insideMagnitudes), " Max: ", Math.max(...insideMagnitudes))

   console.log("---- Info Outside Segmentation")
   console.log("Size : ",  outsideVals.length)
   console.log("Average : ", computeAverage(outsideVals), " Min : ", Math.min(...outsideVals), " Max: ", Math.max(...outsideVals))
   console.log("Magnitudes average : ", computeAverage(outsideMagnitudes))
   console.log("Magnitude Min : ", Math.min(...outsideMagnitudes), " Max: ", Math.max(...outsideMagnitudes))


   // outsideCtrs.forEach( ())

   // Remove all opencv mat
   mat.delete()
   matPixels.delete()
   matPixelsNew.delete()
   contours.delete()
   hierarchy.delete()
}
