// src/pages/CasePage/components/tabs/CaseDetailsTab.jsx
import React from 'react';
import { Card, Descriptions, Button, Space } from 'antd';
import { caseFieldConfig } from '../../../../config/caseFieldConfig';
import { formatDate } from '../../../../utils/dateUtils';

function CaseDetailsTab({ caseDetails, onShowAllDetails }) {
  if (!caseDetails) return null;
  
  // Helper function to determine if a field is a date field
  const isDateField = (fieldName) => {
    return fieldName.includes('date') || (fieldName.type === 'date');
  };
  
  // Generate details items from config
  const detailsItems = caseFieldConfig
    .filter(field => field.showInitially === true)
    .map((field) => {
      let value;
      
      if (field.isDedicated) {
        value = caseDetails[field.name] ?? 'N/A';
      } else {
        value = caseDetails.case_details?.[field.name] ?? 'N/A';
      }
      
      // Format date fields
      if (isDateField(field.name)) {
        value = formatDate(value);
      }
      
      return {
        key: field.name,
        label: field.label,
        children: value,
        span: field.span || 1,
      };
    });
  
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