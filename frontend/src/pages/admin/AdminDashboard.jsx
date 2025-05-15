import React from 'react';
import { Card, Typography, Space } from 'antd';

const { Title } = Typography;

function AdminDashboard() {
  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Title level={2}>Admin Dashboard</Title>
        <Card>
          <p>Welcome to the admin dashboard. This is a placeholder for admin functionality.</p>
        </Card>
      </Space>
    </div>
  );
}

export default AdminDashboard; 