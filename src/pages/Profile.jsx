import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Layout, Menu, Avatar, Typography } from 'antd';
import { HomeOutlined, UnorderedListOutlined, UserOutlined, SettingOutlined } from '@ant-design/icons'; 
import Movielist from './Movielist';
import TVlist from './TVlist';

const { Content } = Layout;
const { Title } = Typography;


const Profile = () => {
  const location = useLocation();
  const [display, setDisplay] = React.useState('');


  useEffect(() => {
    const handleScrollToHash = () => {
      const hash = location.hash;
      if (hash) {
        const section = document.getElementById(hash.replace('#', ''));
        if (section) {
          section.scrollIntoView({ behavior: 'smooth' });
        }
      }

      if (location.hash === '#movielist-section') {
        setDisplay('movielist');
      } else if (location.hash === '#tvlist-section') {
        setDisplay('tvlist');
      } else {
        setDisplay(''); // Default: show nothing or a placeholder
      }
    };

    handleScrollToHash(); // Run on component mount
  }, [location]); // Trigger whenever the location changes

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <div
        style={{
          backgroundColor: '#302c44', 
          padding: '30px 200px',
          textAlign: 'left',
        }}
      >
        <Avatar
          size={100}
          icon={<UserOutlined />}
          style={{
            border: '2px solid white',
            backgroundColor: '#f0f2f5',
          }}
        />
        <Title level={3} style={{ color: 'white', marginTop: '15px' }}>
          User Name
        </Title>
      </div>

      <Menu
  mode="horizontal"
  defaultSelectedKeys={['3']}
  style={{
    display: 'flex',
    justifyContent: 'center',
    borderBottom: '1px solid #f0f0f0',
    gap: '20px', // Add space between items
  }}
>
  <div style={{ padding: '0 10px' }}>
    <Link to="/">Home</Link>
  </div>
  <div style={{ padding: '0 10px' }}>
    <Link to="/profile#movielist-section">Movie List</Link>
  </div>
  <div style={{ padding: '0 10px' }}>
    <Link to="/profile#tvlist-section">TV List</Link>
  </div>
  <div style={{ padding: '0 10px' }}>
    <Link to="/">Friends</Link>
  </div>
  <div style={{ padding: '0 10px' }}>
    <Link to="/profile/settings">Settings</Link>
  </div>
  
</Menu>


      <Content
        style={{
          padding: '20px',
          backgroundColor: '#f4f4f9', 
        }}
      >
        <div>
        {display === 'movielist' && <Movielist />}
        {display === 'tvlist' && <TVlist />}
        </div>
       
      </Content>
    </Layout>
  );
};

export default Profile;
