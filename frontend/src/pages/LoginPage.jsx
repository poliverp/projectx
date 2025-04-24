// frontend/src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react'; // Keep useEffect
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from 'react-toastify';
// --- ADDED: Import Ant Design components ---
import { Form, Input, Button, Checkbox, Alert } from 'antd';
// --- END ADDED ---

function LoginPage() {
  const navigate = useNavigate();
  const { login, currentUser } = useAuth();
  // --- ADDED: AntD Form instance ---
  const [form] = Form.useForm();
  // --- END ADDED ---

  // State for loading and general form errors
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- State variables for username, password, remember are no longer needed ---
  // AntD Form manages field state internally via the 'name' prop on Form.Item

  // Redirect if already logged in (Keep this logic)
  useEffect(() => {
    if (currentUser) {
      console.log('User already logged in, redirecting from Login page...');
      navigate('/manage-cases');
    }
  }, [currentUser, navigate]);

  // --- MODIFIED: Use onFinish for AntD Form submission ---
  const handleLogin = async (values) => {
    // 'values' contains { username: '...', password: '...', remember: true/false }
    const { username, password, remember } = values;

    setIsLoading(true);
    setError(null); // Clear previous errors

    // No need to check '!username || !password' here,
    // AntD Form rules handle required fields before calling onFinish

    try {
      const response = await api.login({ username, password, remember });
      console.log('Login successful:', response.data);
      if (response.data && response.data.user) {
        login(response.data.user); // Update context state
        toast.success(`Welcome back, ${response.data.user.username}!`);
        navigate('/manage-cases');
      } else {
         const errorMsg = 'Login succeeded but no user data received.';
         setError(errorMsg);
         toast.warn(errorMsg);
      }
    } catch (err) {
      console.error('Login failed:', err);
      const errorMsg = err.response?.data?.error || 'Login failed. Please check credentials.';
      setError(errorMsg); // Set error state for Alert display
      // toast.error(errorMsg); // Optionally keep toast for errors too
    } finally {
      setIsLoading(false);
    }
  };
  // --- END MODIFIED ---

  // Render nothing while redirecting (Keep this logic)
  if (currentUser) {
      return <div>Redirecting...</div>;
  }

  // Optional: Define layout for Form Items
  const formItemLayout = {
    labelCol: { xs: { span: 24 }, sm: { span: 6 } }, // Label takes full width on small screens
    wrapperCol: { xs: { span: 24 }, sm: { span: 16 } }, // Input takes full width on small screens
  };
  const tailFormItemLayout = {
    wrapperCol: { xs: { span: 24, offset: 0 }, sm: { span: 16, offset: 6 } }, // Align button with inputs on larger screens
  };

  return (
    // Add some basic centering and styling for the form container
    <div style={{ maxWidth: '500px', margin: '40px auto', padding: '30px', border: '1px solid #d9d9d9', borderRadius: '8px', background: '#fff' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Login</h2>

      {/* --- MODIFIED: Use AntD Form component --- */}
      <Form
        {...formItemLayout}
        form={form}
        name="login"
        onFinish={handleLogin} // Use onFinish instead of onSubmit
        initialValues={{ remember: false }} // Set default for checkbox
        scrollToFirstError
      >
        {/* Display general form error if API call fails */}
        {error && (
            <Form.Item wrapperCol={{ ...tailFormItemLayout.wrapperCol }} style={{ marginBottom: 16 }}>
               <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} />
            </Form.Item>
        )}

        {/* Username Input */}
        <Form.Item
          name="username" // Used by onFinish to collect value
          label="Username"
          rules={[{ required: true, message: 'Please input your Username!' }]} // Basic validation rule
        >
          <Input />
        </Form.Item>

        {/* Password Input */}
        <Form.Item
          name="password" // Used by onFinish
          label="Password"
          rules={[{ required: true, message: 'Please input your Password!' }]}
        >
          {/* Use Input.Password for visibility toggle icon */}
          <Input.Password />
        </Form.Item>

        {/* Remember Me Checkbox */}
        <Form.Item
          name="remember"
          valuePropName="checked" // Needed for Checkbox within Form.Item
          {...tailFormItemLayout} // Align it like the button
        >
          <Checkbox>Remember Me</Checkbox>
        </Form.Item>

        {/* Submit Button */}
        <Form.Item {...tailFormItemLayout}> {/* Align the button */}
          <Button type="primary" htmlType="submit" loading={isLoading} block> {/* block makes button full width */}
            {isLoading ? 'Logging In...' : 'Login'}
          </Button>
        </Form.Item>
      </Form>
      {/* --- END MODIFIED --- */}

      <p style={{ marginTop: '20px', textAlign: 'center' }}>
        Don't have an account? <Link to="/register">Register here</Link>
      </p>
    </div>
  );
}

export default LoginPage;