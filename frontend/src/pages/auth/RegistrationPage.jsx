// frontend/src/pages/RegistrationPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { Form, Input, Button, Alert, Select, Typography, Card, Space, Divider } from 'antd';

const { Option } = Select;
const { Title, Paragraph, Text } = Typography;

// List of approved firms
const APPROVED_FIRMS = ["Adamson Ahdoot LLC"];

function RegistrationPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [form] = Form.useForm();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      console.log('User already logged in, redirecting from Register page...');
      navigate('/manage-cases');
    }
  }, [currentUser, navigate]);

  const handleRegister = async (values) => {
    const { username, password, email, firm } = values;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.register({ username, password, email, firm });
      console.log('Registration successful:', response.data);
      toast.success('Registration successful! Your account is pending approval.');
      form.resetFields();
      setRegistrationSuccess(true);
    } catch (err) {
      console.error('Registration failed:', err);
      const errorMsg = err.response?.data?.error || 'Registration failed. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (currentUser) {
    return <div>Redirecting...</div>;
  }

  // If registration was successful, show the pending approval message
  if (registrationSuccess) {
    return (
      <Card 
        style={{ 
          maxWidth: '500px', 
          margin: '60px auto', 
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
        }}
      >
        <div style={{ padding: '10px 15px', textAlign: 'center' }}>
          <Title level={2} style={{ marginBottom: '24px' }}>Registration Successful!</Title>
          
          <Card
            style={{ 
              margin: '24px 0', 
              backgroundColor: '#f6ffed', 
              border: '1px solid #b7eb8f', 
              borderRadius: '8px' 
            }}
          >
            <Title level={4} style={{ color: '#52c41a', marginBottom: '16px' }}>
              Your account is pending approval
            </Title>
            <Paragraph style={{ fontSize: '16px' }}>
              Thank you for registering with ClerkLegal. Your account has been created successfully but requires administrator approval before you can log in.
            </Paragraph>
            <Paragraph style={{ fontSize: '16px' }}>
              You will receive an email notification when your account has been approved.
            </Paragraph>
          </Card>
          
          <Button 
            type="primary" 
            size="large"
            onClick={() => navigate('/login')}
            style={{ minWidth: '140px', height: '40px', borderRadius: '6px' }}
          >
            Return to Login
          </Button>
        </div>
      </Card>
    );
  }

  const formItemLayout = {
    labelCol: { xs: { span: 24 }, sm: { span: 8 } },
    wrapperCol: { xs: { span: 24 }, sm: { span: 16 } },
  };
  
  const tailFormItemLayout = {
    wrapperCol: { xs: { span: 24, offset: 0 }, sm: { span: 16, offset: 8 } },
  };

  return (
    <Card
      style={{ 
        maxWidth: '500px', 
        margin: '60px auto', 
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
      }}
    >
      <div style={{ padding: '10px 15px' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: '24px' }}>
          Create Account
        </Title>

        {/* Information about approval process - Restyled but still prominent */}
        <Alert
          message="Account Approval Required"
          description="After registration, your account will need to be approved by an administrator before you can log in."
          type="info"
          showIcon
          style={{ 
            marginBottom: '24px', 
            borderRadius: '8px',
            border: '1px solid #91caff',
            backgroundColor: '#e6f4ff',
            padding: '12px 16px'
          }}
        />

        <Form
          {...formItemLayout}
          form={form}
          name="register"
          onFinish={handleRegister}
          scrollToFirstError
          size="middle"
        >
          {error && (
            <Form.Item wrapperCol={{ ...tailFormItemLayout.wrapperCol }} style={{ marginBottom: '16px' }}>
              <Alert 
                message={error} 
                type="error" 
                showIcon 
                closable 
                onClose={() => setError(null)}
                style={{ borderRadius: '6px' }}
              />
            </Form.Item>
          )}

          {/* Username Input */}
          <Form.Item
            name="username"
            label={<Text strong>Username</Text>}
            rules={[
              { required: true, message: 'Please input your desired Username!', whitespace: true },
              { min: 3, message: 'Username must be at least 3 characters long.' }
            ]}
          >
            <Input placeholder="Enter your username" />
          </Form.Item>

          {/* Password Input */}
          <Form.Item
            name="password"
            label={<Text strong>Password</Text>}
            rules={[
              { required: true, message: 'Please input your Password!' },
              { min: 8, message: 'Password must be at least 8 characters long.' },
              {
                pattern: /[A-Z]/,
                message: 'Password must contain at least one uppercase letter.'
              },
              {
                pattern: /[a-z]/,
                message: 'Password must contain at least one lowercase letter.'
              },
              {
                pattern: /\d/,
                message: 'Password must contain at least one digit.'
              },
              {
                pattern: /[!@#$%^&*(),.?":{}|<>]/,
                message: 'Password must contain at least one special character.'
              }
            ]}
            hasFeedback
            extra={
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters.
              </Text>
            }
          >
            <Input.Password placeholder="Enter your password" />
          </Form.Item>

          {/* Confirm Password - Fixed styling */}
          <Form.Item
            name="confirm"
            label={<Text strong>Confirm Password</Text>}
            dependencies={['password']}
            hasFeedback
            rules={[
              { required: true, message: 'Please confirm your password!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The two passwords do not match!'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Confirm your password" />
          </Form.Item>

          {/* Email Input */}
          <Form.Item
            name="email"
            label={<Text strong>E-mail</Text>}
            rules={[
              { type: 'email', message: 'The input is not valid E-mail!' },
              { required: true, message: 'Please input your E-mail!' }
            ]}
          >
            <Input placeholder="Enter your email address" />
          </Form.Item>

          {/* Firm Dropdown */}
          <Form.Item
            name="firm"
            label={<Text strong>Law Firm</Text>}
            rules={[{ required: true, message: 'Please select your law firm!' }]}
          >
            <Select placeholder="Select your law firm">
              {APPROVED_FIRMS.map(firm => (
                <Option key={firm} value={firm}>
                  {firm}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Submit Button */}
          <Form.Item {...tailFormItemLayout} style={{ marginTop: '24px' }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={isLoading} 
              block
              style={{ height: '36px', borderRadius: '4px' }}
            >
              {isLoading ? 'Registering...' : 'Register'}
            </Button>
          </Form.Item>
        </Form>

        <Divider style={{ margin: '24px 0 16px' }} />
        
        <div style={{ textAlign: 'center' }}>
          <Text style={{ fontSize: '16px' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#1890ff', fontWeight: 500 }}>
              Login here
            </Link>
          </Text>
        </div>
      </div>
    </Card>
  );
}

export default RegistrationPage;