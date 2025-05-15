import React, { useState, useEffect } from 'react';
import { Avatar, Dropdown, Space, Typography, Button, Popover, Tooltip } from 'antd';
import { UserOutlined, LogoutOutlined, SettingOutlined, BgColorsOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

// Predefined colors for the avatar - using Ant Design color palette
const AVATAR_COLORS = [
  '#7A4D3B', // Current primary brown
  '#1677ff', // Ant Design blue
  '#52c41a', // Green
  '#faad14', // Yellow
  '#f5222d', // Red
  '#722ed1', // Purple
  '#eb2f96', // Pink
  '#fa8c16', // Orange
  '#13c2c2', // Cyan
  '#2f54eb', // Indigo
];

const UserProfileDropdown = ({ currentUser, logout, token }) => {
  const navigate = useNavigate();
  
  // Get saved color from localStorage or use default
  const [avatarColor, setAvatarColor] = useState(() => {
    const saved = localStorage.getItem('userAvatarColor');
    return saved || token.colorPrimary; // Default to theme primary color
  });

  // Save color preference when it changes
  useEffect(() => {
    localStorage.setItem('userAvatarColor', avatarColor);
  }, [avatarColor]);

  // User menu items
  const userMenuItems = [
    {
      key: 'profile',
      label: 'My Profile',
      icon: <UserOutlined />,
      onClick: () => navigate('/profile')
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogoutOutlined />,
      onClick: logout,
      danger: true
    }
  ];

  // Color picker content
  const colorPickerContent = (
    <div style={{ width: '200px' }}>
      <Text style={{ display: 'block', marginBottom: '8px' }}>Choose Avatar Color</Text>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(5, 1fr)', 
        gap: '8px'
      }}>
        {AVATAR_COLORS.map((color) => (
          <Tooltip title={color} key={color}>
            <Button
              type="text"
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: color,
                border: avatarColor === color ? '2px solid #fff' : 'none',
                boxShadow: avatarColor === color ? '0 0 0 2px #1677ff' : 'none'
              }}
              onClick={() => setAvatarColor(color)}
            />
          </Tooltip>
        ))}
      </div>
    </div>
  );

  // Add color picker to the menu items
  const menuItemsWithColorPicker = [
    {
      key: 'colorPicker',
      label: (
        <Popover 
          content={colorPickerContent}
          title="Avatar Color"
          trigger="click"
          placement="left"
        >
          <Space>
            <BgColorsOutlined />
            <span>Change Avatar Color</span>
          </Space>
        </Popover>
      ),
    },
    { type: 'divider' },
    ...userMenuItems
  ];

  // Get display name for avatar button - just "User" instead of email
  const displayName = currentUser?.name || currentUser?.username || "User";  
  // Add user info to menu items at the top
  const completeMenuItems = [
    {
      key: 'userInfo',
      label: (
        <div style={{ padding: '4px 0' }}>
          <Text strong style={{ fontSize: '14px', display: 'block' }}>
            {currentUser?.name || currentUser?.username || 'User'}
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {currentUser?.email || 'No email provided'}
          </Text>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' },
    ...menuItemsWithColorPicker
  ];

  return (
    <Dropdown 
      menu={{ items: completeMenuItems }}
      placement="bottomRight"
      trigger={['click']}
      arrow={{ pointAtCenter: true }}
    >
      <Space>
        <span>{displayName}</span>
        <Avatar 
          style={{
            backgroundColor: avatarColor,
            cursor: 'pointer'
          }}
          icon={<UserOutlined />}
        />
      </Space>
    </Dropdown>
  );
};

export default UserProfileDropdown;