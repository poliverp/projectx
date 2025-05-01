// frontend/src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Table, Button, Tag, message, Typography, Card, Spin, Alert, Space } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, UserOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

function AdminDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approving, setApproving] = useState({});

  // Check if current user is admin (assuming user ID 1 is admin for now)
  const isAdmin = currentUser && currentUser.id === 1;

  // Fetch pending users
  useEffect(() => {
    const fetchPendingUsers = async () => {
      if (!isAdmin) return;
      
      try {
        setLoading(true);
        const response = await api.getPendingUsers();
        setPendingUsers(response.data.pending_users || []);
      } catch (err) {
        console.error('Error fetching pending users:', err);
        setError('Failed to load pending users. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchPendingUsers();
    }
  }, [currentUser, isAdmin]);

  // Handle approval
  const handleApproveUser = async (userId) => {
    try {
      setApproving(prev => ({ ...prev, [userId]: true }));
      await api.approveUser(userId);
      
      // Update the local state
      setPendingUsers(pendingUsers.filter(user => user.id !== userId));
      message.success('User approved successfully! They will receive an email notification.');
    } catch (err) {
      console.error('Error approving user:', err);
      message.error('Failed to approve user. Please try again.');
    } finally {
      setApproving(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Table columns configuration
  const columns = [
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Firm',
      dataIndex: 'firm',
      key: 'firm',
    },
    {
      title: 'Registered',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => {
        if (!text) return '-';
        const date = new Date(text);
        return date.toLocaleString();
      }
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <Tag color={record.pending_approval ? 'orange' : 'green'}>
          {record.pending_approval ? 'Pending Approval' : 'Approved'}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={approving[record.id]}
            onClick={() => handleApproveUser(record.id)}
            disabled={!record.pending_approval}
          >
            Approve
          </Button>
        </Space>
      ),
    },
  ];

  // Redirect non-admin users
  if (currentUser && !isAdmin) {
    return (
      <Card>
        <Alert
          message="Access Denied"
          description="You don't have permission to access the admin dashboard."
          type="error"
          showIcon
        />
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <Button type="primary" onClick={() => navigate('/manage-cases')}>
            Return to Cases
          </Button>
        </div>
      </Card>
    );
  }

  if (!currentUser) {
    return <div>Redirecting to login...</div>;
  }

  return (
    <div>
      <Title level={2}>Admin Dashboard</Title>
      <Text type="secondary">Manage user registrations and approvals</Text>
      
      <Card style={{ marginTop: '20px' }} title={<Title level={4}>Pending Approvals</Title>}>
        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: '20px' }}
          />
        )}
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '10px' }}>Loading pending user registrations...</div>
          </div>
        ) : (
          <>
            {pendingUsers.length === 0 ? (
              <Alert
                message="No Pending Approvals"
                description="There are currently no user registrations waiting for approval."
                type="info"
                showIcon
              />
            ) : (
              <Table
                columns={columns}
                dataSource={pendingUsers}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
}

export default AdminDashboard;