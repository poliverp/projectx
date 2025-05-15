// frontend/src/pages/cases/ManageCasesScreen.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-toastify';
// --- Ant Design Imports ---
import { Table, Button, Input, Space, Typography, Popconfirm, Alert, Card, Row, Col, Statistic } from 'antd';
import { PlusOutlined, DeleteOutlined, FileTextOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Search } = Input;

function ManageCasesScreen() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // Fetch cases function (Keep existing useCallback)
  const fetchCases = useCallback(() => {
    setLoading(true);
    api.getCases()
      .then(response => {
        setCases(response.data || []);
        setError(null);
      })
      .catch(err => {
        console.error("Error fetching cases:", err);
        const errorMsg = err.response?.data?.error || "Failed to load cases. Please try again.";
        setError(errorMsg);
        setCases([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // Fetch cases on component mount (Keep existing useEffect)
  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // Filter cases based on search term (Keep existing useMemo)
  const filteredCases = useMemo(() => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    if (!lowerSearchTerm) {
      return cases;
    }
    // Filter primarily on display_name, add others if desired
    return cases.filter(c =>
      (c.display_name?.toLowerCase() || '').includes(lowerSearchTerm) ||
      (c.case_number?.toLowerCase() || '').includes(lowerSearchTerm)
    );
  }, [searchTerm, cases]);

  // Handle Delete (Adapts slightly for Popconfirm)
  const handleDeleteCase = async (caseId) => {
    setLoading(true); // Indicate loading during delete
    setError(null);
    try {
      await api.deleteCase(caseId);
      setCases(prevCases => prevCases.filter(c => c.id !== caseId)); // Update state
      toast.success('Case deleted successfully!'); // Use toast for feedback
    } catch (err) {
      console.error("Error deleting case:", err);
      const errorMsg = `Failed to delete case: ${err.response?.data?.error || err.message}`;
      setError(errorMsg);
      toast.error(errorMsg); // Show error toast
    } finally {
        setLoading(false);
    }
  };

  // Define columns for AntD Table
  const columns = [
    {
      title: 'Display Name',
      dataIndex: 'display_name',
      key: 'display_name',
      sorter: (a, b) => a.display_name.localeCompare(b.display_name),
      render: (text, record) => (
        <Link to={`/case/${record.id}`} style={{ fontWeight: 'bold' }}>
          {text}
        </Link>
      ),
    },
    {
      title: 'Case Number',
      dataIndex: 'case_number',
      key: 'case_number',
    },
    {
      title: 'Filing Date',
      dataIndex: 'filing_date',
      key: 'filing_date',
      render: (date) => date ? new Date(date).toLocaleDateString() : '-',
      sorter: (a, b) => new Date(a.filing_date || 0) - new Date(b.filing_date || 0),
    },
    {
      title: 'Case Type',
      dataIndex: 'case_type',
      key: 'case_type',
    },
    {
      title: 'Last Updated',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (date) => date ? new Date(date).toLocaleDateString() : '-',
      sorter: (a, b) => new Date(a.updated_at || 0) - new Date(b.updated_at || 0),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Popconfirm
            title="Delete the case"
            description={`Are you sure you want to delete "${record.display_name}"?`}
            onConfirm={() => handleDeleteCase(record.id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button 
              danger 
              icon={<DeleteOutlined />}
              type="text"
              style={{ padding: '4px 8px' }}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Case Management Header Box */}
      <Card style={{ marginBottom: '20px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={16}>
            <Space direction="vertical" size={0}>
              <Title level={2} style={{ margin: 0 }}>Case Management</Title>
              <Text type="secondary">View and manage all your legal cases</Text>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Row justify="end">
              <Col>
                <Statistic 
                  title="Total Cases" 
                  value={cases.length} 
                  prefix={<FileTextOutlined />} 
                />
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Action Bar */}
      <Space style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap' }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/cases/new')}
          disabled={loading}
        >
          Create New Case
        </Button>
        <Search
          placeholder="Filter cases..."
          allowClear
          onSearch={(value) => setSearchTerm(value)}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: 300 }}
          loading={loading && cases.length > 0}
        />
      </Space>

      {/* Error Alert */}
      {error && <Alert message={error} type="error" closable onClose={() => setError(null)} style={{ marginBottom: '20px' }} />}

      {/* Case Table */}
      <Table
        columns={columns}
        dataSource={filteredCases}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: false,
          position: ['bottomCenter'],
          itemRender: (page, type, originalElement) => {
            if (type === 'page') {
              return (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  margin: '0',
                  padding: '0'
                }}>
                  {page}
                </div>
              );
            }
            return originalElement;
          }
        }}
      />
    </div>
  );
}

export default ManageCasesScreen;