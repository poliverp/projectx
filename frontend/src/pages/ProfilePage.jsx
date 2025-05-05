import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  Card, 
  Typography, 
  Space, 
  Spin, 
  Alert, 
  Divider,
  Row,
  Col,
  Descriptions,
  Button,
  theme
} from 'antd';
import { 
  UserOutlined, 
  MailOutlined, 
  BankOutlined,
  FolderOutlined,
  IdcardOutlined,
  EditOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { useToken } = theme;

function ProfilePage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { token } = useToken();
  
  const [activeCasesCount, setActiveCasesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchActiveCasesCount = async () => {
      try {
        const response = await api.getCases();
        setActiveCasesCount(response.data.length);
        setError(null);
      } catch (err) {
        console.error('Error fetching cases:', err);
        setError('Failed to load case count');
      } finally {
        setLoading(false);
      }
    };

    fetchActiveCasesCount();
  }, []);

  if (!currentUser) {
    navigate('/login');
    return null;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Back button */}
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/manage-cases')}
        style={{ marginBottom: '16px' }}
      >
        Back to Cases
      </Button>

      {/* Profile Information Card */}
      <Card 
        title={
          <Space>
            <UserOutlined />
            <span>Profile Information</span>
          </Space>
        }
        extra={
          <Button icon={<EditOutlined />} type="link">
            Edit Profile
          </Button>
        }
        style={{ width: '100%' }}
      >
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <Descriptions column={1} layout="vertical">
              <Descriptions.Item 
                label={
                  <Space>
                    <IdcardOutlined style={{ color: token.colorPrimary }} />
                    <Text strong>User ID</Text>
                  </Space>
                }
              >
                {currentUser.id}
              </Descriptions.Item>
              
              <Descriptions.Item 
                label={
                  <Space>
                    <UserOutlined style={{ color: token.colorPrimary }} />
                    <Text strong>Username</Text>
                  </Space>
                }
              >
                {currentUser.username}
              </Descriptions.Item>
              
              <Descriptions.Item 
                label={
                  <Space>
                    <MailOutlined style={{ color: token.colorPrimary }} />
                    <Text strong>Email</Text>
                  </Space>
                }
              >
                {currentUser.email}
              </Descriptions.Item>
            </Descriptions>
          </Col>
          
          <Col xs={24} md={12}>
            <Descriptions column={1} layout="vertical">
              <Descriptions.Item 
                label={
                  <Space>
                    <BankOutlined style={{ color: token.colorPrimary }} />
                    <Text strong>Law Firm</Text>
                  </Space>
                }
              >
                {currentUser.firm}
              </Descriptions.Item>
              
              <Descriptions.Item 
                label={
                  <Space>
                    <FolderOutlined style={{ color: token.colorPrimary }} />
                    <Text strong>Active Cases</Text>
                  </Space>
                }
              >
                {error ? (
                  <Alert 
                    message={error} 
                    type="error" 
                    showIcon 
                    style={{ marginTop: '8px' }} 
                  />
                ) : (
                  <Text strong style={{ fontSize: '16px', color: token.colorPrimary }}>
                    {activeCasesCount}
                  </Text>
                )}
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </Card>

      {/* Account Settings Card */}
      <Card 
        title="Account Settings"
        style={{ width: '100%' }}
      >
        <Descriptions column={1} layout="vertical">
          <Descriptions.Item label="Account Type">
            {currentUser.pending_approval ? (
              <Alert 
                message="Account Pending Approval" 
                type="warning" 
                showIcon 
                style={{ marginTop: '8px' }} 
              />
            ) : (
              <Text>Active User</Text>
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </Space>
  );
}

export default ProfilePage;