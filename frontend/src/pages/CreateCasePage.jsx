// src/pages/CreateCasePage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api'; // Adjust path if needed
import {
    Form,
    Input,
    Button,
    Typography,
    Alert,
    Space,
    Spin, // Import Spin for visual feedback if needed elsewhere, Button handles its own loading
    Card // Import Card for layout consistency
} from 'antd';
import { SaveOutlined, CloseCircleOutlined } from '@ant-design/icons'; // Import relevant icons

const { Title } = Typography;

function CreateCasePage() {
    const navigate = useNavigate();
    // Ant Design Form instance
    const [form] = Form.useForm();

    // State for loading and errors during submission - Keep these
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- Refactored Submission Handler for Ant Design Form ---
    // 'onFinish' is called by Ant Design Form when validation passes
    const onFinish = async (values) => {
        setLoading(true);
        setError(null);

        // 'values' object contains form field data, keys match 'name' prop in Form.Item
        // e.g., values.display_name, values.official_case_name

        console.log("Form values received:", values);

        // Construct Data Payload (keys should match backend expectations)
        const caseData = {
            display_name: values.display_name?.trim() || '', // Use ?. and provide default
            official_case_name: values.official_case_name?.trim() || null,
            case_number: values.case_number?.trim() || null,
            judge: values.judge?.trim() || null,
            plaintiff: values.plaintiff?.trim() || null,
            defendant: values.defendant?.trim() || null,
            // case_details: {} // Initialize if needed
        };

        console.log("Submitting New Case Data:", caseData);

        try {
            // Call API
            const response = await api.createCase(caseData); // Assumes api.createCase exists
            console.log("Case created successfully:", response.data);

            // Handle Success
            const newCaseId = response.data?.id;
            if (newCaseId) {
                // Optionally show success message before navigating
                 // Consider using Ant Design message for consistency if desired
                // message.success('Case created successfully!');
                alert("Case created successfully!"); // Keep alert for now
                navigate(`/case/${newCaseId}`);
            } else {
                console.warn("New case ID not found in backend response, navigating to list.");
                alert("Case created successfully! (ID missing)"); // Provide feedback
                navigate('/manage-cases');
            }
        } catch (err) {
            // Handle Errors
            console.error("Error creating case:", err);
            const backendError = err.response?.data?.error || 'An unknown error occurred.';
            let displayError = `Failed to create case: ${backendError}`;
            if (err.response?.status === 409) { // Handle specific errors like duplicates
                displayError = `Failed to create case: ${backendError}. Please use a unique Display Name.`;
            }
            setError(displayError);
        } finally {
            // Reset Loading State
            setLoading(false);
        }
    };

    // Optional: Handle validation errors (e.g., log them)
    const onFinishFailed = (errorInfo) => {
        console.log('Form validation failed:', errorInfo);
        setError("Please fill in all required fields correctly."); // Set a general validation error message
    };


    return (
        // Wrap content in a Card for consistent look and feel
        <Card title={<Title level={2} style={{ margin: 0 }}>Create New Case</Title>}>
            {/* Use Ant Design Form */}
            <Form
                form={form} // Connect form instance
                layout="vertical" // Stack labels above inputs
                onFinish={onFinish} // Handle successful submission & validation
                onFinishFailed={onFinishFailed} // Handle validation errors
                // initialValues={{ /* Set initial values here if needed */ }}
            >
                {/* Display general submission errors */}
                {error && (
                    <Alert
                        message="Error Creating Case"
                        description={error}
                        type="error"
                        showIcon
                        closable
                        onClose={() => setError(null)} // Allow dismissing the error
                        style={{ marginBottom: 24 }} // Add spacing below error
                    />
                )}

                {/* Display Name (Required) */}
                <Form.Item
                    label="Display Name"
                    name="display_name" // <<< This key is used in 'onFinish' values object
                    rules={[ // <<< Ant Design validation rules
                        {
                            required: true,
                            message: 'Please enter a display name for the case!',
                            whitespace: true // Treat whitespace input as error
                        }
                    ]}
                >
                    <Input
                       placeholder="Enter a short name for easy identification"
                       disabled={loading}
                    />
                    {/* No value or onChange needed - Form handles state */}
                </Form.Item>

                {/* Official Case Name */}
                <Form.Item
                    label="Official Case Name"
                    name="official_case_name"
                    rules={[{ required: false }]} // Not required
                >
                    <Input
                       placeholder="e.g., Smith v. Jones"
                       disabled={loading}
                    />
                </Form.Item>

                {/* Case Number */}
                <Form.Item
                    label="Case Number"
                    name="case_number"
                    rules={[{ required: false }]}
                >
                    <Input
                       placeholder="e.g., 2:24-cv-01234"
                       disabled={loading}
                    />
                </Form.Item>

                {/* Judge */}
                <Form.Item
                    label="Judge"
                    name="judge"
                    rules={[{ required: false }]}
                >
                    <Input
                       placeholder="e.g., Hon. Jane Doe"
                       disabled={loading}
                    />
                </Form.Item>

                {/* Plaintiff */}
                <Form.Item
                    label="Plaintiff"
                    name="plaintiff"
                    rules={[{ required: false }]}
                >
                    <Input
                       placeholder="Primary plaintiff name"
                       disabled={loading}
                    />
                </Form.Item>

                {/* Defendant */}
                <Form.Item
                    label="Defendant"
                    name="defendant"
                    rules={[{ required: false }]}
                >
                    <Input
                       placeholder="Primary defendant name"
                       disabled={loading}
                    />
                </Form.Item>

                {/* --- Add other fields similarly --- */}

                {/* Submission Buttons */}
                <Form.Item> {/* Wrap buttons in Form.Item for layout spacing */}
                    <Space>
                        <Button
                            type="primary"
                            htmlType="submit" // Triggers form 'onFinish'
                            loading={loading} // Shows loading spinner on button
                            icon={<SaveOutlined />}
                        >
                            Create Case
                        </Button>
                        <Button
                            icon={<CloseCircleOutlined />}
                            onClick={() => navigate('/manage-cases')} // Navigate back on cancel
                            disabled={loading} // Disable cancel while submitting
                        >
                            Cancel
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        </Card>
    );
}

export default CreateCasePage;