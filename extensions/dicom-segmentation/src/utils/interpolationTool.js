import cornerstoneTools, {
  importInternal,
  getToolState,
  toolColors,
  getModule,
  globalImageIdSpecificToolStateManager,
  util,
  store,
} from 'cornerstone-tools';
import cornerstone from 'cornerstone-core';
import { UIModalService, UINotificationService, DICOMWeb }  from '@ohif/core';
import { api } from 'dicomweb-client';
import InterpolatorForm from '../components/InterpolatorForm/InterpolatorForm';

const { setters, getters, state } = getModule('segmentation');
const segmentationModule = getModule('segmentation');
const cursors = cornerstoneTools.import('tools/cursors');
const modules = store.modules;
const globalToolStateManager = globalImageIdSpecificToolStateManager;

// import cv from 'opencv4nodejs';

import cv from "@techstark/opencv-js";


import xNatInterpolation from './xNatInterpolation.js';


export default async function interpolationTool (
  element,
  activeLabelMaps3D,
  enabledSeries,
  C1Idx,
  C1Seg,
  C2Idx,
  C2Seg,
  nbInter,
  countInter,
) {

  countInter +=1

  // console.log("Segment of slices number : ", countInter, " / ", nbInter)


  var C1Data = await _getPixelData(enabledSeries, C1Idx)
  var C2Data = await _getPixelData(enabledSeries, C2Idx)

  for ( var i = C1Idx+1; i < C2Idx; i++ ) {
    console.log("Interpolating slice idx ", i+1, "...")

    //console.log("Need data of slice to interpolate")
    var workingInstance = enabledSeries[i];
    const workingFrameRef = workingInstance["00080018"].Value[0];
    var workingImg;
    for ( var j = 0; j < cornerstone.imageCache.cachedImages.length; j++ ){
      var workingImageId = cornerstone.imageCache.cachedImages[j].imageId
      var workingImg = cornerstone.imageCache.cachedImages[j]
      if (workingImageId.includes(workingFrameRef)) {
        break;
      }
    }

    await cornerstone.loadImage(workingImageId)
      .then(async image => {

        await cornerstone.displayImage(element, image)
        event.preventDefault()

        const { rows, columns } = image;

        const labelmap2DofImageIdIndex = getters.labelmap2DByImageIdIndex(
          activeLabelMaps3D,
          i,
          rows,
          columns
        );

        const metadata = {
          seriesInstanceUid: enabledSeries.SeriesInstanceUID,
          structureSetUid:enabledSeries.StudyInstanceUID,
          ROIContourUid: image.imageId.split('/')[6]
        }

        _computeInterpolation(
          C1Idx,
          C1Data,
          C1Seg.pixelData,
          C2Idx,
          C2Data,
          C2Seg.pixelData,
          i,
          image.getPixelData(),
          labelmap2DofImageIdIndex.pixelData, //newLabelmap2D.labelmap2D.pixelData,//
          activeLabelMaps3D.activeSegmentIndex,
          image,
          rows,
          columns,
          5,
          metadata
        )
    });
  }
}


async function _getPixelData( series, idx){
  var instance = series[idx];
  var uid = instance["00080018"].Value[0]
  var image = cornerstone.imageCache.cachedImages.filter( tmp => tmp.imageId.includes(uid))[0]
  var data = await cornerstone.loadImage(image.imageId).then(
      async tmp => {
        return tmp.getPixelData()
    })
  return data;

}


function _getContoursPoints(mat2Ctr, approx = cv.CHAIN_APPROX_SIMPLE){

  // Get contours for segmentation - and outside contours
  var contours = new cv.MatVector();
  const hierarchy = new cv.Mat;
  // var contoursC1Data = new cv.MatVector(), hierarchyC1Data = new cv.Mat;
  // var contoursNewData = new cv.MatVector(), hierarchyNewData = new cv.Mat;

  const points = [];
  // var outsideCtrs = [];
  // var outsideVals = [];
  // var contoursVals = [];
  // var contoursIdx = [];
  //
  cv.findContours(mat2Ctr, contours, hierarchy, cv.RETR_CCOMP, approx)

  for (let i = 0; i < contours.size(); ++i) {
     const ci = contours.get(i)
     points[i] = []
     for (let j = 0; j < ci.data32S.length; j += 2){
       let p = {}
       p.x = ci.data32S[j]
       p.y = ci.data32S[j+1]
       points[i].push(p)

       //
       // const spIndex = getPixelIndex(p.x, p.y);
       // for (var xrad=1; xrad<=radius; xrad++){
       //   for (var yrad=1; yrad<=radius; yrad++){
       //     var testIdx = getPixelIndex(p.x+xrad, p.y+yrad)
       //     var  found = indexes.some( idx => testIdx===idx)
       //     if ( found === false ){
       //       // console.log("Is this always false ?")
       //       outsideCtrs.push([p.x+xrad, p.y+yrad])
       //       outsideVals.push(C1PixelData[testIdx])
       //     }
       //     testIdx = getPixelIndex(p.x-xrad, p.y-yrad)
       //     found = indexes.some( idx => testIdx===idx)
       //     if ( found ===false ){
       //       // console.log("Is this always false ?")
       //       outsideCtrs.push([p.x+xrad, p.y+yrad])
       //       outsideVals.push(C1PixelData[testIdx])
       //     }
       //   }
       // }
       // testIdx = getPixelIndex(p.x, p.y)
       // contoursVals.push(C1PixelData[testIdx])
       // contoursIdx.push(testIdx)
       // newSegPixelData[testIdx] = segmentIndex;
     }
   }

   contours.delete()
   hierarchy.delete()
   return points;

}


function _getCenterSeg(matSeg) {
  // Center SEG
  const ctrsMoments = cv.moments(matSeg)
  var cx;
  var cy;
  if (ctrsMoments['m00'] != 0) {
      cx = parseInt(ctrsMoments['m10']/ctrsMoments['m00'])
      cy = parseInt(ctrsMoments['m01']/ctrsMoments['m00'])
  }
  return {cx: cx, cy: cy}
}

function _getMagnitudesOrientations(mat, arr) {
  // Params Sobel
  var [ degreeX, degreeY, sizeKernel, scale, delta ] = [ 1, 1, -1, 1, 0]

  let sobelX = new cv.Mat();
  let sobelY = new cv.Mat();

  cv.Sobel(mat, sobelX, cv.CV_64F, degreeX, 0, sizeKernel, scale, delta, cv.BORDER_DEFAULT);
  cv.Sobel(mat, sobelY, cv.CV_64F, 0, degreeY, sizeKernel, scale, delta, cv.BORDER_DEFAULT);
  const gradientsX = sobelX.data64F, gradientsY = sobelY.data64F;

  var magnitudes = [], orientations = [];

  arr.forEach( (val, index) => {
    var mag = Math.sqrt ( Math.pow(gradientsX[index], 2) + Math.pow(gradientsY[index], 2) )
    magnitudes.push(mag)
    var artan = Math.atan2(gradientsX[index], gradientsY[index])
    orientations.push(artan*(180 / Math.PI) % 180)
  })


  sobelX.delete()
  sobelY.delete()

  return [ magnitudes, orientations ];

}

function _getOrientationInterval(or) {
  if ( -180 <= or  && or < -135 ) {
    return 0;
  } else if ( -135 <= or  && or < -90 ) {
    return 1;
  } else if ( -90 <= or  && or < -45 ) {
    return 2;
  } else if ( -45 <= or  && or < 0 ) {
    return 3;
  } else if ( 0 <= or  && or < 45 ) {
    return 4;
  } else if ( 45 <= or  && or < 90 ) {
    return 5;
  } else if ( 90 <= or  && or < 135 ) {
    return 6;
  } else if ( 135 <= or  && or <= 180 ) {
    return 7;
  }
}

function _getOrientationIntervals() {
  return { 0: "-180-135", 1: "-135-90", 2: "-90-45", 3: "-45-0", 4: "0-45",
          5: "45-90", 6: "90-135", 7: "135-180" }
}

function _getInfoContours(contours, magnitudes, orientations, columns) {

  var processingCtr = {};
  Object.entries(_getOrientationIntervals()).forEach( ([key, interval]) => {
    processingCtr[key] = {
      tab: [],
      avg: 0,
      interval: interval,
    }
  })

  contours.forEach( point => {
    const spIndex = point.y * columns + point.x;
    var mag = magnitudes[spIndex], or = orientations[spIndex];
    processingCtr[_getOrientationInterval(or)].tab.push(mag)
  })

  Object.entries(_getOrientationIntervals()).forEach( ([key, interval]) => {
    processingCtr[key].avg = computeAverage(processingCtr[key].tab)
  })

  return processingCtr;
}




/**
 * ComputeInterpolation - Adds or removes labels to a labelmap.
 *
 * @param  {number[]} C1PixelData      The slice data.
 * @param  {Object} C1SegPixelData      The `pixelData` array to compute interpolation.
 * @param  {number[]} C2PixelData      The slice data.
 * @param  {Object} C2SegPixelData      The `pixelData` array to compute interpolation.
 * @param  {number[]} newPixelData          The `pixelData` array to paint to.
 * @param  {Object} newSegPixelData          The `pixelData` array to paint to.
 * @param  {number} segmentIndex        The segment being drawn.
 * @param  {Object} image
 * @param  {number} columns             The number of columns in the image.
 * @returns {null}
 */

function _computeInterpolation(
  C1Idx,
  C1PixelData,
  C1SegPixelData,
  C2Idx,
  C2PixelData,
  C2SegPixelData,
  newIdx,
  newPixelData,
  newSegPixelData,
  segmentIndex,
  image,
  rows,
  columns,
  radius,
  metadata,
) {

  var threshold = 50, dP=0.2, sizeMinCi = 50;

  const getPixelCoord = (idx) => [ idx % columns, Math.trunc(idx / columns)] ;
  const getPixelCoordMirror = (idx) => [ Math.trunc(idx / columns), idx % columns] ;
  const getPixelIndex = (x, y) => y * columns + x;


  // Matrices of segs and pixels
  const matSegC1 = cv.matFromArray(rows, columns, cv.CV_8UC1, C1SegPixelData);
  const matPixelsC1 = cv.matFromArray(rows, columns, cv.CV_8UC1, C1PixelData);

  const matSegC2 = cv.matFromArray(rows, columns, cv.CV_8UC1, C2SegPixelData);
  const matPixelsC2 = cv.matFromArray(rows, columns, cv.CV_8UC1, C2PixelData);

  const matPixelsInter = cv.matFromArray(rows, columns, cv.CV_8UC1, newPixelData);
  // Get contours points

  const ctrsC1 = _getContoursPoints(matSegC1);
  const ctrsC2 = _getContoursPoints(matSegC2);


  // XNAT Technique
  const zInterp = (newIdx - C1Idx) / (C2Idx - C1Idx);
  const xNatInterpolation2DContour = xNatInterpolation(ctrsC1, ctrsC2, zInterp)

  var interpolated2DContour = [];
  for (var i = 0; i < xNatInterpolation2DContour.x.length; i++) {
    //const spIndex = getPixelIndex(parseInt(xNatInterpolation2DContour.x[i]),parseInt(xNatInterpolation2DContour.y[i]) )
    interpolated2DContour.push({x: parseInt(xNatInterpolation2DContour.x[i]), y:parseInt(xNatInterpolation2DContour.y[i])})
    //newSegPixelData[spIndex] = segmentIndex;
  }

  // ---------------------- Add gradients filter

//  console.log("OPENCV OEBJECT", cv)

  // Threshold on mats
  // No need of : cv.cvtColor(matPixels, matPixels, cv.COLOR_RGBA2GRAY, 0);
  cv.threshold(matPixelsC1, matPixelsC1, 150, 200, cv.THRESH_BINARY);
  cv.threshold(matPixelsC2, matPixelsC2, 150, 200, cv.THRESH_BINARY);
  cv.threshold(matPixelsInter, matPixelsInter, 150, 200, cv.THRESH_BINARY);

  const gradientsC1 = _getContoursPoints(matPixelsC1, cv.CHAIN_APPROX_NONE);
  const gradientsC2 = _getContoursPoints(matPixelsC2, cv.CHAIN_APPROX_NONE);
  const gradientsInter = _getContoursPoints(matPixelsInter, cv.CHAIN_APPROX_NONE)


  const [ magnitudesC1, orientationsC1 ] = _getMagnitudesOrientations(matPixelsC1, C1PixelData)
  const [ magnitudesC2, orientationsC2 ] = _getMagnitudesOrientations(matPixelsC2, C2PixelData)
  const [ magnitudesInter, orientationsInter ] = _getMagnitudesOrientations(matPixelsInter, newPixelData)

  const processingCtrC1 = _getInfoContours(ctrsC1[0], magnitudesC1, orientationsC1, columns)
  const processingCtrC2 = _getInfoContours(ctrsC2[0], magnitudesC2, orientationsC2, columns)

  // console.log(processingCtrC1, processingCtrC2)

  //console.log(gradientsInter)
  var ci;

  // console.log(interpolated2DContour)
  const vertices = interpolated2DContour.map(a => [a.x, a.y]);
  // console.log(vertices)
  const [topLeft, bottomRight] = getBoundingBoxAroundPolygon(vertices, image);
  // console.log(topLeft, bottomRight)

  var cis = []

  for (var i = 0; i < gradientsInter.length; i++) {
      ci = gradientsInter[i];

      // First filter --> size ci
      if (ci.length > sizeMinCi) {
        for (let j = 0; j < ci.length; j += 2){
          let p = {}
          var { x, y } = ci[j]
          // console.log("Point in polygons : ", isPointInPolygon([x, y], vertices))
          // console.log(x, y)
          if (isPointInPolygon([x, y], vertices) === true) {
            cis.push(ci)
            break;
          }
        }
      }
  }

//  console.log(cis)

  // Draw contours and fill shape

  // --- working
  fillFreehand(image, interpolated2DContour, segmentIndex, newSegPixelData, columns)

  // --- other test
  cis.forEach( ci => {
    var interpolatedFilter2DContour = []
    // console.log(ci)
    ci.forEach( point => {
      // console.log(point)
      const spIndex = getPixelIndex(point.x, point.y)
      // console.log(spIndex)
      var averageOrC1 = processingCtrC1[_getOrientationInterval(orientationsInter[spIndex])].avg;
      var averageOrC2 = processingCtrC2[_getOrientationInterval(orientationsInter[spIndex])].avg;

      // console.log(magnitudesInter[spIndex])
      var thresholdResultC1 = magnitudesInter[spIndex] > averageOrC1-threshold && magnitudesInter[spIndex] < averageOrC1 +threshold ? true : false;
      var thresholdResultC2 = magnitudesInter[spIndex] > averageOrC2-threshold && magnitudesInter[spIndex] < averageOrC2 +threshold ? true : false;

      // console.log(thresholdResultC1, thresholdResultC2)
      if (thresholdResultC1===true || thresholdResultC2===true){
        interpolatedFilter2DContour.push({x: point.x, y: point.y})
      }

    })
    // console.log(interpolatedFilter2DContour)
  //  fillFreehand(image, interpolatedFilter2DContour, segmentIndex, newSegPixelData, columns)

  })


  // Erosion

  const matSegInter = cv.matFromArray(rows, columns, cv.CV_8UC1, newSegPixelData);
  let dst = new cv.Mat();
  let M = cv.Mat.ones(10, 10, cv.CV_8U);
  let anchor = new cv.Point(-1, -1);
  // You can try more different parameters
  //cv.morphologyEx(matSegInter, matSegInter, cv.MORPH_CLOSE, M);
  //cv.erode(matSegInter, matSegInter, M, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
  //cv.dilate(matSegInter, matSegInter, M, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
  cv.morphologyEx(matSegInter, matSegInter, cv.MORPH_OPEN, M);
  // matSegInter.data8S.forEach( (val, idx) => {
  //   newSegPixelData[idx] = val;
  // })

  // Remove all opencv mat

  matSegC1.delete()
  matPixelsC1.delete()
  matSegC2.delete()
  matPixelsC2.delete()
  matPixelsInter.delete()
  matSegInter.delete()
  M.delete()
  dst.delete()

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
 * Fill all pixels labeled with the activeSegmentIndex,
 * inside/outside the region defined by the shape.
 * @param  {number} segmentIndex
 * @param {number[]}  pixelData
 * @param {Object} pointInShape - A function that checks if a point, x,y is within a shape.
 * @param {number[]} topLeft The top left of the bounding box.
 * @param {number[]} bottomRight The bottom right of the bounding box.
 * @returns {null}
 */
function fillShape(
  segmentIndex,
  pixelData,
  pointInShape,
  topLeft,
  bottomRight,
  columns,
  insideOrOutside = 'inside'
) {

  const [xMin, yMin] = topLeft;
  const [xMax, yMax] = bottomRight;

  for (let x = xMin; x < xMax; x++) {
    for (let y = yMin; y < yMax; y++) {
      const pixelIndex = y * columns + x;

      // If the pixel is the same segmentIndex and is inside the
      // Region defined by the array of points, set their value to segmentIndex.
      if (
        pointInShape({
          x,
          y,
        })
      ) {
        pixelData[pixelIndex] = segmentIndex;
      }
    }
  }
}

/**
 * Fill all pixels inside/outside the region defined by
 * `operationData.points` with the `activeSegmentIndex` value.
 * @param  {} image
 * @param  {} points
 * @param  {} segmentIndex
 * @param  {} pixelData
 * @param  {} columns
 * @returns {null}
 */
function fillFreehand(image, points, segmentIndex, pixelData, columns) {
  // const { points, segmentationMixinType } = operationData;

  // Obtain the bounding box of the entire drawing so that
  // we can subset our search. Outside of the bounding box,
  // everything is outside of the polygon.
  const vertices = points.map(a => [a.x, a.y]);
  const [topLeft, bottomRight] = getBoundingBoxAroundPolygon(vertices, image);

  fillShape(
      segmentIndex,
      pixelData,
      point => isPointInPolygon([point.x, point.y], vertices),
      topLeft,
      bottomRight,
      columns,
    )

}

function getBoundingBoxAroundPolygon(vertices, image) {
  let xMin = Infinity;
  let xMax = 0;
  let yMin = Infinity;
  let yMax = 0;
  const { width, height } = image;

  vertices.forEach(v => {
    xMin = Math.min(v[0], xMin);
    xMax = Math.max(v[0], xMax);
    yMin = Math.min(v[1], yMin);
    yMax = Math.max(v[1], yMax);
  });

  xMin = Math.floor(xMin);
  yMin = Math.floor(yMin);
  xMax = Math.floor(xMax);
  yMax = Math.floor(yMax);

  xMax = Math.min(width, xMax);
  xMin = Math.max(0, xMin);
  yMax = Math.min(height, yMax);
  yMin = Math.max(0, yMin);

  return [[xMin, yMin], [xMax, yMax]];
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
 * Checks whether a point is inside a polygon
 *
 * {@link https://github.com/substack/point-in-polygon/blob/master/index.js}
 * ray-casting algorithm based on
 * {@link http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html}
 *
 * @param {Array} point The point [x1, y1]
 * @param {Array} vs The vertices [[x1, y1], [x2, y2], ...] of the Polygon
 * @returns {boolean}
 */
function isPointInPolygon(point, vs) {
  const x = point[0];
  const y = point[1];
  let inside = false;

  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0];
    const yi = vs[i][1];

    const xj = vs[j][0];
    const yj = vs[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}
