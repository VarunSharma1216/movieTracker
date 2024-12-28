import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Layout, Menu, Avatar, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import Movielist from './Movielist';
import TVlist from './TVlist';
import Home from './Home';
import Friends from './Friends';
import Settings from './Settings';

const { Content } = Layout;
const { Title } = Typography;

const Profile = () => {
  const location = useLocation();
  const [display, setDisplay] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes and fetch username
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnapshot = await getDoc(userRef);
          
          if (userSnapshot.exists()) {
            const userData = userSnapshot.data();
            setUserName(userData.username || 'User');
            console.log("User data:", userData);
          } else {
            console.log("No such user!");
            setUserName('User');
          }
        } catch (error) {
          console.error("Error fetching user:", error);
          setUserName('User');
        }
      } else {
        setUserName('');
        console.log("No user signed in");
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []); // Run once when component mounts

  useEffect(() => {
    const handleScrollToHash = () => {
      const hash = location.hash;
      if (hash) {
        const section = document.getElementById(hash.replace('#', ''));
        if (section) {
          section.scrollIntoView({ behavior: 'smooth' });
        }
      }
      
      switch (location.hash) {
        case '#movielist-section':
          setDisplay('movielist');
          break;
        case '#tvlist-section':
          setDisplay('tvlist');
          break;
        case '#home-section':
          setDisplay('home');
          break;
        case '#friends-section':
          setDisplay('friends');
          break;
        case '#settings-section':
          setDisplay('settings');
          break;
        default:
          setDisplay('home');
      }
    };

    handleScrollToHash();
  }, [location]);

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          Loading...
        </div>
      </Layout>
    );
  }

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
        <Title level={3} style={{ color: 'white', marginTop: '15px', justifyContent: 'center' }}>
          {userName}
        </Title>
      </div>
      <Menu
        mode="horizontal"
        defaultSelectedKeys={['3']}
        style={{
          display: 'flex',
          justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0',
          gap: '20px',
        }}
      >
        <Menu.Item key="home">
          <Link to="/profile#home-section">Home</Link>
        </Menu.Item>
        <Menu.Item key="movielist">
          <Link to="/profile#movielist-section">Movie List</Link>
        </Menu.Item>
        <Menu.Item key="tvlist">
          <Link to="/profile#tvlist-section">TV List</Link>
        </Menu.Item>
        <Menu.Item key="friends">
          <Link to="/profile#friends-section">Friends</Link>
        </Menu.Item>
        <Menu.Item key="settings">
          <Link to="/profile#settings-section">Settings</Link>
        </Menu.Item>
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
          {display === 'home' && <Home />}
          {display === 'friends' && <Friends />}
          {display === 'settings' && <Settings />}
        </div>
      </Content>
    </Layout>
  );
};

export default Profile;