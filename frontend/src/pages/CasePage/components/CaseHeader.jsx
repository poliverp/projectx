// src/pages/CasePage/components/CaseHeader.jsx
import React from 'react';
import { Row, Col, Space, Typography, Button, Tag, Tooltip, Popconfirm } from 'antd';
import { EditOutlined, DownloadOutlined, DeleteOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

function CaseHeader({ 
  caseDetails, 
  onEdit, 
  onExport, 
  onDelete, 
  loading, 
  isDeleting 
}) {
  if (!caseDetails) return null;
  
  const { display_name, case_number, judge } = caseDetails;
  const caseDetailsData = caseDetails.case_details || {};
  
  const getCaseStatusTag = () => {
    const status = caseDetailsData.status || 'Active';
    
    const statusColors = {
      'Active': 'green',
      'Pending': 'orange',
      'Closed': 'gray',
      'On Hold': 'red'
    };
    
    return (
      <Tag color={statusColors[status] || 'blue'}>
        {status}
      </Tag>
    );
  };
  
  return (
    <Row gutter={[24, 16]} align="middle">
      <Col xs={24} sm={24} md={16} lg={18}>
        <Space direction="vertical" size={0}>
          <Space align="center">
            <Title level={3} style={{ margin: 0 }}>{display_name}</Title>
            {getCaseStatusTag()}
          </Space>
          <Space size="large">
            <Text type="secondary">Case #{case_number || 'N/A'}</Text>
            <Text type="secondary">Judge: {judge || 'N/A'}</Text>
          </Space>
        </Space>
      </Col>
      <Col xs={24} sm={24} md={8} lg={6} style={{ textAlign: 'right' }}>
        <Space>
          <Tooltip title="Edit Case Info">
            <Button 
              icon={<EditOutlined />} 
              onClick={onEdit} 
              disabled={!caseDetails || loading}
            >
              Edit
            </Button>
          </Tooltip>
          <Tooltip title="Download Case Summary">
            <Button 
              icon={<DownloadOutlined />}
              onClick={onExport}
              disabled={!caseDetails || loading}
            >
              Export
            </Button>
          </Tooltip>
          <Popconfirm
            title="Delete Case?"
            description="Are you sure? This cannot be undone."
            onConfirm={onDelete}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            disabled={loading || isDeleting}
          >
            <Tooltip title="Delete Case">
              <Button 
                danger
                icon={<DeleteOutlined />} 
                loading={isDeleting}
                disabled={!caseDetails || loading || isDeleting}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      </Col>
    </Row>
  );
}

export default CaseHeader;