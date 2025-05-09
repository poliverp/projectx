// CaseDetailsSidebar.js
// Designed to fit into a parent container that is already sticky and has a defined height.
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

// fieldGroups definition (ensure this is consistent with your actual config)
const fieldGroups = [
    { title: 'Case Identification', icon: <InfoCircleOutlined />, fields: ['display_name', 'official_case_name', 'case_number'] },
    { title: 'Court Information', icon: <BankOutlined />, fields: ['judge', 'jurisdiction', 'county'] },
    { title: 'Parties', icon: <TeamOutlined />, fields: ['plaintiff', 'defendant'] },
    { title: 'Case Timeline', icon: <CalendarOutlined />, fields: ['filing_date', 'trial_date', 'incident_date'] },
    { title: 'Incident Details', icon: <EnvironmentOutlined />, fields: ['incident_location', 'incident_description', 'case_type'] },
    { title: 'Additional Information', icon: <FileTextOutlined />, fields: ['vehicle_details', 'plaintiff_counsel_info', 'acting_attorney', 'acting_clerk'] },
    { title: 'Defendant Counsel Information', icon: <TeamOutlined />, fields: ['defendant_counsel_attorneys', 'defendant_counsel_firm', 'defendant_counsel_address', 'defendant_counsel_contact'] },
];

function CaseDetailsSidebar({ caseDetails, onShowAllDetails }) {
  if (!caseDetails) return null;

  const getFieldValue = (fieldName) => {
    const field = caseFieldConfig.find(f => f.name === fieldName);
    if (!field) {
        console.warn(`Field configuration not found for: ${fieldName}`);
        return 'N/A';
    }
    let value = field.isDedicated ? caseDetails[fieldName] : caseDetails.case_details?.[fieldName];
    if (fieldName.includes('date') && value) return formatDate(value);
    return (value !== null && typeof value !== 'undefined' && value !== '') ? value : 'N/A';
  };

  const getFieldConfig = (fieldName) => caseFieldConfig.find(f => f.name === fieldName);

  return (
    // This main div of CaseDetailsSidebar should fill the height provided by its parent (e.g., the Card in CasePage.jsx).
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%', // Assumes parent (<Card>) will give it a constrained height.
      backgroundColor: 'inherit', // Inherit background from parent Card or set one.
    }}>
      <Title level={4} style={{
        margin: 0,
        padding: '16px',
        position: 'sticky', // Sticky within this CaseDetailsSidebar component
        top: 0,             // Sticks to the top of the scrollable content area below
        backgroundColor: 'inherit', // Or a specific color like 'white' or theme.token.colorBgContainer
        zIndex: 1,          // Keep title above scrolling content
        borderBottom: '1px solid #e8e8e8',
      }}>
        Case Details
      </Title>

      {/* This div will contain all scrollable content (the field groups) */}
      <div style={{
        flexGrow: 1,          // Takes up available space after the title
        overflowY: 'auto',    // Enables vertical scrolling for this section
        padding: '16px',      // Padding for the content area itself
      }}>
        <style>{`
          .case-details-descriptions .ant-descriptions-item-label {
            width: 140px !important;
            min-width: 140px !important;
            display: inline-block !important;
            vertical-align: top !important;
            padding-right: 8px !important;
            color: rgba(0, 0, 0, 0.65) !important;
            font-weight: normal !important;
          }
          .case-details-descriptions .ant-descriptions-item-content {
            display: inline-block !important;
            vertical-align: top !important;
            word-break: break-word;
          }
        `}</style>

        {fieldGroups.map((group, groupIndex) => {
          const itemsToRender = group.fields
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
                    color: field.isDedicated ? '#000000' : '#4a4a4a',
                    fontWeight: field.isDedicated ? 'normal' : '500',
                  }}>
                    {String(value)}
                  </span>
                ),
              };
            })
            .filter(item => item !== null);

          if (itemsToRender.length === 0) return null;

          return (
            <Card
              key={groupIndex} type="inner" size="small"
              title={
                <Space align="center">
                  {React.isValidElement(group.icon) ? React.cloneElement(group.icon, { style: { verticalAlign: 'middle', marginRight: '8px' } }) : null}
                  <span style={{ verticalAlign: 'middle' }}>{group.title}</span>
                </Space>
              }
              bordered={false} style={{ marginBottom: '16px' }}
            >
              <Descriptions className="case-details-descriptions" column={1} size="small" colon={false} items={itemsToRender} />
            </Card>
          );
        })}
        
        <Button block type="dashed" onClick={onShowAllDetails} size="large" style={{ marginTop: '16px' }}>
          Show All Details
        </Button>
      </div>
    </div>
  );
}

export default CaseDetailsSidebar;