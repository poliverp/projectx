// frontend/src/pages/RegistrationPage.jsx
import React, { useState, useEffect } from 'react'; // Keep useEffect
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Keep useAuth hook
import api from '../services/api';
import { toast } from 'react-toastify'; // Keep toast import
// --- ADDED: Import Ant Design components ---
import { Form, Input, Button, Alert } from 'antd';
// --- END ADDED ---

function RegistrationPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  // --- ADDED: AntD Form instance ---
  const [form] = Form.useForm();
  // --- END ADDED ---

  // State only needed for loading and general form errors now
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Removed useState for username, password, email ---

  // Redirect if already logged in (Keep this logic)
  useEffect(() => {
    if (currentUser) {
      console.log('User already logged in, redirecting from Register page...');
      navigate('/manage-cases');
    }
  }, [currentUser, navigate]);

  // --- MODIFIED: Use onFinish for AntD Form submission ---
  const handleRegister = async (values) => {
    // values = { username: '...', password: '...', email: '...' } from Form
    const { username, password, email } = values;

    setIsLoading(true);
    setError(null); // Clear previous errors

    // AntD rules handle required fields

    try {
      const response = await api.register({ username, password, email });
      console.log('Registration successful:', response.data);
      toast.success('Registration successful! Please log in.');
      form.resetFields(); // Reset form fields on success
      navigate('/login'); // Redirect to login page
    } catch (err) {
      console.error('Registration failed:', err);
      const errorMsg = err.response?.data?.error || 'Registration failed. Please try again.';
      setError(errorMsg); // Set error state for Alert display
      toast.error(errorMsg); // Also show toast notification
    } finally {
      setIsLoading(false);
    }
  };
  // --- END MODIFIED ---

  // Render nothing while redirecting (Keep this logic)
  if (currentUser) {
      return <div>Redirecting...</div>;
  }

  // Optional: Define layout for Form Items (consistent with LoginPage)
  const formItemLayout = {
    labelCol: { xs: { span: 24 }, sm: { span: 6 } },
    wrapperCol: { xs: { span: 24 }, sm: { span: 16 } },
  };
  const tailFormItemLayout = {
    wrapperCol: { xs: { span: 24, offset: 0 }, sm: { span: 16, offset: 6 } },
  };

  return (
    // Use consistent styling for the form container
    <div style={{ maxWidth: '500px', margin: '40px auto', padding: '30px', border: '1px solid #d9d9d9', borderRadius: '8px', background: '#fff' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Register New Account</h2>

      {/* --- MODIFIED: Use AntD Form component --- */}
      <Form
        {...formItemLayout}
        form={form}
        name="register"
        onFinish={handleRegister} // Use onFinish
        scrollToFirstError // Scrolls to the first validation error on submit
      >
        {/* Display general form error */}
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
            { required: true, message: 'Please input your desired Username!', whitespace: true }
            // Add other username rules if needed (e.g., length)
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
            // Optional: Add password complexity rules here
            // { min: 8, message: 'Password must be at least 8 characters!' }
          ]}
          hasFeedback // Shows validation status icon
        >
          <Input.Password />
        </Form.Item>

        {/* Confirm Password (Example - Recommended) */}
        {/* This requires adding a 'confirm' state/field and validator */}
        <Form.Item
            name="confirm"
            label="Confirm Password"
            dependencies={['password']} // Makes this field re-validate when 'password' changes
            hasFeedback
            rules={[
                { required: true, message: 'Please confirm your password!' },
                // Custom validator function
                ({ getFieldValue }) => ({
                    validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                            return Promise.resolve(); // Validation passes
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
            { required: true, message: 'Please input your E-mail!' } // Now required
          ]}
        >
          <Input />
        </Form.Item>

        {/* Submit Button */}
        <Form.Item {...tailFormItemLayout}>
          <Button type="primary" htmlType="submit" loading={isLoading} block>
            {isLoading ? 'Registering...' : 'Register'}
          </Button>
        </Form.Item>
      </Form>
      {/* --- END MODIFIED --- */}

      <p style={{ marginTop: '20px', textAlign: 'center' }}>
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </div>
  );
}

export default RegistrationPage;