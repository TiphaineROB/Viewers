import user from '../user';

import { UIModalService, UINotificationService } from '@ohif/core';
import AuthenticationForm from '@ohif/extension-authentication-form'

/**
 * Returns the Authorization header as part of an Object.
 *
 * @export
 * @param {Object} [server={}]
 * @param {Object} [server.requestOptions]
 * @param {string|function} [server.requestOptions.auth]
 * @returns {Object} { Authorization }
 */
export default function getAuthorizationHeader({ requestOptions } = {}) {
  const headers = {};

  // Check for OHIF.user since this can also be run on the server
  const accessToken = user && user.getAccessToken && user.getAccessToken();

  // Auth for a specific server
  if (requestOptions && requestOptions.auth) {
    if (typeof requestOptions.auth === 'function') {
      // Custom Auth Header
      headers.Authorization = requestOptions.auth(requestOptions);
    } else {
      // HTTP Basic Auth (user:password)
      headers.Authorization = `Basic ${btoa(requestOptions.auth)}`;
    }
  }
  // Auth for the user's default
  else if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if( !window.config.user || !window.config.user.key) {
    window.config.user = {};
    window.config.user.key = '';
  }

  // if (CookieUtils.getMultipleCookie("AUTH_SERVER_KEY") == null)
  // {
  //   CookieUtils.setCookie('AUTH_SERVER_KEY', window.config.user.key)
  // }
  // if (CookieUtils.getMultipleCookie("AUTH_SERVER_URL") == null) {
  //   CookieUtils.setCookie('AUTH_SERVER_URL', headers.GirderURL);
  // }
  headers.Authorization = "Bearer Test"
  headers.ServerToken = window.config.user.key;
  headers.ServerURL = window.config.authenticationServer;
  return headers;
}

export class CookieUtils {
  static setCookie(name, value, exp_y, exp_m, exp_d, path, domain, secure) {
    let cookie_string = name + '=' + escape(value);
    if (exp_y) {
      let expires = new Date(exp_y, exp_m, exp_d);
      cookie_string += '; expires=' + expires.toGMTString();
    }
    if (path) cookie_string += '; path=' + escape(path);
    if (domain) cookie_string += '; domain=' + escape(domain);
    if (secure) cookie_string += '; secure';
    document.cookie = cookie_string;
  }

  static deleteAllCookies = () => { // not working
    const cookies = document.cookie.split(";");

    for (const cookie of cookies) {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
      // console.log(document.cookie)
    }
  }
  static getMultipleCookie(cookie_name) {
    let results = [...document.cookie.matchAll(cookie_name)]
    if (results.length>0) return results;
    else return null;
  }

  static eraseMultipleCookie(cookie_name) { //not working
    let results = [...document.cookie.matchAll(cookie_name)]
    for (var idx = 0; idx < results.length; idx++) {
        let countChar = results[idx].index + this.getCookie(cookie_name).length + 2; // For = and ; ?
        let newcookieval = document.cookie.slice(0, results[idx].index) + cookie_name + "=;";
        let cookies = document.cookie
        document.cookie = cookie_name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  }

  static getCookie(cookie_name, index=undefined) {
    if (index) {
      console.log(index)
      const cookie = document.cookie.slice(index)
      console.log(cookie)
      let results = cookie.match(
        '(^|;) ?' + cookie_name + '=([^;]*)(;|$)'
      );
      if (results) return unescape(results[2]);
      else return null;
    }
    let results = document.cookie.match(
      '(^|;) ?' + cookie_name + '=([^;]*)(;|$)'
    );
    if (results) return unescape(results[2]);
    else return null;
  }

  static getCookieString(name, defaultVal = '') {
    const val = CookieUtils.getCookie(name); // can return undefined as a string
    console.debug(name + ' = ' + val + ' (default: ' + defaultVal + ' )');
    if (val == null || val === "undefined" || val =='') {
      CookieUtils.setCookie(name, defaultVal);
      return defaultVal;
    }
    return val;
  }

  static getCookieBool(name, defaultVal = false) {
    const val = CookieUtils.getCookie(name, defaultVal);
    return !!JSON.parse(String(val).toLowerCase());
  }

  static getCookieNumber(name, defaultVal = 0) {
    const val = CookieUtils.getCookie(name, defaultVal);
    return Number(val);
  }
}
