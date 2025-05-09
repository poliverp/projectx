// src/pages/CasePage/components/CaseActionsBar.jsx
import React from 'react';
import { Card, Space, Button } from 'antd';
import { Link } from 'react-router-dom';
import {
  FolderOutlined,
  SearchOutlined,
  FileAddOutlined,
  FileDoneOutlined
} from '@ant-design/icons';

function CaseActionsBar({ caseId, onManageFiles, onAnalyzeDocuments }) {
  return (
    <Card size="small" className="case-actions-card" style={{ marginTop: '16px' }}>
      <Space wrap size="middle">
        <Button
          type="primary"
          icon={<FolderOutlined />}
          onClick={onManageFiles}
        >
          Manage Files
        </Button>
        
        <Button
          icon={<SearchOutlined />}
          onClick={onAnalyzeDocuments}
        >
          Analyze Documents
        </Button>
        
        <Button
          icon={<FileAddOutlined />}
        >
          <Link to={`/case/${caseId}/discovery`}>Discovery</Link>
        </Button>
      </Space>
    </Card>
  );
}

export default CaseActionsBar;