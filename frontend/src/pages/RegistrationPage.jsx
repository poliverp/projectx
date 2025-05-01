// frontend/src/pages/RegistrationPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Form, Input, Button, Alert, Select, Typography } from 'antd';

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
      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '30px', border: '1px solid #d9d9d9', borderRadius: '8px', background: '#fff', textAlign: 'center' }}>
        <Title level={2}>Registration Successful!</Title>
        <div style={{ margin: '20px 0', padding: '20px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '4px' }}>
          <Title level={4} style={{ color: '#52c41a' }}>Your account is pending approval</Title>
          <Paragraph>
            Thank you for registering with ClerkLegal. Your account has been created successfully but requires administrator approval before you can log in.
          </Paragraph>
          <Paragraph>
            You will receive an email notification when your account has been approved.
          </Paragraph>
        </div>
        <Button type="primary" onClick={() => navigate('/login')}>
          Return to Login
        </Button>
      </div>
    );
  }

  const formItemLayout = {
    labelCol: { xs: { span: 24 }, sm: { span: 6 } },
    wrapperCol: { xs: { span: 24 }, sm: { span: 16 } },
  };
  
  const tailFormItemLayout = {
    wrapperCol: { xs: { span: 24, offset: 0 }, sm: { span: 16, offset: 6 } },
  };

  return (
    <div style={{ maxWidth: '500px', margin: '40px auto', padding: '30px', border: '1px solid #d9d9d9', borderRadius: '8px', background: '#fff' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Register New Account</h2>

      {/* Information about approval process */}
      <Alert
        message="Account Approval Required"
        description="After registration, your account will need to be approved by an administrator before you can log in."
        type="info"
        showIcon
        style={{ marginBottom: '20px' }}
      />

      <Form
        {...formItemLayout}
        form={form}
        name="register"
        onFinish={handleRegister}
        scrollToFirstError
      >
        {error && (
           <Form.Item wrapperCol={{ ...tailFormItemLayout.wrapperCol }} style={{ marginBottom: 16 }}>
               <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} />
           </Form.Item>
        )}

        {/* Username Input */}
        <Form.Item
          name="username"
          label="Username"
          rules={[
            { required: true, message: 'Please input your desired Username!', whitespace: true },
            { min: 3, message: 'Username must be at least 3 characters long.' }
          ]}
        >
          <Input />
        </Form.Item>

        {/* Password Input */}
        <Form.Item
          name="password"
          label="Password"
          rules={[
            { required: true, message: 'Please input your Password!' },
            { min: 8, message: 'Password must be at least 8 characters long.' }
          ]}
          hasFeedback
        >
          <Input.Password />
        </Form.Item>

        {/* Confirm Password */}
        <Form.Item
            name="confirm"
            label="Confirm Password"
            dependencies={['password']}
            hasFeedback
            rules={[
                { required: true, message: 'Please confirm your password!' },
                ({ getFieldValue }) => ({
                    validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                            return Promise.resolve();
                        }
                        return Promise.reject(new Error('The two passwords that you entered do not match!'));
                    },
                }),
            ]}
        >
            <Input.Password />
        </Form.Item>

        {/* Email Input */}
        <Form.Item
          name="email"
          label="E-mail"
          rules={[
            { type: 'email', message: 'The input is not valid E-mail!' },
            { required: true, message: 'Please input your E-mail!' }
          ]}
        >
          <Input />
        </Form.Item>

        {/* Firm Dropdown - NEW */}
        <Form.Item
          name="firm"
          label="Law Firm"
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
        <Form.Item {...tailFormItemLayout}>
          <Button type="primary" htmlType="submit" loading={isLoading} block>
            {isLoading ? 'Registering...' : 'Register'}
          </Button>
        </Form.Item>
      </Form>

      <p style={{ marginTop: '20px', textAlign: 'center' }}>
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </div>
  );
}

export default RegistrationPage;