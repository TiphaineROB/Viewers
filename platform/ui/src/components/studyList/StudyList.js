import './StudyList.styl';

import React from 'react';
import classNames from 'classnames';
import TableSearchFilter from './TableSearchFilter.js';
import PropTypes from 'prop-types';
import { StudyListLoadingText } from './StudyListLoadingText.js';
import { useTranslation } from 'react-i18next';

import { Icon } from '@ohif/ui';

const getContentFromUseMediaValue = (
  displaySize,
  contentArrayMap,
  defaultContent
) => {
  const content =
    displaySize in contentArrayMap
      ? contentArrayMap[displaySize]
      : defaultContent;

  return content;
};

import axios from 'axios';



/**
 *
 *
 * @param {*} props
 * @returns
 */
function StudyList(props) {
  const {
    isLoading,
    hasError,
    studies,
    sort,
    onSort: handleSort,
    filterValues,
    onFilterChange: handleFilterChange,
    onSelectItem: handleSelectItem,
    studyListDateFilterNumDays,
    displaySize,
    cohorts,
  } = props;

  const { t, ready: translationsAreReady } = useTranslation('StudyList');

  const largeTableMeta = [
    {
      displayText: t('Access'),
      fieldName: 'AccessAuth',
      inputType: 'bool',
      size: 200,
    },
    {
      displayText: t('StateAnalysis'),
      fieldName: 'StateAnalysis',
      inputType: 'logo',
      size: 200,
    },
    {
      displayText: t('Cohort'),
      fieldName: 'Cohort',
      inputType: 'list',
      size: 200,
    },
    {
      displayText: t('PatientName'),
      fieldName: 'PatientName',
      inputType: 'text',
      size: 330,
    },
    {
      displayText: t('MRN'),
      fieldName: 'PatientID',
      inputType: 'text',
      size: 378,
    },
    {
      displayText: t('AccessionNumber'),
      fieldName: 'AccessionNumber',
      inputType: 'text',
      size: 180,
    },
    {
      displayText: t('StudyDate'),
      fieldName: 'StudyDate',
      inputType: 'date-range',
      size: 300,
    },
    {
      displayText: t('Modality'),
      fieldName: 'modalities',
      inputType: 'text',
      size: 114,
    },
    {
      displayText: t('StudyDescription'),
      fieldName: 'StudyDescription',
      inputType: 'text',
      size: 335,
    },

  ];

  const mediumTableMeta = [
    {
      displayText: t('Access'),
      fieldName: 'AccessAuth',
      inputType: 'bool',
      size: 200,
    },
    {
      displayText: t('StateAnalysis'),
      fieldName: 'StateAnalysis',
      inputType: 'logo',
      size: 200,
    },
    {
      displayText: t('Cohort'),
      fieldName: 'Cohort',
      inputType: 'list',
      size: 200,
    },
    {
      displayText: `${t('PatientName')} / ${t('MRN')}`,
      fieldName: 'patientNameOrId',
      inputType: 'text',
      size: 250,
    },
    {
      displayText: t('Description'),
      fieldName: 'accessionOrModalityOrDescription',
      inputType: 'text',
      size: 350,
    },
    {
      displayText: t('StudyDate'),
      fieldName: 'StudyDate',
      inputType: 'date-range',
      size: 300,
    },

  ];

  const smallTableMeta = [
    {
      displayText: t('Access'),
      fieldName: 'AccessAuth',
      inputType: 'bool',
      size: 100,
    },
    {
      displayText: t('StateAnalysis'),
      fieldName: 'StateAnalysis',
      inputType: 'logo',
      size: 100,
    },
    {
      displayText: t('Search'),
      fieldName: 'allFields',
      inputType: 'text',
      size: 100,
    },

  ];

  const tableMeta = getContentFromUseMediaValue(
    displaySize,
    { large: largeTableMeta, medium: mediumTableMeta, small: smallTableMeta },
    smallTableMeta
  );

  const totalSize = tableMeta
    .map(field => field.size)
    .reduce((prev, next) => prev + next);

 // TODO Filter the studies regarding the accessAuthorized function
  return translationsAreReady ? (
    <table className="table table--striped table--hoverable">
      <colgroup>
        {tableMeta.map((field, i) => {
          const size = field.size;
          const percentWidth = (size / totalSize) * 100.0;

          return <col key={i} style={{ width: `${percentWidth}%` }} />;
        })}
      </colgroup>
      <thead className="table-head">
        <tr className="filters">
          <TableSearchFilter
            meta={tableMeta}
            values={filterValues}
            onSort={handleSort}
            onValueChange={handleFilterChange}
            sortFieldName={sort.fieldName}
            sortDirection={sort.direction}
            studyListDateFilterNumDays={studyListDateFilterNumDays}
            cohorts={cohorts}
          />
        </tr>
      </thead>
      <tbody className="table-body" data-cy="study-list-results">
        {/* I'm not in love with this approach, but it's the quickest way for now
         *
         * - Display different content based on loading, empty, results state
         *
         * This is not ideal because it create a jump in focus. For loading especially,
         * We should keep our current results visible while we load the new ones.
         */}
        {/* LOADING */}
        {isLoading && (
          <tr className="no-hover">
            <td colSpan={tableMeta.length}>
              <StudyListLoadingText />
            </td>
          </tr>
        )}
        {!isLoading && hasError && (
          <tr className="no-hover">
            <td colSpan={tableMeta.length}>
              <div className="notFound">
                {t('There was an error fetching studies')}
              </div>
            </td>
          </tr>
        )}
        {/* EMPTY */}
        {!isLoading && !studies.length && (
          <tr className="no-hover">
            <td colSpan={tableMeta.length}>
              <div className="notFound">{t('No matching results')}</div>
            </td>
          </tr>
        )}
        {!isLoading &&

          studies.map((study, index) => (
            <TableRow
              key={`${study.StudyInstanceUID}-${index}`}
              onClick={StudyInstanceUID => handleSelectItem(StudyInstanceUID)}
              AccessionNumber={study.AccessionNumber || ''}
              AccessAuth={study.UserHasAccess}
              StateAnalysis={study.StepsAnalysis}
              Cohort={study.Cohort}
              modalities={study.modalities}
              PatientID={study.PatientID || ''}
              PatientName={study.PatientName || ''}
              StudyDate={study.StudyDate}
              StudyDescription={study.StudyDescription || ''}
              StudyInstanceUID={study.StudyInstanceUID}
              displaySize={displaySize}
            />
          ))}
      </tbody>
    </table>
  ) : null;
}

StudyList.propTypes = {
  isLoading: PropTypes.bool.isRequired,
  hasError: PropTypes.bool.isRequired,
  studies: PropTypes.array.isRequired,
  onSelectItem: PropTypes.func.isRequired,
  // ~~ SORT
  sort: PropTypes.shape({
    fieldName: PropTypes.string,
    direction: PropTypes.oneOf(['desc', 'asc', null]),
  }).isRequired,
  onSort: PropTypes.func.isRequired,
  // ~~ FILTERS
  filterValues: PropTypes.shape({
    PatientName: PropTypes.string.isRequired,
    PatientID: PropTypes.string.isRequired,
    AccessionNumber: PropTypes.string.isRequired,
    StudyDate: PropTypes.string.isRequired,
    modalities: PropTypes.string.isRequired,
    StudyDescription: PropTypes.string.isRequired,
    patientNameOrId: PropTypes.string.isRequired,
    accessionOrModalityOrDescription: PropTypes.string.isRequired,
    allFields: PropTypes.string.isRequired,
    studyDateTo: PropTypes.any,
    studyDateFrom: PropTypes.any,
  }).isRequired,
  onFilterChange: PropTypes.func.isRequired,
  studyListDateFilterNumDays: PropTypes.number,
  displaySize: PropTypes.string,
  cohorts: PropTypes.object,
};

StudyList.defaultProps = {};


import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faUnlock } from '@fortawesome/free-solid-svg-icons'
import { faLockOpen } from '@fortawesome/free-solid-svg-icons'
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons'
import { library } from "@fortawesome/fontawesome-svg-core";

library.add(faLock)
library.add(faUnlock)
library.add(faLockOpen)
library.add(faCheck)
library.add(faXmark)

function TableRow(props) {
  const {
    AccessionNumber,
    isHighlighted,
    AccessAuth,
    StateAnalysis,
    Cohort,
    modalities,
    PatientID,
    PatientName,
    StudyDate,
    StudyDescription,
    StudyInstanceUID,
    onClick: handleClick,
    displaySize,
  } = props;

  const { t } = useTranslation('StudyList');
  let authorized;
  let stateanalysis;

  if (AccessAuth) {
    authorized = <div style={{color:"#88b160"}}> <FontAwesomeIcon icon="lock-open"/> </div>
  } else {
    authorized = <div style={{color:"#b14140"}}> <FontAwesomeIcon icon="lock"/> </div>
  }

  if (StateAnalysis) {
    stateanalysis = (
        <div>
          SEG &nbsp;
          { StateAnalysis.segmentation && <FontAwesomeIcon icon="check" style={{color: '#88b160'}}/>}
          { !StateAnalysis.segmentation && <FontAwesomeIcon icon="xmark" style={{color: "#b14140"}}/>}
          &nbsp;&nbsp; Radiomics &nbsp;
          { StateAnalysis.radiomics && <FontAwesomeIcon icon="check" style={{color: '#88b160'}}/>}
          { !StateAnalysis.radiomics && <FontAwesomeIcon icon="xmark" style={{color: "#b14140"}}/>}
          &nbsp;&nbsp; Diagnosis &nbsp;
          { StateAnalysis.diagnosis && <FontAwesomeIcon icon="check" style={{color: '#88b160'}}/>}
          { !StateAnalysis.diagnosis && <FontAwesomeIcon icon="xmark" style={{color: "#b14140"}} />}
        </div>
    )
    //<Icon name="triangle" className="triangle" width="1.8em"/> <Icon name="fileexcel" className="fileexcel" width="1.8em"/> <Icon name="clipboardnotification" className="clipboardnotification" width="1.8em"/>
  } else {
    stateanalysis = <div> </div>
  }


  const cohort = (
    <div>
      {Cohort}
    </div>
  )

  const fctOnClick = (AccessAuth) => {

    if (AccessAuth  ) {

      handleClick(StudyInstanceUID)
    }
  }
  const largeRowTemplate = (
    <tr
      onClick={fctOnClick}
      className={classNames({ active: isHighlighted })}
    >
      <td style={{ textAlign: 'center' }}>{authorized}</td>
      <td style={{ textAlign: 'center' }}>{stateanalysis}</td>
      <td style={{ textAlign: 'center' }}>{cohort}</td>
      <td className={classNames({ 'empty-value': !PatientName })}>
        {PatientName || `(${t('Empty')})`}
      </td>
      <td>{PatientID}</td>
      <td>{AccessionNumber}</td>
      <td>{StudyDate}</td>
      <td className={classNames({ 'empty-value': !modalities })}>
        {modalities || `(${t('Empty')})`}
      </td>
      <td>{StudyDescription}</td>
    </tr>
  );

  const mediumRowTemplate = (
    <tr
      onClick={fctOnClick}
      className={classNames({ active: isHighlighted })}
    >
      <td style={{ textAlign: 'center' }}>{authorized}</td>
      <td style={{ textAlign: 'center' }}>{stateanalysis}</td>
      <td style={{ textAlign: 'center' }}>{cohort}</td>
      <td className={classNames({ 'empty-value': !PatientName })}>
        {PatientName || `(${t('Empty')})`}
        <div style={{ color: '#60656f' }}>{PatientID}</div>
      </td>
      <td>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {/* DESCRIPTION */}
          <div
            className="hide-xs"
            style={{
              whiteSpace: 'pre-wrap',
              flexGrow: 1,
            }}
          >
            {StudyDescription}
          </div>

          {/* MODALITY & ACCESSION */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              maxWidth: '80px',
              width: '80px',
            }}
          >
            <div
              className={classNames({
                modalities: modalities,
                'empty-value': !modalities,
              })}
              aria-label={modalities}
              title={modalities}
            >
              {modalities || `(${t('Empty')})`}
            </div>
            <div
              style={{
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
              aria-label={AccessionNumber}
              title={AccessionNumber}
            >
              {AccessionNumber}
            </div>
          </div>
        </div>
      </td>
      {/* DATE */}
      <td style={{ textAlign: 'center' }}>{StudyDate}</td>
    </tr>
  );

  const smallRowTemplate = (
    <tr
      onClick={fctOnClick}
      className={classNames({ active: isHighlighted })}
    >
      <td>
        <div>
          {authorized}
        </div>
      </td>
      <td style={{ textAlign: 'center' }}>{stateanalysis}</td>
      <td style={{ textAlign: 'center' }}>{cohort}</td>
      <td style={{ position: 'relative', overflow: 'hidden' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {/* NAME AND ID */}
          <div
            className={classNames({ 'empty-value': !PatientName })}
            style={{ width: '150px', minWidth: '150px' }}
          >

            <div style={{ fontWeight: 500, paddingTop: '3px' }}>
              {PatientName || `(${t('Empty')})`}
            </div>
            <div style={{ color: '#60656f' }}>{PatientID}</div>
          </div>

          {/* DESCRIPTION */}
          <div
            className="hide-xs"
            style={{
              whiteSpace: 'pre-wrap',
              flexGrow: 1,
              paddingLeft: '35px',
            }}
          >
            {StudyDescription}
          </div>

          {/* MODALITY & DATE */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              maxWidth: '80px',
              width: '80px',
            }}
          >
            <div
              className={classNames({
                modalities: modalities,
                'empty-value': !modalities,
              })}
              aria-label={modalities}
              title={modalities}
            >
              {modalities || `(${t('Empty')})`}
            </div>
            <div>{StudyDate}</div>
          </div>
        </div>
      </td>
    </tr>
  );

  const rowTemplate = getContentFromUseMediaValue(
    displaySize,
    {
      large: largeRowTemplate,
      medium: mediumRowTemplate,
      small: smallRowTemplate,
    },
    smallRowTemplate
  );

  return rowTemplate;
}

TableRow.propTypes = {
  AccessionNumber: PropTypes.string.isRequired,
  isHighlighted: PropTypes.bool,
  AccessAuth: PropTypes.bool,
  StateAnalysis: PropTypes.object,
  modalities: PropTypes.string,
  PatientID: PropTypes.string.isRequired,
  PatientName: PropTypes.string.isRequired,
  StudyDate: PropTypes.string.isRequired,
  StudyDescription: PropTypes.string.isRequired,
  StudyInstanceUID: PropTypes.string.isRequired,
  displaySize: PropTypes.string,
};

TableRow.defaultProps = {
  isHighlighted: false,
};

export { StudyList };
