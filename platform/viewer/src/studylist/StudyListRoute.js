import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import OHIF from '@ohif/core';
import { withRouter } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  StudyList,
  PageToolbar,
  TablePagination,
  useDebounce,
  useMedia,
} from '@ohif/ui';
import ConnectedHeader from '../connectedComponents/ConnectedHeader.js';
import * as RoutesUtil from '../routes/routesUtil';
import moment from 'moment';
import ConnectedDicomFilesUploader from '../googleCloud/ConnectedDicomFilesUploader';
import ConnectedDicomStorePicker from '../googleCloud/ConnectedDicomStorePicker';
import filesToStudies from '../lib/filesToStudies.js';

// Contexts
import UserManagerContext from '../context/UserManagerContext';
import WhiteLabelingContext from '../context/WhiteLabelingContext';
import AppContext from '../context/AppContext';

import CustomImport from '../../../../extensions/script-pacs/src/CustomImport'

const { urlUtil: UrlUtil } = OHIF.utils;

function StudyListRoute(props) {

  const { history, server, user, studyListFunctionsEnabled } = props;

  const [t] = useTranslation('Common');
  // ~~ STATE
  const [sort, setSort] = useState({
    fieldName: 'PatientName',
    direction: 'desc',
  });
  const [filterValues, setFilterValues] = useState({
    studyDateTo: null,
    studyDateFrom: null,
    PatientName: '',
    PatientID: '',
    AccessionNumber: '',
    AccessAuth: null,
    StateAnalysis: null,
    StudyDate: '',
    modalities: '',
    StudyDescription: '',
    //
    patientNameOrId: '',
    accessionOrModalityOrDescription: '',
    //
    allFields: '',
  });
  const [studies, setStudies] = useState([]);
  const [searchStatus, setSearchStatus] = useState({
    isSearchingForStudies: false,
    error: null,
  });
  const [activeModalId, setActiveModalId] = useState(null);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [pageNumber, setPageNumber] = useState(0);
  const appContext = useContext(AppContext);
  // ~~ RESPONSIVE
  const displaySize = useMedia(
    [
      '(min-width: 1750px)',
      '(min-width: 1000px) and (max-width: 1749px)',
      '(max-width: 999px)',
    ],
    ['large', 'medium', 'small'],
    'small'
  );
  // ~~ DEBOUNCED INPUT
  const debouncedSort = useDebounce(sort, 200);
  const debouncedFilters = useDebounce(filterValues, 250);

  // Google Cloud Adapter for DICOM Store Picking
  const { appConfig = {} } = appContext;
  const isGoogleCHAIntegrationEnabled =
    !server && appConfig.enableGoogleCloudAdapter;
  if (isGoogleCHAIntegrationEnabled && activeModalId !== 'DicomStorePicker') {
    setActiveModalId('DicomStorePicker');
  }

  // Called when relevant state/props are updated
  // Watches filters and sort, debounced
  useEffect(
    () => {
      const fetchStudies = async () => {
        try {
          setSearchStatus({ error: null, isSearchingForStudies: true });

          const response = await getStudyList(
            server,
            debouncedFilters,
            debouncedSort,
            rowsPerPage,
            pageNumber,
            displaySize
          );

          setStudies(response);
          setSearchStatus({ error: null, isSearchingForStudies: false });
        } catch (error) {
          console.warn(error);
          setSearchStatus({ error: true, isFetching: false });
        }
      };

      if (server) {
        fetchStudies();
      }
    },
    // TODO: Can we update studies directly?
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      debouncedFilters,
      debouncedSort,
      rowsPerPage,
      pageNumber,
      displaySize,
      server,
    ]
  );

  // TODO: Update Server
  // if (this.props.server !== prevProps.server) {
  //   this.setState({
  //     modalComponentId: null,
  //     searchData: null,
  //     studies: null,
  //   });
  // }

  const onDrop = async acceptedFiles => {
    try {
      const studiesFromFiles = await filesToStudies(acceptedFiles);
      setStudies(studiesFromFiles);
    } catch (error) {
      setSearchStatus({ isSearchingForStudies: false, error });
    }
  };

  if (searchStatus.error) {
    return <div>Error: {JSON.stringify(searchStatus.error)}</div>;
  } else if (studies === [] && !activeModalId) {
    return <div>Loading...</div>;
  }

  let healthCareApiButtons = null;
  let healthCareApiWindows = null;

  if (appConfig.enableGoogleCloudAdapter) {
    const isModalOpen = activeModalId === 'DicomStorePicker';
    updateURL(isModalOpen, appConfig, server, history);

    healthCareApiWindows = (
      <ConnectedDicomStorePicker
        isOpen={activeModalId === 'DicomStorePicker'}
        onClose={() => setActiveModalId(null)}
      />
    );

    healthCareApiButtons = (
      <div
        className="form-inline btn-group pull-right"
        style={{ padding: '20px' }}
      >
        <button
          className="btn btn-primary"
          onClick={() => setActiveModalId('DicomStorePicker')}
        >
          {t('Change DICOM Store')}
        </button>
      </div>
    );
  }

  function handleSort(fieldName) {
    let sortFieldName = fieldName;
    let sortDirection = 'asc';

    if (fieldName === sort.fieldName) {
      if (sort.direction === 'asc') {
        sortDirection = 'desc';
      } else {
        sortFieldName = null;
        sortDirection = null;
      }
    }

    setSort({
      fieldName: sortFieldName,
      direction: sortDirection,
    });
  }

  function handleFilterChange(fieldName, value) {
    console.log(fieldName, value)
    setFilterValues(state => {
      return {
        ...state,
        [fieldName]: value,
      };
    });
  }

  return (
    <>
      {studyListFunctionsEnabled ? (
        <ConnectedDicomFilesUploader
          isOpen={activeModalId === 'DicomFilesUploader'}
          onClose={() => setActiveModalId(null)}
        />
      ) : null}
      {healthCareApiWindows}
      <WhiteLabelingContext.Consumer>
        {whiteLabeling => (
          <UserManagerContext.Consumer>
            {userManager => (
              <ConnectedHeader
                useLargeLogo={true}
                user={user}
                userManager={userManager}
              >
                {whiteLabeling &&
                  whiteLabeling.createLogoComponentFn &&
                  whiteLabeling.createLogoComponentFn(React)}
              </ConnectedHeader>
            )}
          </UserManagerContext.Consumer>
        )}
      </WhiteLabelingContext.Consumer>

      <CustomImport/>

      <div className="study-list-header">
        <div className="header">
          <h1 style={{ fontWeight: 300, fontSize: '22px' }}>
            {t('StudyList')}
          </h1>
        </div>
        <div className="actions">
          {studyListFunctionsEnabled && healthCareApiButtons}
          {studyListFunctionsEnabled && (
            <PageToolbar
              onImport={() => setActiveModalId('DicomFilesUploader')}
            />
          )}
          <span className="study-count">{studies.length}</span>
        </div>
      </div>

      <div className="table-head-background" />
      <div className="study-list-container">
        {/* STUDY LIST OR DROP ZONE? */}
        <StudyList
          isLoading={searchStatus.isSearchingForStudies}
          hasError={searchStatus.error === true}
          // Rows
          studies={studies}
          onSelectItem={studyInstanceUID => {
            const viewerPath = RoutesUtil.parseViewerPath(appConfig, server, {
              studyInstanceUIDs: studyInstanceUID,
            });
            history.push(viewerPath);
          }}
          // Table Header
          sort={sort}
          onSort={handleSort}
          filterValues={filterValues}
          onFilterChange={handleFilterChange}
          studyListDateFilterNumDays={appConfig.studyListDateFilterNumDays}
          displaySize={displaySize}
        />
        {/* PAGINATION FOOTER */}
        <TablePagination
          currentPage={pageNumber}
          nextPageFunc={() => setPageNumber(pageNumber + 1)}
          prevPageFunc={() => setPageNumber(pageNumber - 1)}
          onRowsPerPageChange={Rows => setRowsPerPage(Rows)}
          rowsPerPage={rowsPerPage}
          recordCount={studies.length}
        />
      </div>
    </>
  );
}

StudyListRoute.propTypes = {
  filters: PropTypes.object,
  PatientID: PropTypes.string,
  server: PropTypes.object,
  user: PropTypes.object,
  history: PropTypes.object,
  studyListFunctionsEnabled: PropTypes.bool,
};

StudyListRoute.defaultProps = {
  studyListFunctionsEnabled: true,
};

function updateURL(isModalOpen, appConfig, server, history) {
  if (isModalOpen) {
    return;
  }

  const listPath = RoutesUtil.parseStudyListPath(appConfig, server);

  if (UrlUtil.paramString.isValidPath(listPath)) {
    const { location = {} } = history;
    if (location.pathname !== listPath) {
      history.replace(listPath);
    }
  }
}


import axios from 'axios';
/**
 * Not ideal, but we use displaySize to determine how the filters should be used
 * to build the collection of promises we need to fetch a result set.
 *
 * @param {*} server
 * @param {*} filters
 * @param {object} sort
 * @param {string} sort.fieldName - field to sort by
 * @param {string} sort.direction - direction to sort
 * @param {number} rowsPerPage - Number of results to return
 * @param {number} pageNumber - Used to determine results offset
 * @param {string} displaySize - small, medium, large
 * @returns
 */
async function getStudyList(
  server,
  filters,
  sort,
  rowsPerPage,
  pageNumber,
  displaySize
) {

  const {
    allFields,
    patientNameOrId,
    accessionOrModalityOrDescription,
  } = filters;
  const sortFieldName = sort.fieldName || 'PatientName';
  const sortDirection = sort.direction || 'desc';

  const mappedFilters = {
    PatientID: filters.PatientID,
    PatientName: filters.PatientName,
    AccessionNumber: filters.AccessionNumber,
    StudyDescription: filters.StudyDescription,
    ModalitiesInStudy: filters.modalities,
    // NEVER CHANGE
    studyDateFrom: filters.studyDateFrom,
    studyDateTo: filters.studyDateTo,
    limit: rowsPerPage,
    offset: pageNumber * rowsPerPage,
    fuzzymatching: server.supportsFuzzyMatching === true,
  };

  let studies = await _fetchStudies(server, mappedFilters, displaySize, {
    allFields,
    patientNameOrId,
    accessionOrModalityOrDescription,
  });

  // Custom check if user is authorized to access this resource
  const accessAuthorized = async (studyInstanceUID) => {
      if (window.config.authenticationRequired) {
        const uri_params = {
          baseURL: window.config.authenticationServer,
          params: {
            token: window.config.user.key,
            studyID: studyInstanceUID,
            sourceType: window.config.servers.dicomWeb[0].sourceType,
          }
        }
        const ax_rest = axios.create(uri_params);
        let access = await ax_rest.get("/authOhif", {})
              .then(
                function(r) {
                    return r.data;
              });
        return access;
      }
      return true;
  }

  const stepsDiagnosisRequest = async (studyInstanceUID) => {
      if (window.config.authenticationRequired) {
        const uri_params = {
          baseURL: window.config.authenticationServer,
          params: {
            orthanc: window.config.dicomWebServer,//'http://localhost/proxy/dicom-web',
            token: window.config.user.key,
            url: window.config.authenticationServer
            }
        }
        const ax_rest = axios.create(uri_params);
        let access = await ax_rest.get("/aimodulesOHIF", {})
              .then(
                function(r) {
                    return r.data;
              });
        return access;
      }
      return true;
  }
  const stepsRadiomicsRequest = async (studyInstanceUID) => {
      if (window.config.authenticationRequired) {
        const uri_params = {
          baseURL: window.config.authenticationServer,
          params: {
            orthanc: window.config.dicomWebServer,//'http://localhost/proxy/dicom-web',
            token: window.config.user.key,
            url: window.config.authenticationServer
            }
        }
        const ax_rest = axios.create(uri_params);
        let access = await ax_rest.get("aimodulesOHIF/radiomics", {})
              .then(
                function(r) {
                    return r.data;
              });
        return access;
      }
      return true;
  }

  const stepsRadiomicsResponse = await stepsRadiomicsRequest()
  const stepsDiagnosisResponse = await stepsDiagnosisRequest()

  let resultingArr = [];
  for (let study of studies){
    const result = await accessAuthorized(study.StudyInstanceUID);

    resultingArr.push(result)
  }

  const resultFilterAnalysis = _sortAnalysis(studies, stepsRadiomicsResponse,
        stepsDiagnosisResponse, filters.StateAnalysis)
  studies = resultFilterAnalysis[0]
  let filterAnalysis = resultFilterAnalysis[1]
  const resultFilterAuth = _sortAccess(studies, resultingArr, filters.AccessAuth)
  studies = resultFilterAuth[0]
  resultingArr = resultFilterAuth[1]



   // Only the fields we use
  const mappedStudies = studies.map( (study, index) => {
    const PatientName =
      typeof study.PatientName === 'string' ? study.PatientName : undefined;

    return {
      AccessionNumber: study.AccessionNumber, // "1"
      modalities: study.modalities, // "SEG\\MR"  ​​
      // numberOfStudyRelatedInstances: "3"
      // numberOfStudyRelatedSeries: "3"
      // PatientBirthdate: undefined
      PatientID: study.PatientID, // "NOID"
      PatientName, // "NAME^NONE"
      // PatientSex: "M"
      // referringPhysicianName: undefined
      StudyDate: study.StudyDate, // "Jun 28, 2002"
      StudyDescription: study.StudyDescription, // "BRAIN"
      // studyId: "No Study ID"
      StudyInstanceUID: study.StudyInstanceUID, // "1.3.6.1.4.1.5962.99.1.3814087073.479799962.1489872804257.3.0"
      UserHasAccess: resultingArr[index],
      StepsAnalysis: filterAnalysis[study.StudyInstanceUID],
      // StudyTime: "160956.0"
    };

  });

  // For our smaller displays, map our field name to a single
  // field we can actually sort by.
  const sortFieldNameMapping = {
    allFields: 'PatientName',
    patientNameOrId: 'PatientName',
    accessionOrModalityOrDescription: 'modalities',
  };
  const mappedSortFieldName =
    sortFieldNameMapping[sortFieldName] || sortFieldName;

  const sortedStudies = _sortStudies(
    mappedStudies,
    mappedSortFieldName,
    sortDirection
  );

  // Because we've merged multiple requests, we may have more than
  // our Rows per page. Let's `take` that number from our sorted array.
  // This "might" cause paging issues.
  const numToTake =
    sortedStudies.length < rowsPerPage ? sortedStudies.length : rowsPerPage;
  const result = sortedStudies.slice(0, numToTake);

  return result;
}

/**
*
* @param {object[]} studies - Array of studies to sort
* @param {bool[]} accessedStudies - Array with booleans for access value for each study
* @param {bool} activeFilter - if checkbox is checked
* @returns
*
**/
function _sortAccess(studies, accessedStudies, activeFilter) {
    if (activeFilter===null || activeFilter===false) {
      return [studies, accessedStudies];
    }
    else {
      var filteredstudies = studies.filter(
        function(study, index) {
          return accessedStudies[index]===true;
      })
      var filteredaccessed = accessedStudies.filter(
         function(access, index) {
           return access===true;
      })
      return [filteredstudies, filteredaccessed];
    }
}

/**
*
* @param {object[]} studies - Array of studies to sort
* @param {object} radiomicsResponse
* @param {object} diagnosisResponse
* @param {bool} activeFilter - if checkbox is checked
* @returns
*
**/
function _sortAnalysis(studies, radiomicsResponse, diagnosisResponse, activeFilter) {
    let dictResults = {}
    let filteredStudies = []

    const metadataRadiomics = radiomicsResponse ? radiomicsResponse.metadata : [];
    const filesDiagnosis = diagnosisResponse.files;

    for (var idx in studies) {
      const study = studies[idx]

      let checkFiles = filesDiagnosis.map(file => {

        if (file.study === study.StudyInstanceUID) {
          return file;
        }
      }).filter(element => {
        return element!== undefined
      });

      let checkRadiomics = metadataRadiomics.map(file => {
        if (file.study === study.StudyInstanceUID) {
          return file;
        }
      }).filter(element => {
        return element!== undefined
      });


      let res = {
        segmentation: study.modalities.includes("SEG"),
        radiomics: checkRadiomics.length > 0 ? true : false,
        diagnosis: checkFiles.length > 0 ? true : false,
      }

      let filterok=false;
      if (res.segmentation!=true || res.radiomics!=true || res.diagnosis!=true)
      {
        filterok = true;
      }
      if (activeFilter===null || activeFilter===false || (activeFilter===true && filterok===true) )
      {
        filteredStudies.push(study)
        dictResults[study.StudyInstanceUID] = res;
      }
    }
    return [filteredStudies,  dictResults]
}


/**
 *
 *
 * @param {object[]} studies - Array of studies to sort
 * @param {string} studies.StudyDate - Date in 'MMM DD, YYYY' format
 * @param {string} field - name of properties on study to sort by
 * @param {string} order - 'asc' or 'desc'
 * @returns
 */
function _sortStudies(studies, field, order) {
  // Make sure our StudyDate is in a valid format and create copy of studies array
  const sortedStudies = studies.map(study => {
    if (!moment(study.StudyDate, 'MMM DD, YYYY', true).isValid()) {
      study.StudyDate = moment(study.StudyDate, 'YYYYMMDD').format(
        'MMM DD, YYYY'
      );
    }
    return study;
  });

  // Sort by field
  sortedStudies.sort(function(a, b) {
    let fieldA = a[field];
    let fieldB = b[field];
    if (field === 'StudyDate') {
      fieldA = moment(fieldA).toISOString();
      fieldB = moment(fieldB).toISOString();
    }

    // Order
    if (order === 'desc') {
      if (fieldA < fieldB) {
        return -1;
      }
      if (fieldA > fieldB) {
        return 1;
      }
      return 0;
    } else {
      if (fieldA > fieldB) {
        return -1;
      }
      if (fieldA < fieldB) {
        return 1;
      }
      return 0;
    }
  });

  return sortedStudies;
}

/**
 * We're forced to do this because DICOMWeb does not support "AND|OR" searches
 * across multiple fields. This allows us to make multiple requests, remove
 * duplicates, and return the result set as if it were supported
 *
 * @param {object} server
 * @param {Object} filters
 * @param {string} displaySize - small, medium, or large
 * @param {string} multi.allFields
 * @param {string} multi.patientNameOrId
 * @param {string} multi.accessionOrModalityOrDescription
 */
async function _fetchStudies(
  server,
  filters,
  displaySize,
  { allFields, patientNameOrId, accessionOrModalityOrDescription }
) {
  let queryFiltersArray = [filters];

  if (displaySize === 'small') {
    const firstSet = _getQueryFiltersForValue(
      filters,
      [
        'PatientID',
        'PatientName',
        'AccessionNumber',
        'StudyDescription',
        'ModalitiesInStudy',
      ],
      allFields
    );

    if (firstSet.length) {
      queryFiltersArray = firstSet;
    }
  } else if (displaySize === 'medium') {
    const firstSet = _getQueryFiltersForValue(
      filters,
      ['PatientID', 'PatientName'],
      patientNameOrId
    );

    const secondSet = _getQueryFiltersForValue(
      filters,
      ['AccessionNumber', 'StudyDescription', 'ModalitiesInStudy'],
      accessionOrModalityOrDescription
    );

    if (firstSet.length || secondSet.length) {
      queryFiltersArray = firstSet.concat(secondSet);
    }
  }

  const queryPromises = [];

  queryFiltersArray.forEach(filter => {
    const searchStudiesPromise = OHIF.studies.searchStudies(server, filter);
    queryPromises.push(searchStudiesPromise);
  });

  const lotsOfStudies = await Promise.all(queryPromises);
  const studies = [];

  // Flatten and dedupe
  lotsOfStudies.forEach(arrayOfStudies => {
    if (arrayOfStudies) {
      arrayOfStudies.forEach(study => {
        if (!studies.some(s => s.StudyInstanceUID === study.StudyInstanceUID)) {
          studies.push(study);
        }
      });
    }
  });

  return studies;
}

/**
 *
 *
 * @param {*} filters
 * @param {*} fields - Array of string fields
 * @param {*} value
 */
function _getQueryFiltersForValue(filters, fields, value) {
  const queryFilters = [];

  if (value === '' || !value) {
    return queryFilters;
  }

  fields.forEach(field => {
    const filter = Object.assign(
      {
        PatientID: '',
        PatientName: '',
        AccessionNumber: '',
        StudyDescription: '',
        ModalitiesInStudy: '',
      },
      filters
    );

    filter[field] = value;
    queryFilters.push(filter);
  });

  return queryFilters;
}

export default withRouter(StudyListRoute);
