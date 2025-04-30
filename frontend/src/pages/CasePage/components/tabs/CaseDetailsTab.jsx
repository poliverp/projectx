// src/pages/CasePage/components/tabs/CaseDetailsTab.jsx
import React from 'react';
import { Card, Descriptions, Button, Space } from 'antd';
import { caseFieldConfig } from '../../../../config/caseFieldConfig';

function CaseDetailsTab({ caseDetails, onShowAllDetails }) {
  if (!caseDetails) return null;
  
  // Generate details items from config
  const detailsItems = caseFieldConfig
    .filter(field => field.showInitially === true)
    .map((field) => ({
      key: field.name,
      label: field.label,
      children: field.isDedicated
        ? (caseDetails[field.name] ?? 'N/A')
        : (caseDetails.case_details?.[field.name] ?? 'N/A'),
      span: field.span || 1,
    }));
  
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Card 
        title="Official Details" 
        type="inner"
        extra={
          <Button onClick={onShowAllDetails}>
            Show All Details
          </Button>
        }
      >
        <Descriptions 
          bordered 
          column={{ xxl: 3, xl: 3, lg: 2, md: 2, sm: 1, xs: 1 }} 
          items={detailsItems} 
          size="small"
        />
      </Card>
    </Space>
  );
}

export default CaseDetailsTab;