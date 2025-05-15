// frontend/src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Form, Input, Button, Checkbox, Alert, Typography, Spin } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

console.log("LOGIN PAGE COMPONENT LOADED");

function LoginPage() {
  const navigate = useNavigate();
  const { login, currentUser, pendingApproval, setPendingApproval, isLoading: authLoading, authError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [form] = Form.useForm();

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      console.log('User already logged in, redirecting from Login page...');
      navigate('/manage-cases');
    }
  }, [currentUser, navigate]);

  const handleLogin = async (values) => {
    setIsLoading(true);
    try {
      await login(values);
      // No need to show notification or set error here; AuthContext handles it
    } finally {
      setIsLoading(false);
    }
  };

  if (currentUser) {
    return <div>Redirecting...</div>;
  }

  // If account is pending approval, show special message
  if (pendingApproval) {
    return (
      <div style={{ maxWidth: '500px', margin: '40px auto', padding: '30px', border: '1px solid #d9d9d9', borderRadius: '8px', background: '#fff', textAlign: 'center' }}>
        <Title level={2}>Account Pending Approval</Title>
        <div style={{ margin: '20px 0', padding: '20px', backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '4px' }}>
          <Title level={4} style={{ color: '#1890ff' }}>Your account is awaiting administrator approval</Title>
          <Paragraph>
            Thank you for registering with ClerkLegal. Your account has been created successfully but requires administrator approval before you can log in.
          </Paragraph>
          <Paragraph>
            You will receive an email notification when your account has been approved.
          </Paragraph>
        </div>
        <Button type="primary" onClick={() => navigate('/')}>Return to Login</Button>
      </div>
    );
  }

  // Optional: Define layout for Form Items
  const formItemLayout = {
    labelCol: { xs: { span: 24 }, sm: { span: 24 } },
    wrapperCol: { xs: { span: 24 }, sm: { span: 24 } },
  };
  const tailFormItemLayout = {
    wrapperCol: { xs: { span: 24, offset: 0 }, sm: { span: 24, offset: 0 } },
  };

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.12)',
          padding: '40px 32px 32px 32px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Logo/Icon */}
        <div style={{ marginBottom: 16 }}>
          <LoginOutlined style={{ fontSize: 40, color: '#1890ff', background: '#e6f7ff', borderRadius: '50%', padding: 10, boxShadow: '0 2px 8px #e6f7ff' }} />
        </div>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 8, fontWeight: 700, letterSpacing: 1 }}>Welcome Back</Title>
        <Paragraph style={{ textAlign: 'center', color: '#888', marginBottom: 24, fontSize: 16 }}>
          Sign in to your ClerkLegal account
        </Paragraph>

        <Form
          {...formItemLayout}
          form={form}
          name="login"
          onFinish={handleLogin}
          initialValues={{ remember: false }}
          scrollToFirstError
          disabled={authLoading || isLoading}
          style={{ width: '100%', textAlign: 'center', filter: (authLoading || isLoading) ? 'blur(0.5px)' : 'none', pointerEvents: (authLoading || isLoading) ? 'none' : 'auto' }}
        >
          {authError && (
            <Form.Item style={{ marginBottom: 16 }}>
              <Alert message={authError} type="error" showIcon closable />
            </Form.Item>
          )}

          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Please input your Username!' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Username"
              size="large"
              style={{ borderRadius: 8, textAlign: 'center' }}
              disabled={authLoading || isLoading}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your Password!' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Password"
              size="large"
              style={{ borderRadius: 8, textAlign: 'center' }}
              disabled={authLoading || isLoading}
            />
          </Form.Item>

          <Form.Item name="remember" valuePropName="checked" style={{ textAlign: 'left', marginBottom: 0 }}>
            <Checkbox disabled={authLoading || isLoading}>Remember Me</Checkbox>
          </Form.Item>

          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading || authLoading}
              block
              size="large"
              style={{ borderRadius: 8, fontWeight: 600, fontSize: 16, letterSpacing: 1 }}
              disabled={isLoading || authLoading}
            >
              {(isLoading || authLoading) ? 'Logging In...' : 'Login'}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 24, width: '100%' }}>
          <span style={{ color: '#888', fontSize: 15 }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#1890ff', fontWeight: 500 }}>
              Register here
            </Link>
          </span>
        </div>

        {(authLoading || isLoading) && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.6)',
            zIndex: 10
          }}>
            <Spin size="large" />
          </div>
        )}
      </div>
    </div>
  );
}

export default LoginPage;