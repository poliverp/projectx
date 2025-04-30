// src/pages/CasePage/components/modals/AllDetailsModal.jsx
import React from 'react';
import { Modal, Button, Tabs, Descriptions, Empty } from 'antd';
import { caseFieldConfig } from '../../../../config/caseFieldConfig';

function AllDetailsModal({ isOpen, onCancel, caseDetails }) {
  if (!caseDetails) return null;
  
  // Generate all details items
  const allDetailsItems = caseFieldConfig
    .filter(field => field.name !== 'id' && field.name !== 'user_id')
    .map((field) => ({
      key: field.name,
      label: field.label,
      children: field.isDedicated
        ? (caseDetails[field.name] ?? 'N/A')
        : (caseDetails.case_details?.[field.name] ?? 'N/A'),
      span: 1,
    }));
  
  return (
    <Modal
      title="All Case Details"
      open={isOpen}
      onCancel={onCancel}
      footer={[
        <Button key="close" onClick={onCancel}>
          Close
        </Button>
      ]}
      width={800}
      destroyOnClose
    >
      {allDetailsItems.length > 0 ? (
        <Tabs
          defaultActiveKey="table"
          items={[
            {
              key: 'table',
              label: 'Table View',
              children: (
                <Descriptions
                  bordered
                  column={1}
                  items={allDetailsItems}
                  size="small"
                />
              )
            },
            {
              key: 'json',
              label: 'JSON View',
              children: (
                <div style={{ 
                  background: '#f6f8fa', 
                  padding: '12px', 
                  borderRadius: '4px',
                  maxHeight: '500px',
                  overflowY: 'auto'
                }}>
                  <pre style={{ margin: 0 }}>
                    {JSON.stringify(caseDetails, null, 2)}
                  </pre>
                </div>
              )
            }
          ]}
        />
      ) : (
        <Empty description="Details not available" />
      )}
    </Modal>
  );
}

export default AllDetailsModal;