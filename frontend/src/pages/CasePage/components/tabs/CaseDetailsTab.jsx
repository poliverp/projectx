import React from 'react';
import TwoColumnLayout from '../TwoColumnLayout';
import CaseDetailsSidebar from '../CaseDetailsSidebar';

function CaseDetailsTab({ caseDetails, onShowAllDetails }) {
  return (
    <TwoColumnLayout
      sidebar={
        <CaseDetailsSidebar 
          caseDetails={caseDetails}
          onShowAllDetails={onShowAllDetails}
        />
      }
    >
      {/* Main content area for case details */}
      <div style={{ minHeight: '500px' }}>
        {/* This space can be used for other case-related content */}
        {/* For now, it's empty to focus on the details sidebar */}
      </div>
    </TwoColumnLayout>
  );
}

export default CaseDetailsTab;