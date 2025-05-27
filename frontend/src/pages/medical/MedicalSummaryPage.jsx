import React, { useState } from 'react';
import { Card, Typography, Upload, Button, Alert, Spin, message } from 'antd';
import { InboxOutlined, FileWordOutlined } from '@ant-design/icons';
import { summarizeMedicalRecords } from '../../services/api';

const { Title, Paragraph } = Typography;
const { Dragger } = Upload;

const MedicalSummaryPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);

  const handleUpload = async (info) => {
    setError(null);
    setDownloadUrl(null);
    const file = info.file.originFileObj;
    if (!file) return;
    setLoading(true);
    try {
      const response = await summarizeMedicalRecords(file);
      // Create a blob URL for download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      setDownloadUrl(url);
      message.success('Summary generated successfully!');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to summarize records.');
      message.error('Failed to summarize records.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Spin spinning={loading} tip="Processing...">
      <Card title={<Title level={4}>Medical Record Summary</Title>}>
        <Paragraph>
          Upload a PDF or Word document containing your medical provider table. The system will generate a summary in Word format.
        </Paragraph>
        <Dragger
          name="file"
          multiple={false}
          accept=".pdf,.docx"
          customRequest={({ file, onSuccess }) => {
            handleUpload({ file: { originFileObj: file } });
            setTimeout(() => onSuccess('ok'), 0);
          }}
          showUploadList={false}
          disabled={loading}
          style={{ marginBottom: 16 }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Click or drag PDF/DOCX file to this area to upload</p>
        </Dragger>
        {error && <Alert message="Error" description={error} type="error" showIcon style={{ marginBottom: 16 }} />}
        {downloadUrl && (
          <Button
            type="primary"
            icon={<FileWordOutlined />}
            href={downloadUrl}
            download="medical_record_summary.docx"
            style={{ marginTop: 16 }}
          >
            Download Summary
          </Button>
        )}
      </Card>
    </Spin>
  );
};

export default MedicalSummaryPage; 