// src/pages/CasePage/components/modals/EditCaseModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Modal, Form, Input, Alert, Row, Col, DatePicker, 
  Space, Button, Popconfirm, Tooltip, Tag, Spin, Typography
} from 'antd';
import { 
  CalendarOutlined, LockOutlined, UnlockOutlined, SyncOutlined, SaveOutlined, CloseOutlined
} from '@ant-design/icons';
import { caseFieldConfig } from '../../../../config/caseFieldConfig';
import moment from 'moment';
import { formatDate } from '../../../../utils/dateUtils';
import { useSuggestions } from '../../hooks/useSuggestions';
import { useParams } from 'react-router-dom';

const { TextArea } = Input;

function EditCaseModal({ 
  isOpen, 
  onCancel, 
  onSave, 
  caseDetails, 
  loading,
  onSuccess
}) {
  const [form] = Form.useForm();
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialValues, setInitialValues] = useState({});
  const formRef = useRef(null);
  
  // Use our improved suggestions hook
  const { 
    lockedFields, 
    toggleFieldLock, 
    isFieldLocked, 
    isFieldLockPending, 
    isLocking 
  } = useSuggestions(caseDetails || null, onSuccess);
  
  // Set form values when modal opens or case details change
  useEffect(() => {
    if (isOpen && caseDetails) {
      const values = {};
      caseFieldConfig.forEach(field => {
        if (field.isEditable) {
          const currentValue = field.isDedicated
            ? caseDetails[field.name]
            : (caseDetails.case_details ? caseDetails.case_details[field.name] : undefined);

          // Handle date fields
          if (field.type === 'date' && currentValue) {
            // Ensure we properly parse date strings or handle date objects
            if (typeof currentValue === 'string') {
              // Try to parse as a date string
              const parsedDate = moment(currentValue);
              values[field.name] = parsedDate.isValid() ? parsedDate : null;
            } else if (currentValue instanceof Date) {
              // Handle Date objects
              values[field.name] = moment(currentValue);
            } else {
              // Already a moment object or something else
              values[field.name] = currentValue;
            }
          } else {
            values[field.name] = currentValue ?? '';
          }
        }
      });
      setInitialValues(values);
      form.setFieldsValue(values);
    }
  }, [isOpen, caseDetails, form]);
  
  const handleSubmit = async (values) => {
    setError(null);
    setIsSubmitting(true);
    
    try {
      console.log('Form values before formatting:', values);
      
      // Format dates for submission
      const formattedValues = { ...values };
      caseFieldConfig.forEach(field => {
        if (field.type === 'date' && formattedValues[field.name]) {
          if (moment.isMoment(formattedValues[field.name])) {
            formattedValues[field.name] = formattedValues[field.name].format('YYYY-MM-DD');
          } else if (formattedValues[field.name] instanceof Date) {
            formattedValues[field.name] = moment(formattedValues[field.name]).format('YYYY-MM-DD');
          }
          // If it's already a string in the correct format, leave it as is
        }
      });

      console.log('Form values after date formatting:', formattedValues);

      // Split values into dedicated fields and case_details
      const dedicatedFields = {};
      const caseDetailsFields = {};
      
      caseFieldConfig.forEach(field => {
        if (field.isEditable) {
          const value = formattedValues[field.name];
          if (field.isDedicated) {
            dedicatedFields[field.name] = value;
          } else {
            caseDetailsFields[field.name] = value;
          }
        }
      });

      // Make sure we preserve existing case_details not in the form
      const existingCaseDetails = caseDetails?.case_details || {};
      
      // Create the update payload
      const payload = {
        ...dedicatedFields,
        case_details: {
          ...existingCaseDetails,
          ...caseDetailsFields,
          locked_fields: lockedFields // IMPORTANT: Include current locked fields
        }
      };

      console.log('Sending update payload:', payload);
      
      const response = await onSave(payload);
      console.log('Update response:', response);
      
      // Call onSuccess to trigger refresh if provided
      if (onSuccess) {
        await onSuccess();
      }
      
      onCancel();
    } catch (err) {
      console.error('Error saving case:', err);
      setError(err.message || 'Failed to save case');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Modal
      title="Edit Case Information"
      open={isOpen}
      onCancel={onCancel}
      footer={null}
      width={800}
    >
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={initialValues}
        ref={formRef}
      >
        <Row gutter={[16, 0]}>
          {caseFieldConfig.map(field => {
            const isDate = field.type === 'date' || field.name.includes('date');
            const isLocked = isFieldLocked(field.name);
            const isPending = isFieldLockPending(field.name);
            
            return (
              <Col 
                xs={24} 
                sm={field.span === 3 ? 24 : 12} 
                md={field.span === 3 ? 24 : 12} 
                key={field.name}
              >
                <Form.Item
                  label={
                    <Space>
                      {field.label}
                      {isLocked && <Tag color="red" icon={<LockOutlined />}>Locked</Tag>}
                      <Popconfirm
                        title={`${isLocked ? 'Unlock' : 'Lock'} this field?`}
                        description={`Are you sure you want to ${isLocked ? 'unlock' : 'lock'} this field? ${isLocked ? 'This will allow suggestions for this field.' : 'This will prevent suggestions for this field.'}`}
                        onConfirm={() => toggleFieldLock(field.name)}
                        okText={isLocked ? "Unlock" : "Lock"}
                        cancelText="Cancel"
                        disabled={isPending || isLocking}
                      >
                        <Tooltip title={
                          isPending 
                            ? "Processing..." 
                            : isLocked 
                              ? "Field is locked - click to unlock" 
                              : "Field is unlocked - click to lock"
                        }>
                          <Button
                            type="text"
                            size="small"
                            icon={
                              isPending 
                                ? <SyncOutlined spin /> 
                                : isLocked 
                                  ? <LockOutlined /> 
                                  : <UnlockOutlined />
                            }
                            style={{ padding: '0 4px' }}
                            loading={isPending}
                            disabled={isPending || isLocking}
                          />
                        </Tooltip>
                      </Popconfirm>
                    </Space>
                  }
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
                      disabled={loading || isSubmitting || isLocked}
                      placeholder={field.placeholder}
                      rows={4}
                    />
                  ) : isDate ? (
                    <DatePicker 
                      style={{ width: '100%' }}
                      disabled={loading || isSubmitting || isLocked}
                      format="MMMM D, YYYY"
                      placeholder="Select Date"
                    />
                  ) : (
                    <Input
                      disabled={loading || isSubmitting || isLocked}
                      placeholder={field.placeholder}
                      prefix={field.name.includes('date') && !isDate ? <CalendarOutlined /> : null}
                    />
                  )}
                </Form.Item>
              </Col>
            );
          })}
        </Row>
        
        <Form.Item>
          <Space>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={isSubmitting || isLocking}
              disabled={isLocking}
            >
              Save Changes
            </Button>
            <Button onClick={onCancel} disabled={isSubmitting || isLocking}>
              Cancel
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default EditCaseModal;