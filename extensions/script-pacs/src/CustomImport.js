import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import cornerstoneTools from 'cornerstone-tools';
import cornerstone from 'cornerstone-core';
import moment from 'moment';
import classNames from 'classnames';
import { utils, log, classes, DICOMWeb, errorHandler } from '@ohif/core';
import { ScrollableArea, TableList, Icon } from '@ohif/ui';

const { studyMetadataManager, xhrRetryRequestHook} = utils;
const { MetadataProvider } = classes;

const { getXHRRetryRequestHook } = xhrRetryRequestHook;

import './CustomImport.styl'

/**
 * CustomImport from PACS component
 *
 * @returns component
 */
const CustomImport = ({

}) => {

    const onSubmit = async evt  => {
        console.log("This is a submit event !")
        let file = document.getElementById("file").value;
        let patientname = document.getElementById("name").value;
        let patientid = document.getElementById("id").value;
        let datestart = document.getElementById("date").value;
        let dateend = document.getElementById("dateEnd").value;
        let modality = document.getElementById("modality").value;

        console.log(file, patientname, patientid, datestart, dateend, modality)
    };

    const inputRef = useRef(null);

    return (
      <div className='custom-import'>
        <div className="header">
          <h1 style={{ fontWeight: 300, fontSize: '22px' }}>
            {'Import Patients from PACS'}
          </h1>
        </div>
        <div className="actions">
        <br/>
        <input
          id="file"
          width="20%"
          className="ui-btn-hover-d"
          type="file"
          ref={inputRef}
          multiple
          size="1"
         />
          <label htmlFor="name" className="form-label">
            Patient Name
          </label>
          <input
            type="text"
            className="form-control-pacs"
            name="name"
            id="name"
            style={{size: 6}}
          />
          <label htmlFor="id" className="form-label">
            Patient ID
          </label>
          <input
            type="text"
            className="form-control-pacs"
            name="id"
            id="id"
            style={{size: 6}}
          />
          <label htmlFor="date" className="form-label">
            Date Start-End
          </label>
          <input
            type="text"
            className="form-control-pacs"
            name="date"
            id="date"
            style={{size: 6}}
          />
          <input
            type="text"
            className="form-control-pacs"
            name="dateEnd"
            id="dateEnd"
            style={{size: 6}}
          />
          <label htmlFor="modality" className="form-label">
            Modality
          </label>
          <input
            type="text"
            className="form-control-pacs"
            name="modality"
            id="modality"
            style={{size: 4}}
          />
          <button
            className="actionButtonPacs"
            data-cy="close-button"
            type="submit"
            id="submitInfoSeg"
            onClick={onSubmit}
            disabled={false}
            >
            Submit
            </button>
        </div>
        <div className="study-count"></div>
      </div>
    );
};
//onClick={this.onSubmit}

// <label htmlFor="date" className="form-label">
//   Date Start-End
// </label>
// <input
//   type="text"
//   className="form-control"
//   name="date"
//   id="date"
//   style={{size: 10}}
// />
// <input
//   type="text"
//   className="form-control"
//   name="dateEnd"
//   id="dateEnd"
//   style={{size: 10}}
// />
// <label htmlFor="series" className="form-label">
//   Modality
// </label>
// <input
//   type="text"
//   className="form-control"
//   name="series"
//   id="series"
//   style={{size: 10}}
// />
// <label htmlFor="criteria" className="form-label">
//   Other criteria
// </label>
// <input
//   type="text"
//   className="form-control"
//   name="criteria"
//   id="criteria"
//   style={{size: 10}}

CustomImport.propTypes = {
  /*
   * An object, with int index keys?
   * Maps to: state.viewports.viewportSpecificData, in `viewer`
   * Passed in MODULE_TYPES.PANEL when specifying component in viewer
   */

};
CustomImport.defaultProps = {};


export default CustomImport;
