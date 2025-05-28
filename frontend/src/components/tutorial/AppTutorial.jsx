import React, { useState, useEffect, useCallback } from 'react';
import { Tour, Typography, Button, Space, Progress } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  FolderOutlined, 
  FileAddOutlined, 
  SearchOutlined, 
  FileSearchOutlined, 
  UserOutlined,
  PauseOutlined,
  PlayCircleOutlined,
  SkipOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;

const AppTutorial = () => {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [targetElements, setTargetElements] = useState({});
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  // Debounced function to find elements
  const findElements = useCallback(() => {
    const elements = {
      header: document.querySelector('.ant-layout-header'),
      casesLink: document.querySelector('[href="/manage-cases"]'),
      createDocLink: document.querySelector('[href*="/create-doc"]'),
      analyzeLink: document.querySelector('[href*="/analyze"]'),
      discoveryLink: document.querySelector('[href*="/discovery"]'),
      avatar: document.querySelector('.ant-avatar')
    };
    setTargetElements(elements);
    return elements;
  }, []);

  // Check if all required elements are present
  const areElementsReady = useCallback(() => {
    const elements = findElements();
    return Object.values(elements).every(el => el !== null);
  }, [findElements]);

  // Initialize tutorial
  useEffect(() => {
    if (!currentUser) return;

    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    const pendingTutorialStart = localStorage.getItem('pendingTutorialStart');
    const shouldStartTutorial = (!hasSeenTutorial || pendingTutorialStart === 'true') && location.pathname === '/manage-cases';

    if (shouldStartTutorial) {
      // Wait for elements to be ready
      const checkElements = setInterval(() => {
        if (areElementsReady()) {
          clearInterval(checkElements);
          setOpen(true);
          localStorage.setItem('hasSeenTutorial', 'true');
          localStorage.removeItem('pendingTutorialStart');
        }
      }, 100);

      // Clear interval after 5 seconds if elements aren't found
      setTimeout(() => clearInterval(checkElements), 5000);
    }
  }, [currentUser, location.pathname, areElementsReady]);

  const steps = [
    {
      title: 'Welcome to ClerkLegal',
      description: (
        <div style={{ maxWidth: '300px' }}>
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px' }}>
            Let's take a quick tour of our AI-powered legal tools to help you get started.
          </Text>
          <Progress percent={Math.round((currentStep / 5) * 100)} status="active" />
        </div>
      ),
      target: () => targetElements.header,
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
          <Progress percent={Math.round((currentStep / 5) * 100)} status="active" />
        </div>
      ),
      target: () => targetElements.casesLink,
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
          <Progress percent={Math.round((currentStep / 5) * 100)} status="active" />
        </div>
      ),
      target: () => targetElements.createDocLink,
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
          <Progress percent={Math.round((currentStep / 5) * 100)} status="active" />
        </div>
      ),
      target: () => targetElements.analyzeLink,
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
          <Progress percent={Math.round((currentStep / 5) * 100)} status="active" />
        </div>
      ),
      target: () => targetElements.discoveryLink,
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
          <Progress percent={Math.round((currentStep / 5) * 100)} status="active" />
        </div>
      ),
      target: () => targetElements.avatar,
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
    localStorage.removeItem('pendingTutorialStart');
  };

  const handleTourChange = (current) => {
    setCurrentStep(current);
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleSkip = () => {
    handleTourClose();
  };

  return (
    <Tour
      open={open && !isPaused}
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
      renderPanel={(step, current) => (
        <div>
          {step.cover}
          <Space style={{ marginTop: 16 }}>
            <Button 
              icon={isPaused ? <PlayCircleOutlined /> : <PauseOutlined />}
              onClick={handlePause}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button 
              icon={<SkipOutlined />}
              onClick={handleSkip}
            >
              Skip Tutorial
            </Button>
          </Space>
        </div>
      )}
    />
  );
};

export default AppTutorial; 