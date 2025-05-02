// src/pages/CasePage/components/modals/EditCaseModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Alert, Row, Col, DatePicker } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { caseFieldConfig } from '../../../../config/caseFieldConfig';
import moment from 'moment'; // Make sure this import works
import { formatDate } from '../../../../utils/dateUtils';

const { TextArea } = Input;

function EditCaseModal({ 
  isOpen, 
  onCancel, 
  onSave, 
  caseDetails, 
  loading 
}) {
  const [form] = Form.useForm();
  const [error, setError] = useState(null);
  
  // Set form values when modal opens or case details change
  useEffect(() => {
    if (isOpen && caseDetails) {
      const initialValues = {};
      
      caseFieldConfig.forEach(field => {
        if (field.isEditable) {
          let currentValue = field.isDedicated
            ? caseDetails[field.name]
            : (caseDetails.case_details ? caseDetails.case_details[field.name] : undefined);
          
          // For date fields, convert to moment objects for DatePicker
          if (field.type === 'date' || field.name.includes('date')) {
            if (currentValue && currentValue !== '') {
              try {
                // Use moment to parse the date
                const momentDate = moment(currentValue);
                if (momentDate.isValid()) {
                  currentValue = momentDate;
                } else {
                  currentValue = null;
                }
              } catch (e) {
                console.error('Error parsing date:', e);
                currentValue = null;
              }
            } else {
              currentValue = null;
            }
          }
          
          initialValues[field.name] = currentValue ?? '';
        }
      });
      
      form.setFieldsValue(initialValues);
    }
  }, [isOpen, caseDetails, form]);
  
  // Handle form submission
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // Convert moment objects back to strings for API
      const formattedValues = { ...values };
      caseFieldConfig.forEach(field => {
        if ((field.type === 'date' || field.name.includes('date')) && formattedValues[field.name]) {
          // If it's a moment object, convert to ISO format for backend
          if (moment.isMoment(formattedValues[field.name])) {
            formattedValues[field.name] = formattedValues[field.name].format('YYYY-MM-DD');
          }
        }
      });
      
      setError(null);
      onSave(formattedValues);
    } catch (errorInfo) {
      console.error('Form validation failed:', errorInfo);
      setError('Please check the form for errors.');
    }
  };
  
  return (
    <Modal
      title="Edit Case Information"
      open={isOpen}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="Save Changes"
      okButtonProps={{ disabled: loading }}
      cancelButtonProps={{ disabled: loading }}
      destroyOnClose
      maskClosable={!loading}
      width={700}
    >
      {error && (
        <Alert
          message="Form Error"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}
      
      <Form
        form={form}
        layout="vertical"
      >
        <Row gutter={[16, 0]}>
          {caseFieldConfig
            .filter(field => field.isEditable === true)
            .map(field => {
              const isDate = field.type === 'date' || field.name.includes('date');
              
              return (
                <Col xs={24} sm={field.span === 3 ? 24 : 12} md={field.span === 3 ? 24 : 12} key={field.name}>
                  <Form.Item
                    label={field.label}
                    name={field.name}
                    required={field.isRequired}
                    rules={[
                      {
                        required: field.isRequired,
                        message: `Please input ${field.label}!`
                      }
                    ]}
                  >
                    {field.type === 'textarea' ? (
                      <TextArea
                        disabled={loading}
                        placeholder={field.placeholder}
                        rows={4}
                      />
                    ) : isDate ? (
                      <DatePicker 
                        style={{ width: '100%' }}
                        disabled={loading}
                        format="MMMM D, YYYY" // Format for display in the datepicker
                        placeholder="Select Date" // Updated placeholder
                      />
                    ) : (
                      <Input
                        disabled={loading}
                        placeholder={field.placeholder}
                        prefix={field.name.includes('date') && !isDate ? <CalendarOutlined /> : null}
                      />
                    )}
                  </Form.Item>
                </Col>
              );
            })}
        </Row>
      </Form>
    </Modal>
  );
}

export default EditCaseModal;