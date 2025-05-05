import React from 'react';
import { Layout, theme } from 'antd';
import '../styles.css';

const { Content, Sider } = Layout;

function TwoColumnLayout({ children, sidebar, sidebarWidth = 400 }) {
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  return (
    <Layout style={{ background: 'transparent' }} className="case-details-two-column">
      <Content 
        style={{ 
          marginRight: window.innerWidth > 768 ? sidebarWidth + 24 : 0 
        }}
      >
        {children}
      </Content>
      <Sider
        width={sidebarWidth}
        style={{
          position: window.innerWidth > 768 ? 'fixed' : 'relative',
          height: window.innerWidth > 768 ? 'calc(100vh - 112px)' : 'auto',
          right: window.innerWidth > 768 ? 0 : 'unset',
          top: window.innerWidth > 768 ? 112 : 'unset',
          background: colorBgContainer,
          borderLeft: window.innerWidth > 768 ? '1px solid #f0f0f0' : 'none',
          overflow: 'auto',
          boxShadow: window.innerWidth > 768 ? '0 4px 8px -2px rgba(0, 0, 0, 0.05)' : 'none',
        }}
        breakpoint="md"
        collapsedWidth="0"
      >
        {sidebar}
      </Sider>
    </Layout>
  );
}

export default TwoColumnLayout;