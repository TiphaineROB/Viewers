import React from 'react';
// Svgs
import ohifLogoText from './svgs/ohif-logo-text.svg';
import ohifLogoWrappedText from './svgs/ohif-logo-wrapped-text.svg';
import ohifLogoWrappedText from './svgs/ohif-logo-wrapped-text.svg';
import creatisQuadriLogo from './svgs/creatis_quadri_logo.svg'

const SVGS = {
  'ohif-logo-wrapped-text': ohifLogoWrappedText,
  'ohif-logo-text': ohifLogoText,
  'creatis-quadri-logo': creatisQuadriLogo, 
};

/**
 * Return the matching SVG as a React Component.
 * Results in an inlined SVG Element. If there's no match,
 * return `null`
 */
export default function getSvg(key, props) {
  if (!key || !SVGS[key]) {
    return React.createElement('div', null, 'Missing SVG');
  }

  return React.createElement(SVGS[key], props);
}

export { SVGS };
