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

const { setters, getters, state } = getModule('segmentation');
const segmentationModule = getModule('segmentation');
const cursors = cornerstoneTools.import('tools/cursors');
const modules = store.modules;
const globalToolStateManager = globalImageIdSpecificToolStateManager;


export default function xNatInterpolation(ctrsC1, ctrsC2, zInterp) {

    const dP = 0.2;

    const cumPerim1 = _getCumulativePerimeter(ctrsC1[0])
    const cumPerim2 = _getCumulativePerimeter(ctrsC2[0])

    const interpNodes = Math.max(
      Math.ceil(cumPerim1[cumPerim1.length - 1] / dP),
      Math.ceil(cumPerim2[cumPerim2.length - 1] / dP)
    );

    const cumPerim1Norm = _normalisedCumulativePerimeter(cumPerim1);
    const cumPerim2Norm = _normalisedCumulativePerimeter(cumPerim2);

    const numNodes1 = interpNodes + ctrsC2[0].length; // In XNAT code numNodes linked ctrsC2 - and same for numNodes2 linked to c1
    const numNodes2 = interpNodes + ctrsC1[0].length;

    // concatinate p && cumPerimNorm
    const perim1Interp = _getInterpolatedPerim(numNodes1, cumPerim1Norm);
    const perim2Interp = _getInterpolatedPerim(numNodes2, cumPerim2Norm);

    const perim1Ind = _getIndicatorArray(ctrsC1[0], numNodes1);
    const perim2Ind = _getIndicatorArray(ctrsC2[0], numNodes2);

    const nodesPerSegment1 = _getNodesPerSegment(perim1Interp, perim1Ind);
    const nodesPerSegment2 = _getNodesPerSegment(perim2Interp, perim2Ind);

    const c1i = _getSuperSampledContour(ctrsC1[0], nodesPerSegment1);
    const c2i = _getSuperSampledContour(ctrsC2[0], nodesPerSegment2);

    // Keep c2i fixed and shift the starting node of c1i to minimise the total length of segments.
    _shiftSuperSampledContourInPlace(c1i, c2i);
    const { c1Interp, c2Interp } = _reduceContoursToOriginNodes(c1i, c2i);



    const interpolated2DContour = _generateInterpolatedOpenContour(
      c1Interp,
      c2Interp,
      zInterp,
      ctrsC1[0].length > ctrsC2[0].length
    );

    return interpolated2DContour
}



function _getCumulativePerimeter(contour) {
  let cumulativePerimeter = [0];

  for (let i = 1; i < contour.length; i++) {
    const lengthOfSegment = Math.sqrt(
      (contour[i].x - contour[i - 1].x) ** 2 +
        (contour[i].y - contour[i-1].y) ** 2
    );

    cumulativePerimeter.push(cumulativePerimeter[i - 1] + lengthOfSegment);
  }

  return cumulativePerimeter;
}

function _normalisedCumulativePerimeter(cumPerim) {
  const cumPerimNorm = [];

  for (let i = 0; i < cumPerim.length; i++) {
    cumPerimNorm.push(cumPerim[i] / cumPerim[cumPerim.length - 1]);
  }

  return cumPerimNorm;
}

function _getInterpolatedPerim(numNodes, cumPerimNorm) {
  const diff = 1 / (numNodes - 1);
  const linspace = [diff];

  // Length - 2 as we are discarding 0 an 1 for efficiency (no need to calculate them).
  for (let i = 1; i < numNodes - 2; i++) {
    linspace.push(linspace[linspace.length - 1] + diff);
  }

  return linspace.concat(cumPerimNorm);
}


function _getIndicatorArray(contour, numNodes) {
  const perimInd = [];

  for (let i = 0; i < numNodes - 2; i++) {
    perimInd.push(false);
  }

  for (let i = 0; i < contour.length; i++) {
    perimInd.push(true);
  }

  return perimInd;
}


function _getNodesPerSegment(perimInterp, perimInd) {
  const idx = [];

  for (let i = 0; i < perimInterp.length; ++i) idx[i] = i;
  idx.sort(function(a, b) {
    return perimInterp[a] < perimInterp[b]
      ? -1
      : perimInterp[a] > perimInterp[b];
  });

  const perimIndSorted = [];

  for (let i = 0; i < perimInd.length; i++) {
    perimIndSorted.push(perimInd[idx[i]]);
  }

  const indiciesOfOriginNodes = perimIndSorted.reduce(function(
    arr,
    elementValue,
    i
  ) {
    if (elementValue) arr.push(i);
    return arr;
  },
  []);

  const nodesPerSegment = [];

  for (let i = 0; i < indiciesOfOriginNodes.length - 1; i++) {
    nodesPerSegment.push(
      indiciesOfOriginNodes[i + 1] - indiciesOfOriginNodes[i]
    );
  }

  return nodesPerSegment;
}


function _getSuperSampledContour(c, nodesPerSegment) {
  const ci = {
    x: [],
    y: [],
    I: [],
  };

  // Length - 1, produces 'open' polygon.
  for (let n = 0; n < c.length - 1; n++) {
    // Add original node.
    ci.x.push(c[n].x);
    ci.y.push(c[n].y);
    ci.I.push(true);

    // Add linerally interpolated nodes.
    const xSpacing = (c[n + 1].x - c[n].x) / (nodesPerSegment[n] + 1);
    const ySpacing = (c[n + 1].y - c[n].y) / (nodesPerSegment[n] + 1);

    // Add other nodesPerSegment - 1 other nodes (as already put in original node).
    for (let i = 0; i < nodesPerSegment[n] - 1; i++) {
      ci.x.push(ci.x[ci.x.length - 1] + xSpacing);
      ci.y.push(ci.y[ci.y.length - 1] + ySpacing);
      ci.I.push(false);
    }
  }

  return ci;
}


function _shiftSuperSampledContourInPlace(c1i, c2i) {
  const c1iLength = c1i.x.length;

  let optimal = {
    startingNode: 0,
    totalSquaredXYLengths: Infinity,
  };

  for (let startingNode = 0; startingNode < c1iLength; startingNode++) {
    let node = startingNode;

    // NOTE: 1) Ignore calculating Z, as the sum of all squared Z distances will always be a constant.
    // NOTE: 2) Don't need actual length, so don't worry about square rooting.
    let totalSquaredXYLengths = 0;

    for (let itteration = 0; itteration < c1iLength; itteration++) {
      totalSquaredXYLengths +=
        (c1i.x[node] - c2i.x[itteration]) ** 2 +
        (c1i.y[node] - c2i.y[itteration]) ** 2;

      node++;

      if (node === c1iLength) node = 0;
    }

    if (totalSquaredXYLengths < optimal.totalSquaredXYLengths) {
      optimal.totalSquaredXYLengths = totalSquaredXYLengths;
      optimal.startingNode = startingNode;
    }
  }

  let node = optimal.startingNode;

  _shiftCircularArray(c1i.x, node);
  _shiftCircularArray(c1i.y, node);
  _shiftCircularArray(c1i.I, node);
}

function _shiftCircularArray(arr, count) {
  count -= arr.length * Math.floor(count / arr.length);
  arr.push.apply(arr, arr.splice(0, count));
  return arr;
}

function _reduceContoursToOriginNodes(c1i, c2i) {
  const c1Interp = {
    x: [],
    y: [],
    I: [],
  };
  const c2Interp = {
    x: [],
    y: [],
    I: [],
  };

  for (let i = 0; i < c1i.x.length; i++) {
    if (c1i.I[i] || c2i.I[i]) {
      c1Interp.x.push(c1i.x[i]);
      c1Interp.y.push(c1i.y[i]);
      c1Interp.I.push(c1i.I[i]);

      c2Interp.x.push(c2i.x[i]);
      c2Interp.y.push(c2i.y[i]);
      c2Interp.I.push(c2i.I[i]);
    }
  }

  return {
    c1Interp,
    c2Interp,
  };
}

function _generateInterpolatedOpenContour(c1ir, c2ir, zInterp, c1HasMoreNodes) {
  const cInterp = {
    x: [],
    y: [],
  };

  const indicies = c1HasMoreNodes ? c1ir.I : c2ir.I;

  for (let i = 0; i < c1ir.x.length; i++) {
    if (indicies[i]) {
      cInterp.x.push((1 - zInterp) * c1ir.x[i] + zInterp * c2ir.x[i]);
      cInterp.y.push((1 - zInterp) * c1ir.y[i] + zInterp * c2ir.y[i]);
    }
  }

  return cInterp;
}
