import React from 'react';
import adjust from './icons/adjust.svg';
// Icons
import angleDoubleDown from './icons/angle-double-down.svg';
import angleDoubleUp from './icons/angle-double-up.svg';
import angleLeft from './icons/angle-left.svg';
import arrows from './icons/arrows.svg';
import arrowsAltH from './icons/arrows-alt-h.svg';
import arrowsAltV from './icons/arrows-alt-v.svg';
import bars from './icons/bars.svg';
import brain from './icons/brain.svg';
import brush from './icons/brush.svg';
import caretDown from './icons/caret-down.svg';
import caretUp from './icons/caret-up.svg';
import check from './icons/check.svg';
import checkCircle from './icons/check-circle.svg';
import checkCircleO from './icons/check-circle-o.svg';
import chevronDown from './icons/chevron-down.svg';
import circle from './icons/circle.svg';
import circleNotch from './icons/circle-notch.svg';
import circleO from './icons/circle-o.svg';
import clipboard from './icons/clipboard.svg';
import cog from './icons/cog.svg';
import createComment from './icons/create-comment.svg';
import createScreenCapture from './icons/create-screen-capture.svg';
import crosshairs from './icons/crosshairs.svg';
import cube from './icons/cube.svg';
import d3Rotate from './icons/3d-rotate.svg';
import database from './icons/database.svg';
import dotCircle from './icons/dot-circle.svg';
import edit from './icons/edit.svg';
import ellipseCircle from './icons/ellipse-circle.svg';
import ellipseH from './icons/ellipse-h.svg';
import ellipseV from './icons/ellipse-v.svg';
import exclamationCircle from './icons/exclamation-circle.svg';
import exclamationTriangle from './icons/exclamation-triangle.svg';
import fastBackward from './icons/fast-backward.svg';
import fastForward from './icons/fast-forward.svg';
import stop from './icons/stop.svg';
import info from './icons/info.svg';
import inlineEdit from './icons/inline-edit.svg';
import level from './icons/level.svg';
import link from './icons/link.svg';
import linkCircles from './icons/link-circles.svg';
import list from './icons/list.svg';
import liver from './icons/liver.svg';
import lock from './icons/lock.svg';
import lockAlt from './icons/lock-alt.svg';
import lung from './icons/lung.svg';
import measureNonTarget from './icons/measure-non-target.svg';
import measureTarget from './icons/measure-target.svg';
import measureTargetCr from './icons/measure-target-cr.svg';
import measureTargetNe from './icons/measure-target-ne.svg';
import measureTargetUn from './icons/measure-target-un.svg';
import measureTemp from './icons/measure-temp.svg';
import objectGroup from './icons/object-group.svg';
import ohifLogo from './icons/ohif-logo.svg';
import ohifTextLogo from './icons/ohif-text-logo.svg';
import oval from './icons/oval.svg';
import palette from './icons/palette.svg';
import play from './icons/play.svg';
import plus from './icons/plus.svg';
import powerOff from './icons/power-off.svg';
import reset from './icons/reset.svg';
import rotate from './icons/rotate.svg';
import rotateRight from './icons/rotate-right.svg';
import saveRegular from './icons/save-regular.svg';
import scissors from './icons/scissors.svg';
import search from './icons/search.svg';
import searchPlus from './icons/search-plus.svg';
import softTissue from './icons/soft-tissue.svg';
import sort from './icons/sort.svg';
import sortDown from './icons/sort-down.svg';
import sortUp from './icons/sort-up.svg';
import sphere from './icons/sphere.svg';
import squareO from './icons/square-o.svg';
import star from './icons/star.svg';
import stepBackward from './icons/step-backward.svg';
import stepForward from './icons/step-forward.svg';
import sun from './icons/sun.svg';
import th from './icons/th.svg';
import thLarge from './icons/th-large.svg';
import thList from './icons/th-list.svg';
import times from './icons/times.svg';
import trash from './icons/trash.svg';
import unlink from './icons/unlink.svg';
import user from './icons/user.svg';
import youtube from './icons/youtube.svg';
import eye from './icons/eye.svg';
import eyeClosed from './icons/eye-closed.svg';
import envelopeSquare from './icons/envelope-square.svg';
// import circleArrowDown from './icons/circle-arrow-down.svg';
// import circleArrowUpSolid from './icons/circle-arrow-up-solid.svg';
// import circleChevronDownSolid from './icons/circle-chevron-down-solid.svg';
// import circleChevronUpSolid from './icons/circle-chevron-up-solid.svg';
// 'envelope-square': envelopeSquare,
// 'circle-arrow-up': circleArrowUpSolid,
// 'circle-arrow-down': circleArrowDownSolid,
// 'circle-chevron-up': circleChevronDownSolid,
// 'circle-chevron-down': circleChevronUpSolid,

//import logoCreatisInverse from './icons/logo-creatis-inverse.svg'
import creatisQuadriLogoInvertNew from './icons/creatis_quadri_logo_invert_new.svg'
import awesommeTextLogo from './icons/awesomme-text-logo.svg'

import cubeAxis from './icons/cube-axis.svg'
import cubeColor from './icons/cube-color.svg'
import cubeOutlined from './icons/cube-outlined.svg'
import cubeColorblue from './icons/cube-colorblue.svg'
import cubeColorgreen from './icons/cube-colorgreen.svg'

import view from './icons/view.svg'
import viewMulti from './icons/view-multi.svg'

import axisX from './icons/axis-x.svg'
import axisY from './icons/axis-y.svg'
import axisZ from './icons/axis-z.svg'

import notepad from './icons/notepad.svg'
import segment from './icons/segment.svg'
import chartanalysis from './icons/chartanalysis.svg'


import clipboardnotification from './icons/clipboardnotification.svg'
import clipboardresults from './icons/clipboardresults.svg'
import clipboardsearch from './icons/clipboardsearch.svg'
import fileselect from './icons/fileselect.svg'
import filegraph from './icons/filegraph.svg'
import fileexcel from './icons/fileexcel.svg'
import table from './icons/table.svg'
import select from './icons/select.svg'
import excel from './icons/excel.svg'
import capture from './icons/capture.svg'
import triangle from './icons/triangle.svg'

//import stack from './icons/stack.svg'


const ICONS = {
  eye,
  'eye-closed': eyeClosed,
  brush,
  scissors,
  user,
  sort,
  th,
  star,
  'sort-up': sortUp,
  sphere,
  'sort-down': sortDown,
  info,
  cube,
  crosshairs,
  'dot-circle': dotCircle,
  'angle-left': angleLeft,
  '3d-rotate': d3Rotate,
  plus,
  'chevron-down': chevronDown,
  'angle-double-down': angleDoubleDown,
  'angle-double-up': angleDoubleUp,
  'arrows-alt-h': arrowsAltH,
  'arrows-alt-v': arrowsAltV,
  bars,
  'caret-down': caretDown,
  'caret-up': caretUp,
  'check-circle-o': checkCircleO,
  check,
  circle,
  'circle-o': circleO,
  times,
  'create-comment': createComment,
  'create-screen-capture': createScreenCapture,
  edit,
  'fast-backward': fastBackward,
  'fast-forward': fastForward,
  'object-group': objectGroup,
  search,
  'power-off': powerOff,
  'inline-edit': inlineEdit,
  list,
  'ohif-logo': ohifLogo,
  'ohif-text-logo': ohifTextLogo,
  lock,
  play,
  database,
  cog,
  'circle-notch': circleNotch,
  'square-o': squareO,
  'check-circle': checkCircle,
  'lock-alt': lockAlt,
  'step-backward': stepBackward,
  'step-forward': stepForward,
  clipboard: clipboard,
  stop,
  'th-large': thLarge,
  'th-list': thList,
  sun,
  palette,
  youtube,
  oval,
  'ellipse-h': ellipseH,
  'ellipse-v': ellipseV,
  adjust,
  level,
  'link-circles': linkCircles,
  'search-plus': searchPlus,
  'measure-non-target': measureNonTarget,
  'measure-target': measureTarget,
  'measure-target-cr': measureTargetCr,
  'measure-target-un': measureTargetUn,
  'measure-target-ne': measureTargetNe,
  'measure-temp': measureTemp,
  'ellipse-circle': ellipseCircle,
  arrows,
  reset,
  rotate,
  'rotate-right': rotateRight,
  trash,
  unlink,
  'exclamation-circle': exclamationCircle,
  link,
  'exclamation-triangle': exclamationTriangle,
  brain,
  'soft-tissue': softTissue,
  lung,
  liver,
  save: saveRegular,
  "creatis-logo": creatisQuadriLogoInvertNew,//logoCreatisInverse,
  "awesomme-text": awesommeTextLogo,
  "cube-axis": cubeAxis,
  "cube-color": cubeColor,
  "cube-colorgreen": cubeColorgreen,
  "cube-colorblue": cubeColorblue,
  "cube-outlined": cubeOutlined,
  "view": view,
  "view-multi": viewMulti,
  "axis-x": axisX,
  "axis-y": axisY,
  "axis-z": axisZ,
  "notepad": notepad,
  "chartanalysis": chartanalysis,
  "segment": segment,
  "clipboardresults": clipboardresults,
  "clipboardsearch": clipboardsearch,
  "clipboardnotification": clipboardnotification,
  "filegraph": filegraph,
  "fileselect": fileselect,
  "table": table,
  "excel": excel,
  "fileexcel": fileexcel,
  "capture": capture,
  "select": select,
  "triangle": triangle,
  //"stack": stack,
};

/**
 * Return the matching SVG Icon as a React Component.
 * Results in an inlined SVG Element. If there's no match,
 * return `null`
 */
export default function getIcon(key, props) {
  if (!key || !ICONS[key]) {
    return React.createElement('div', null, 'Missing Icon');
  }

  return React.createElement(ICONS[key], props);
}

export { ICONS };
