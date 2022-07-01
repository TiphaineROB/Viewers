var indexes = []
var values = []
var coords = []
for (let index = 0; index < prevSegPixelData.length; index++) {
  if (prevSegPixelData[index] === 1) {
    indexes.push(index);

    //newSegPixelData[index] = segmentIndex; // for simple copy
    values.push(prevPixelData[index])
    coords.push(getPixelCoord(index))
  }
}

// console.log(columns, rows, prevPixelData.length, prevSegPixelData.length)
var contours = new cv.MatVector();
const hierarchy = new cv.Mat;
const mat = cv.matFromArray(columns, rows, cv.CV_8UC1, prevSegPixelData);
const matPixels = cv.matFromArray(columns, rows, cv.CV_64F, prevPixelData)
cv.findContours(mat, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_NONE)


const points = {}
var outsideCtrs = [];
var outsideVals = [];

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
         if ( indexes.includes(testIdx)===false){
           outsideCtrs.push([p.x+xrad, p.y+yrad])
           outsideVals.push(prevPixelData[testIdx])
         }
         testIdx = getPixelIndex(p.x-xrad, p.y-yrad)
         if ( indexes.includes(testIdx)===false){
           outsideCtrs.push([p.x+xrad, p.y+yrad])
           outsideVals.push(prevPixelData[testIdx])
         }
       }
     }
   }
 }

 let dstx = new cv.Mat();
 let dsty = new cv.Mat();
 cv.Sobel(matPixels, dstx, cv.CV_64F, 3, 0, 5, 3, 0, cv.BORDER_DEFAULT);
 cv.Sobel(matPixels, dsty, cv.CV_64F, 0, 3, 5, 3, 0, cv.BORDER_DEFAULT);

 const resultsSobelX = dstx.data64F;
 const resultsSobelY = dsty.data64F;

 // # compute the gradient magnitude and orientation
 var magnitudes = [];
 var orientations = [];
 var ctrsSobelX = [];
 var ctrsSobelY = [];
 points[0].forEach(point => {
    const spCtrs = getPixelIndex(point.x, point.y)

    var mag = Math.sqrt ( Math.pow(resultsSobelX[spCtrs], 2) + Math.pow(resultsSobelY[spCtrs], 2) )
    magnitudes.push(Math.sqrt(mag))
    var artan = Math.atan2(resultsSobelX[spCtrs], resultsSobelY[spCtrs])
    orientations.push(artan*(180 / Math.PI) % 180)
    ctrsSobelX.push(resultsSobelX[spCtrs])
    ctrsSobelY.push(resultsSobelY[spCtrs])

 })

 console.log(magnitudes)
 console.log(orientations)
 const sumMag = magnitudes.reduce((a, b) => a + b, 0);
 const avgMagnitude = (sumMag / magnitudes.length) || 0;

 console.log(ctrsSobelX)
 console.log(ctrsSobelY)

 const sumSobelX = ctrsSobelX.reduce((a, b) => a + b, 0);
 const avgSobelX = (sumSobelX / ctrsSobelX.length) || 0;
 const sumSobelY = ctrsSobelY.reduce((a, b) => a + b, 0);
 const avgSobelY = (sumSobelY / ctrsSobelY.length) || 0;
 const minMagnitude = Math.min(...magnitudes)
 const maxMagnitude = Math.max(...magnitudes)

 console.log("Average x sobel: ", avgSobelX)
 console.log("Average y sobel: ", avgSobelY)
 console.log("Average magnitude of sobel: ", avgMagnitude)
 console.log("Min magnitude ctrs sobel :", minMagnitude)
 console.log("Max magnitude ctrs sobel :", maxMagnitude )

 const ctrsMoments = cv.moments(mat)
 var cx;
 var cy;
 if (ctrsMoments['m00'] != 0) {
     cx = parseInt(ctrsMoments['m10']/ctrsMoments['m00'])
     cy = parseInt(ctrsMoments['m01']/ctrsMoments['m00'])
 }

 console.log(ctrsMoments)
 console.log("Center Contours : [ ",  cx, " , ", cy, " ]")




// Write points on the newSegPixelData
// outsideCtrs.forEach( point => {
//   var spIdxOut = getPixelIndex(...point)
//   newSegPixelData[spIdxOut] = segmentIndex;
// })


// console.log(values)
// console.log(coords)

const sumInside = values.reduce((a, b) => a + b, 0);
const avgInside = (sumInside / values.length) || 0;

const sumOutside = outsideVals.reduce((a, b) => a + b, 0);
const avgOutside = (sumOutside / outsideVals.length) || 0;


console.log("Average pixel intensity inside segmentation: ", avgInside, " --Min/Max ", Math.min(...values), Math.max(...values))
console.log("Average pixel intensity outside segmentation: ", avgOutside, " --Min/Max ", Math.min(...outsideVals), Math.max(...outsideVals))


console.log("Magnitudes contours : ", magnitudes)

const matPixelsNew = cv.matFromArray(columns, rows, cv.CV_64F, prevPixelData)
let newdstx = new cv.Mat();
let newdsty = new cv.Mat();
cv.Sobel(matPixelsNew, newdstx, cv.CV_64F, 3, 0, 5, 3, 0, cv.BORDER_DEFAULT);
cv.Sobel(matPixelsNew, newdsty, cv.CV_64F, 0, 3, 5, 3, 0, cv.BORDER_DEFAULT);


var reachCtr= false;
var newSegPoints = [], notSegPoints = []
const threshold = 200;

const spCenter = getPixelIndex(cx, cy)
var magCenter = Math.sqrt ( Math.pow(newdstx.data64F[spCenter], 2) + Math.pow(newdsty.data64F[spCenter], 2) )
if (magCenter < minMagnitude || magCenter > maxMagnitude) { // Not a contour point
  newSegPixelData[spCenter] = segmentIndex;

}
newSegPoints.push([cx, cy]) // even if not seg newSegPoints need a entry start


const length = 30000; // for testing


console.log(newdstx.data64F.length)

var newMagnitudes = [];
newdstx.data64F.forEach( (val, index) => {
  var mag = Math.sqrt ( Math.pow(val, 2) + Math.pow(val, 2) )
  newMagnitudes.push(mag)
//  if (mag > minMagnitude && mag < maxMagnitude) { // not contour
  var coord = getPixelCoord(index)
  const distance = Math.sqrt((coord[0] - cx)**2 + (coord[1] - cy)**2)

  if (mag > avgMagnitude - 20 && mag < avgMagnitude + 20 && (newPixelData[index] > avgOutside - 50 && newPixelData[index] < avgOutside + 5  0) ) {// && distance < 50) {
    newSegPoints.push(index);
    newSegPixelData[index] = segmentIndex; // draw seg
  }
})

// for (var i = 0; i < length; i++) { //newSegPoints.
//   var point = newSegPoints[i];
//   var ptx = point[0], pty = point[1]
//   var  [ ptxm, ptxp, ptym, ptyp] = [
//       ptx - 1 < 0 ? 0 : ptx-1,
//       ptx + 1 > rows ? rows : ptx+1,
//       pty - 1 < 0 ? 0 : pty-1,
//       pty + 1 > columns ? columns : pty+1,
//   ];
//
//   var testPoints =  [
//     [ ptx, ptym ],
//     [ ptx, ptyp ],
//     [ ptxm, pty ],
//     [ ptxp, pty ],
//     // [ ptxm, ptym ],
//     // [ ptxm, ptyp ],
//     // [ ptxp, ptym ],
//     // [ ptxp, ptyp],
//   ]
//
//   testPoints.forEach( testpt => {
//
//     // console.log("Not seg includes point ?", notSegPoints.includes(testpt))
//     // console.log("New Seg includes point ?", newSegPoints.includes(testpt))
//
//     var foundNewSegPoints = newSegPoints.some( arr => testpt[0]===arr[0] && testpt[1]===arr[1] )
//     var foundNotSegPoints = newSegPoints.some( arr => testpt[0]===arr[0] && testpt[1]===arr[1] )
//     // console.log("But new seg second method gave : ", foundNewSegPoints)
//
//     if ( foundNotSegPoints === false && foundNewSegPoints === false) {
//   //    console.log(testpt, "not include in newSegPoints or notSegPoints")
//
//       // point has not been seen yet
//       const sptest = getPixelIndex(...testpt)
//       var mag = Math.sqrt ( Math.pow(newdstx.data64F[sptest], 2) + Math.pow(newdsty.data64F[sptest], 2) )
//       // console.log(mag)
//       if (mag < minMagnitude || mag > maxMagnitude) { // not contour
//         newSegPoints.push(testpt);
//         newSegPixelData[sptest] = segmentIndex; // draw seg
//       } else {
//         notSegPoints.push(testpt)
//       }
//     }
//   })
// }

console.log(newSegPoints)
console.log()

// while(stop == true) {
//   var  [ cxminus, cxplus, cyminus, cyplus] = [
//          cx - i < 0 ? 0 : cx - i,
//          cx + i > rows ? rows : cx + i,
//          cy - i < 0 ? 0 : cy - i,
//          cy + i > columns ? columns : cy + i
//      ];
//
//
//
//   i++;
// }
//


// for (var i = 1 ; cx - i > 0 && i + cx < rows ; i ++ ) {
//   for (var j = 1 ; cy - j> 0 && j + cy < columns ; j ++ ) {
//     segadd = false
//     // init
//     var  [ cxminus, cxplus, cyminus, cyplus] = [
//         cx - i,
//         cx + i,
//         cy + j,
//         cy + j
//     ];
//
//     var testPoints =  [
//       [ cx, cyminus ],
//       [ cx, cyplus ],
//       [ cxminus, cy ],
//       [ cxplus, cy ],
//       [ cxminus, cyminus ],
//       [ cxminus, cyplus ],
//       [ cxplus, cyminus ],
//       [ cxplus, cyplus],
//     ]
//
//     testPoints.forEach( point => {
//       if (seenSegPoints.includes(point) === false) {
//         var spTest = getPixelIndex(...point)
//         var testMag = Math.pow(newdstx.data64F[spTest], 2) + Math.pow(newdsty.data64F[spTest], 2)
//         console.log("Magnitude Sobel of newPixelData [ ", point[0], " , ", point[1], " ] :: ", magCenter)
//         // if (testMag < avgMagnitude - threshold && testMag > avgMagnitude + threshold) {
//         //   newSegPixelData[spTest] = segmentIndex;
//         //   segadd=true;
//         // }
//       }
//       seenSegPoints.push(point);
//     })
//     if (segadd==false){
//       break;
//     }
//   }
// }

// coords.forEach(point => {
//   const spIndex = getPixelIndex(...point);
//   newSegPixelData[spIndex] = segmentIndex;
// })

//
// pointerArray.forEach(point => {
//   const spIndex = getPixelIndex(...point);
//
//   // if (shouldErase) {
//   //   eraseIfSegmentIndex(spIndex, pixelData, segmentIndex);
//   // } else {
//   newSegPixelData[spIndex] = segmentIndex;
//   // }
// });

mat.delete()
matPixels.delete()
matPixelsNew.delete()
contours.delete()
hierarchy.delete()
newdstx.delete()
newdsty.delete()
