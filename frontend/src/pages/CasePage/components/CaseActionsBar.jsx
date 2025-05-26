// src/pages/CasePage/components/CaseActionsBar.jsx
import React from 'react';
import { Card, Space, Button } from 'antd';
import { Link } from 'react-router-dom';
import {
  FolderOutlined,
  SearchOutlined,
  FileAddOutlined,
  FileDoneOutlined,
  UploadOutlined,
  ExperimentOutlined
} from '@ant-design/icons';

// Define the brown theme colors
const BROWN_COLOR = '#8B4513';
const BROWN_HOVER = '#A0522D';

function CaseActionsBar({ caseId, onManageFiles, onAnalyzeDocuments, fileUploadRef, analyzeDocBtnRef }) {
  return (
    <Card size="small" className="case-actions-card" style={{ marginTop: '16px' }}>
      <Space wrap size="middle">
        <Button
          type="primary"
          icon={<FolderOutlined />}
          onClick={onManageFiles}
          style={{
            backgroundColor: BROWN_COLOR,
            borderColor: BROWN_COLOR,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = BROWN_HOVER;
            e.currentTarget.style.borderColor = BROWN_HOVER;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = BROWN_COLOR;
            e.currentTarget.style.borderColor = BROWN_COLOR;
          }}
          ref={fileUploadRef}
        >
          Manage Files
        </Button>
        
        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={onAnalyzeDocuments}
          style={{
            backgroundColor: BROWN_COLOR,
            borderColor: BROWN_COLOR,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = BROWN_HOVER;
            e.currentTarget.style.borderColor = BROWN_HOVER;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = BROWN_COLOR;
            e.currentTarget.style.borderColor = BROWN_COLOR;
          }}
          ref={analyzeDocBtnRef}
        >
          Analyze Documents
        </Button>
        
        <Button
          type="primary"
          icon={<FileAddOutlined />}
          style={{
            backgroundColor: BROWN_COLOR,
            borderColor: BROWN_COLOR,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = BROWN_HOVER;
            e.currentTarget.style.borderColor = BROWN_HOVER;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = BROWN_COLOR;
            e.currentTarget.style.borderColor = BROWN_COLOR;
          }}
        >
          <Link to={`/case/${caseId}/discovery`} style={{ color: '#fff' }}>Discovery</Link>
        </Button>
      </Space>
    </Card>
  );
}

export default CaseActionsBar;