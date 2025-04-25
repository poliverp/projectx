// frontend/src/pages/ManageCasesScreen.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';
// --- ADDED: Ant Design Imports ---
import { Table, Button, Input, Space, Typography, Popconfirm, Alert, Spin } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
// --- END ADDED ---

const { Title } = Typography;
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
        // toast.error(errorMsg); // Optionally show toast on fetch error
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
      (c.official_case_name?.toLowerCase() || '').includes(lowerSearchTerm) ||
      (c.case_number?.toLowerCase() || '').includes(lowerSearchTerm)
    );
  }, [searchTerm, cases]);

  // --- REMOVED: handleCreateCase using prompt ---

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

  // --- ADDED: Define columns for AntD Table ---
  const columns = [
    {
      title: 'Display Name',
      dataIndex: 'display_name',
      key: 'display_name',
      sorter: (a, b) => a.display_name.localeCompare(b.display_name),
      render: (text, record) => <Link to={`/case/${record.id}`}>{text}</Link>, // Make name a link
    },
    {
      title: 'Official Name',
      dataIndex: 'official_case_name',
      key: 'official_case_name',
      sorter: (a, b) => (a.official_case_name || '').localeCompare(b.official_case_name || ''),
    },
    {
      title: 'Case Number',
      dataIndex: 'case_number',
      key: 'case_number',
    },
    {
      title: 'Last Updated',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (date) => date ? new Date(date).toLocaleDateString() : '-', // Format date
      sorter: (a, b) => new Date(a.updated_at || 0) - new Date(b.updated_at || 0),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => ( // Use '_' if first argument (text) isn't needed
        <Space size="middle">
          <Button
             type="link" // Use link style button for less emphasis
             icon={<EyeOutlined />}
             onClick={() => navigate(`/case/${record.id}`)}
          >
            View
          </Button>
          {/* Add Edit button later */}
          {/* <Button type="link" icon={<EditOutlined />} onClick={() => navigate(`/case/${record.id}/edit`)}>Edit</Button> */}
          <Popconfirm
            title="Delete the case"
            description={`Are you sure you want to delete "${record.display_name}"?`}
            onConfirm={() => handleDeleteCase(record.id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }} // Make OK button red
          >
            <Button danger icon={<DeleteOutlined />}> {/* Use danger style button */}
                Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  // --- END ADDED ---


  return (
    <div>
      {/* Use AntD Typography Title */}
      <Title level={2}>Manage Cases</Title>

      {/* Use AntD Space, Button, Input.Search */}
      <Space style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap' }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/cases/new')} // Navigate to create page
          disabled={loading}
        >
          Create New Case
        </Button>
        <Search
          placeholder="Filter cases..."
          allowClear // Adds a clear button
          onSearch={(value) => setSearchTerm(value)} // Can trigger search on Enter
          onChange={(e) => setSearchTerm(e.target.value)} // Update search term as user types
          style={{ width: 300 }}
          loading={loading && cases.length > 0} // Show loading indicator on search if desired
        />
        {/* Keep Back link if needed, maybe style as button */}
        {/* <Button><Link to="/">Back to Home</Link></Button> */}
      </Space>

      {/* Use AntD Alert for general errors */}
      {error && <Alert message={error} type="error" closable onClose={() => setError(null)} style={{ marginBottom: '20px' }} />}

      {/* Use AntD Table to display cases */}
      <Table
        columns={columns}
        dataSource={filteredCases} // Use the memoized filtered data
        loading={loading} // Use AntD Table's loading state
        rowKey="id" // Specify the unique key for each row
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