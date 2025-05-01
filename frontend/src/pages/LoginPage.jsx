// frontend/src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Form, Input, Button, Checkbox, Alert, Typography } from 'antd';

const { Title, Paragraph } = Typography;

console.log("LOGIN PAGE COMPONENT LOADED");

function LoginPage() {
  const navigate = useNavigate();
  const { login, currentUser, pendingApproval, setPendingApproval } = useAuth();
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

  const handleLogin = async (values) => {
    // 'values' contains { username: '...', password: '...', remember: true/false }
    const { username, password, remember } = values;

    setIsLoading(true);
    setError(null); // Clear previous errors

    try {
      // Use the API directly instead of context.login
      const response = await api.login({ username, password, remember });
      
      if (response.data && response.data.user) {
        // Update context with user data
        login(response.data.user);
        toast.success(`Welcome back, ${response.data.user.username}!`);
        // Let the useEffect handle navigation
      } else {
        const errorMsg = 'Login succeeded but no user data received.';
        setError(errorMsg);
        toast.warn(errorMsg);
      }
    } catch (err) {
      console.error('Login failed:', err);
      
      // Handle pending approval error specifically
      if (err.response?.status === 403 && 
          err.response?.data?.error === "Account pending approval") {
        setPendingApproval(true);
        setError("Your account is pending admin approval. You'll receive an email once approved.");
      } else {
        const errorMsg = err.response?.data?.error || 'Login failed. Please check credentials.';
        setError(errorMsg);
      }
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

  // Optional: Define layout for Form Items
  const formItemLayout = {
    labelCol: { xs: { span: 24 }, sm: { span: 6 } },
    wrapperCol: { xs: { span: 24 }, sm: { span: 16 } },
  };
  const tailFormItemLayout = {
    wrapperCol: { xs: { span: 24, offset: 0 }, sm: { span: 16, offset: 6 } },
  };

  return (
    <div style={{ maxWidth: '500px', margin: '40px auto', padding: '30px', border: '1px solid #d9d9d9', borderRadius: '8px', background: '#fff' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Login</h2>

      <Form
        {...formItemLayout}
        form={form}
        name="login"
        onFinish={handleLogin}
        initialValues={{ remember: false }}
        scrollToFirstError
      >
        {error && (
          <Form.Item wrapperCol={{ ...tailFormItemLayout.wrapperCol }} style={{ marginBottom: 16 }}>
            <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} />
          </Form.Item>
        )}

        <Form.Item
          name="username"
          label="Username"
          rules={[{ required: true, message: 'Please input your Username!' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: true, message: 'Please input your Password!' }]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item
          name="remember"
          valuePropName="checked"
          {...tailFormItemLayout}
        >
          <Checkbox>Remember Me</Checkbox>
        </Form.Item>

        <Form.Item {...tailFormItemLayout}>
          <Button type="primary" htmlType="submit" loading={isLoading} block>
            {isLoading ? 'Logging In...' : 'Login'}
          </Button>
        </Form.Item>
      </Form>

      <p style={{ marginTop: '20px', textAlign: 'center' }}>
        Don't have an account? <Link to="/register">Register here</Link>
      </p>
    </div>
  );
}

export default LoginPage;