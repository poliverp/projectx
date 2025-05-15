// src/pages/CasePage/components/modals/AllDetailsModal.jsx
import React from 'react';
import { Modal, Descriptions, Typography, Space, Divider } from 'antd';
import { caseFieldConfig } from '../../../../config/caseFieldConfig';
import { formatDate } from '../../../../utils/dateUtils';
import { useSuggestions } from '../../hooks/useSuggestions';
import {
  InfoCircleOutlined,
  BankOutlined,
  TeamOutlined,
  FileTextOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  ProfileOutlined
} from '@ant-design/icons';

const { Title } = Typography;

// Group fields by category (same as in CaseDetailsSidebar)
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

function AllDetailsModal({ isOpen, onCancel, caseDetails }) {
  const { 
    lockedFields,
    toggleFieldLock,
    isFieldLocked,
    isFieldLockPending,
    isLocking
  } = useSuggestions(caseDetails, () => {});

  if (!caseDetails) return null;
  
  // Helper function to determine if a field is a date field
  const isDateField = (fieldName) => {
    return fieldName.includes('date') || (fieldName.type === 'date');
  };

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
    if (isDateField(fieldName) && value) {
      return formatDate(value);
    }
    
    return value || 'N/A';
  };

  return (
    <Modal
      title={
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          padding: '8px 0'
        }}>
          <ProfileOutlined style={{ 
            fontSize: '20px',
            color: '#1890ff'
          }} />
          <Title level={4} style={{ 
            margin: 0,
            color: '#262626',
            fontWeight: 600
          }}>
            All Case Details
          </Title>
        </div>
      }
      open={isOpen}
      onCancel={onCancel}
      footer={null}
      width={800}
      bodyStyle={{ 
        padding: '24px',
        background: '#f5f5f5'
      }}
      headerStyle={{
        borderBottom: '1px solid #f0f0f0',
        padding: '16px 24px',
        marginBottom: '8px',
        background: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {fieldGroups.map((group, groupIndex) => {
          const items = group.fields
            .map(fieldName => {
              const value = getFieldValue(fieldName);
              if (value === 'N/A') return null;
              
              return {
                key: fieldName,
                label: caseFieldConfig.find(f => f.name === fieldName)?.label || fieldName,
                children: (
                  <span style={{
                    color: '#262626',
                    fontWeight: 500,
                    fontSize: '14px'
                  }}>
                    {value}
                  </span>
                ),
              };
            })
            .filter(Boolean);

          if (items.length === 0) return null;

          return (
            <div key={groupIndex}>
              <Space style={{ marginBottom: '12px' }}>
                {group.icon}
                <Title level={5} style={{ margin: 0 }}>{group.title}</Title>
              </Space>
              <Descriptions
                bordered
                column={2}
                size="small"
                items={items}
                style={{ 
                  background: '#fff',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}
                labelStyle={{ 
                  width: '160px',
                  backgroundColor: '#fafafa',
                  fontWeight: 500,
                  borderRight: '1px solid #f0f0f0',
                  color: '#8c8c8c',
                  fontSize: '13px'
                }}
                contentStyle={{ 
                  backgroundColor: '#fff',
                  padding: '12px 16px'
                }}
              />
              {groupIndex < fieldGroups.length - 1 && (
                <Divider style={{ 
                  margin: '24px 0',
                  borderColor: '#f0f0f0'
                }} />
              )}
            </div>
          );
        })}
      </Space>
    </Modal>
  );
}

export default AllDetailsModal;