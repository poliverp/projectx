import React, { useState, useEffect } from 'react';
import { Tour, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  FolderOutlined, 
  FileAddOutlined, 
  SearchOutlined, 
  FileSearchOutlined, 
  UserOutlined 
} from '@ant-design/icons';

const { Text, Title } = Typography;

const AppTutorial = () => {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Check if this is the user's first time
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (!hasSeenTutorial && currentUser) {
      // Small delay to ensure all elements are rendered
      setTimeout(() => setOpen(true), 1000);
    }
  }, [currentUser]);

  const steps = [
    {
      title: 'Welcome to ClerkLegal',
      description: (
        <div style={{ maxWidth: '300px' }}>
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px' }}>
            Let's take a quick tour of our AI-powered legal tools to help you get started.
          </Text>
        </div>
      ),
      target: () => document.querySelector('.ant-layout-header'),
      placement: 'bottom',
      cover: (
        <div style={{ 
          background: 'linear-gradient(135deg, #7A4D3B 0%, #A0522D 100%)',
          padding: '24px',
          borderRadius: '12px',
          color: 'white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <Title level={3} style={{ color: 'white', marginBottom: '16px' }}>
            Welcome to ClerkLegal
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px' }}>
            Your AI-powered legal assistant
          </Text>
        </div>
      )
    },
    {
      title: 'Case Management',
      description: (
        <div style={{ maxWidth: '300px' }}>
          <Text style={{ color: '#333', fontSize: '15px' }}>
            Create and manage your legal cases. Upload documents, track deadlines, and organize your case files efficiently.
          </Text>
        </div>
      ),
      target: () => document.querySelector('[href="/manage-cases"]'),
      placement: 'right',
      cover: (
        <div style={{ 
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <FolderOutlined style={{ fontSize: '28px', color: '#7A4D3B', marginBottom: '16px' }} />
          <Title level={4} style={{ marginBottom: '12px', color: '#333' }}>Case Management</Title>
          <Text style={{ color: '#666', fontSize: '15px' }}>
            Your central hub for all case-related activities
          </Text>
        </div>
      )
    },
    {
      title: 'Document Generation',
      description: (
        <div style={{ maxWidth: '300px' }}>
          <Text style={{ color: '#333', fontSize: '15px' }}>
            Generate professional legal documents using our AI. Select templates, provide case details, and get perfectly formatted documents in seconds.
          </Text>
        </div>
      ),
      target: () => document.querySelector('[href*="/create-doc"]'),
      placement: 'right',
      cover: (
        <div style={{ 
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <FileAddOutlined style={{ fontSize: '28px', color: '#7A4D3B', marginBottom: '16px' }} />
          <Title level={4} style={{ marginBottom: '12px', color: '#333' }}>Document Generation</Title>
          <Text style={{ color: '#666', fontSize: '15px' }}>
            AI-powered document creation at your fingertips
          </Text>
        </div>
      )
    },
    {
      title: 'Document Analysis',
      description: (
        <div style={{ maxWidth: '300px' }}>
          <Text style={{ color: '#333', fontSize: '15px' }}>
            Upload legal documents for instant AI analysis. Get key insights, summaries, and important information extracted automatically.
          </Text>
        </div>
      ),
      target: () => document.querySelector('[href*="/analyze"]'),
      placement: 'right',
      cover: (
        <div style={{ 
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <SearchOutlined style={{ fontSize: '28px', color: '#7A4D3B', marginBottom: '16px' }} />
          <Title level={4} style={{ marginBottom: '12px', color: '#333' }}>Document Analysis</Title>
          <Text style={{ color: '#666', fontSize: '15px' }}>
            Smart analysis of your legal documents
          </Text>
        </div>
      )
    },
    {
      title: 'Discovery Tools',
      description: (
        <div style={{ maxWidth: '300px' }}>
          <Text style={{ color: '#333', fontSize: '15px' }}>
            Create and respond to discovery requests with AI assistance. Generate and format discovery documents efficiently.
          </Text>
        </div>
      ),
      target: () => document.querySelector('[href*="/discovery"]'),
      placement: 'right',
      cover: (
        <div style={{ 
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <FileSearchOutlined style={{ fontSize: '28px', color: '#7A4D3B', marginBottom: '16px' }} />
          <Title level={4} style={{ marginBottom: '12px', color: '#333' }}>Discovery Tools</Title>
          <Text style={{ color: '#666', fontSize: '15px' }}>
            Streamline your discovery process
          </Text>
        </div>
      )
    },
    {
      title: 'Your Profile',
      description: (
        <div style={{ maxWidth: '300px' }}>
          <Text style={{ color: '#333', fontSize: '15px' }}>
            Access your profile settings, manage your account, and customize your experience with ClerkLegal.
          </Text>
        </div>
      ),
      target: () => document.querySelector('.ant-avatar'),
      placement: 'left',
      cover: (
        <div style={{ 
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <UserOutlined style={{ fontSize: '28px', color: '#7A4D3B', marginBottom: '16px' }} />
          <Title level={4} style={{ marginBottom: '12px', color: '#333' }}>Your Profile</Title>
          <Text style={{ color: '#666', fontSize: '15px' }}>
            Manage your account settings
          </Text>
        </div>
      )
    },
  ];

  const handleTourClose = () => {
    setOpen(false);
    localStorage.setItem('hasSeenTutorial', 'true');
  };

  const handleTourChange = (current) => {
    setCurrentStep(current);
  };

  return (
    <Tour
      open={open}
      onClose={handleTourClose}
      current={currentStep}
      onChange={handleTourChange}
      steps={steps}
      type="primary"
      arrow={true}
      placement="bottom"
      mask={true}
      maskStyle={{
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
      }}
      style={{
        '--ant-primary-color': '#7A4D3B',
        '--ant-primary-color-hover': '#8D5A45',
      }}
    />
  );
};

export default AppTutorial; 