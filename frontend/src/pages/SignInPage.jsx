// frontend/src/pages/LoginPage.jsx
// THISISMYSIGNINPAGE WHICH I THINK IS UPDATED AND CURRENT
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Form, Input, Button, Checkbox, Alert, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

console.log("SIGNIN PAGE COMPONENT LOADED");

function LoginPage() {
  const navigate = useNavigate();
  const { login, currentUser, authError, pendingApproval } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form] = Form.useForm();

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      console.log('User already logged in, redirecting from Login page...');
      navigate('/manage-cases');
    }
  }, [currentUser, navigate]);

  // Set error from auth context
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleLogin = async (values) => {
    const { username, password, remember } = values;
    
    setIsLoading(true);
    setError(null);
  
    try {
      // ONLY pass credentials - don't check result.success
      await login({ username, password, remember });
      // Do not do anything else here - redirect will happen in useEffect
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Render nothing while redirecting
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
        <Button type="primary" onClick={() => navigate('/')}>
          Return to Login
        </Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <Title level={2}>ClerkLegal Login</Title>
      </div>

      {error && (
        <Alert
          message="Login Error"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: '20px' }}
        />
      )}

      <Form
        form={form}
        name="login"
        initialValues={{ remember: true }}
        onFinish={handleLogin}
        layout="vertical"
      >
        <Form.Item
          name="username"
          rules={[{ required: true, message: 'Please input your Username!' }]}
        >
          <Input prefix={<UserOutlined className="site-form-item-icon" />} placeholder="Username" size="large" />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[{ required: true, message: 'Please input your Password!' }]}
        >
          <Input.Password
            prefix={<LockOutlined className="site-form-item-icon" />}
            placeholder="Password"
            size="large"
          />
        </Form.Item>

        <Form.Item>
          <Form.Item name="remember" valuePropName="checked" noStyle>
            <Checkbox>Remember me</Checkbox>
          </Form.Item>
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={isLoading}
            style={{ width: '100%', height: '40px' }}
          >
            {isLoading ? 'Logging in...' : 'Log in'}
          </Button>
        </Form.Item>
      </Form>

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <p>
          Don't have an account? <Link to="/register">Register now!</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;