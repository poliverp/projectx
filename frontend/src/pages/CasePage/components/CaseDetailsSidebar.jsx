import React from 'react';
import { Card, Descriptions, Button, Space, Typography } from 'antd';
import { caseFieldConfig } from '../../../config/caseFieldConfig';
import { formatDate } from '../../../utils/dateUtils';
import {
  InfoCircleOutlined,
  BankOutlined,
  TeamOutlined,
  FileTextOutlined,
  CalendarOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';

const { Title } = Typography;

// Group fields by category
const fieldGroups = [
  {
    title: 'Case Identification',
    icon: <InfoCircleOutlined />,
    fields: ['display_name', 'official_case_name', 'case_number'],
  },
  {
    title: 'Court Information',
    icon: <BankOutlined />,
    fields: ['judge', 'jurisdiction', 'county'],
  },
  {
    title: 'Parties',
    icon: <TeamOutlined />,
    fields: ['plaintiff', 'defendant'],
  },
  {
    title: 'Case Timeline',
    icon: <CalendarOutlined />,
    fields: ['filing_date', 'trial_date', 'incident_date'],
  },
  {
    title: 'Incident Details',
    icon: <EnvironmentOutlined />,
    fields: ['incident_location', 'incident_description', 'case_type'],
  },
  {
    title: 'Additional Information',
    icon: <FileTextOutlined />,
    fields: ['vehicle_details', 'plaintiff_counsel_info', 'acting_attorney', 'acting_clerk'],
  },
  {
    title: 'Defendant Counsel Information',
    icon: <TeamOutlined />,
    fields: [
      'defendant_counsel_attorneys',
      'defendant_counsel_firm',
      'defendant_counsel_address',
      'defendant_counsel_contact',
    ],
  },
];

// Custom CSS to standardize label widths
const customDescriptionsStyle = {
  '.ant-descriptions-item-label': {
    width: '140px',
    minWidth: '140px',
    display: 'inline-block',
    verticalAlign: 'top',
    paddingRight: '8px',
    color: 'rgba(0, 0, 0, 0.45)',
    fontWeight: 'normal',
  },
  '.ant-descriptions-item-content': {
    display: 'inline-block',
    verticalAlign: 'top',
  }
};

function CaseDetailsSidebar({ caseDetails, onShowAllDetails }) {
  if (!caseDetails) return null;
  
  // Helper to get field value
  const getFieldValue = (fieldName) => {
    const field = caseFieldConfig.find(f => f.name === fieldName);
    if (!field) return 'N/A';
    
    let value;
    if (field.isDedicated) {
      value = caseDetails[fieldName];
    } else {
      value = caseDetails.case_details?.[fieldName];
    }
    
    // Format dates
    if (fieldName.includes('date') && value) {
      return formatDate(value);
    }
    
    return value || 'N/A';
  };
  
  // Helper to get field config
  const getFieldConfig = (fieldName) => {
    return caseFieldConfig.find(f => f.name === fieldName);
  };
  
  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Title level={4} style={{ marginTop: 0, paddingTop: 0 }}>Case Details</Title>
      
      <style>{`
        /* Custom CSS for consistent label widths */
        .case-details-descriptions .ant-descriptions-item-label {
          width: 140px;
          min-width: 140px;
          display: inline-block;
          vertical-align: top;
          padding-right: 8px;
          color: rgba(0, 0, 0, 0.45);
          font-weight: normal;
        }
        .case-details-descriptions .ant-descriptions-item-content {
          display: inline-block;
          vertical-align: top;
        }
      `}</style>
      
      {fieldGroups.map((group, groupIndex) => (
        <Card
          key={groupIndex}
          type="inner"
          size="small"
          title={
            <Space>
              {group.icon}
              {group.title}
            </Space>
          }
          bordered={false}
        >
          <Descriptions
            className="case-details-descriptions"
            column={1}
            size="small"
            colon={false}
            labelStyle={{ width: '140px' }}
            contentStyle={{ display: 'inline-block' }}
            items={group.fields
              .map(fieldName => {
                const field = getFieldConfig(fieldName);
                if (!field) return null;
                
                const value = getFieldValue(fieldName);
                if (value === 'N/A') return null;
                
                return {
                  key: fieldName,
                  label: field.label,
                  children: (
                    <span style={{
                      color: field.isDedicated ? '#000' : '#666',
                      fontWeight: field.isDedicated ? 'normal' : '500'
                    }}>
                      {value}
                    </span>
                  ),
                };
              })
              .filter(Boolean)}
          />
        </Card>
      ))}
      
      <Button block type="dashed" onClick={onShowAllDetails} size="large">
        Show All Details
      </Button>
    </Space>
  );
}

export default CaseDetailsSidebar;