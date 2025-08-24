import React, { useEffect, useState } from 'react';
import { useLocation, useParams, Navigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Layout, Menu, Avatar, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { supabase } from '../supabase';
import Movielist from './Movielist';
import TVlist from './TVlist';
import Home from './Home';
import Friends from './Friends';
import Settings from './Settings';
import './Profile.css';

const { Content } = Layout;
const { Title } = Typography;

const Profile = () => {
  const location = useLocation();
  const { username } = useParams();
  const [display, setDisplay] = useState('');
  const [loading, setLoading] = useState(true);
  const [isValidProfile, setIsValidProfile] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [profileUserId, setProfileUserId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // First fetch the profile data for the URL username
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!username) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, username')
          .eq('username', username)
          .single();

        if (error || !data) {
          console.log("No profile found for username:", username, error);
          setIsValidProfile(false);
          setLoading(false);
          return;
        }

        const profileDoc = data;

        setProfileUserId(profileDoc.id);
        setIsValidProfile(true);

        // Check if this is the current user's profile
        if (currentUser && currentUser.id === profileDoc.id) {
          setIsOwnProfile(true);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        setIsValidProfile(false);
      }
      setLoading(false);
    };

    fetchProfileData();
  }, [username, currentUser]);

  // Check authentication status
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user || null);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setCurrentUser(session?.user || null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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
        case '#movie-list':
          setDisplay('movielist');
          break;
        case '#tv-list':
          setDisplay('tvlist');
          break;
        case '#home':
          setDisplay('home');
          break;
        case '#friends':
          setDisplay('friends');
          break;
        case '#settings':
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

  if (!isValidProfile) {
    return <Navigate to="/" replace />;
  }

  const getMenuLink = (section) => {
    return `/${username}/profile#${section === 'movielist' ? 'movie-list' : section === 'tvlist' ? 'tv-list' : section}`;
  };

  // Only show Settings for own profile
  const menuItems = [
    { key: "home", label: "Home" },
    { key: "movielist", label: "Movie List" },
    { key: "tvlist", label: "TV List" },
    { key: "friends", label: "Friends" },
    ...(isOwnProfile ? [{ key: "settings", label: "Settings" }] : [])
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
     <div
  style={{
    backgroundColor: '#302c44',
    padding: '30px 20px',
    '@media (min-width: 768px)': {
      padding: '30px 200px',
    }
  }}
  className="profile-header"
>
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%'
  }}>
    <Avatar
      size={100}
      icon={<UserOutlined />}
      style={{
        border: '2px solid white',
        backgroundColor: '#f0f2f5',
      }}
    />
    <Title 
      level={3} 
      style={{ 
        color: 'white',
        marginTop: '15px',
        margin: '15px 0 0 0',
        textAlign: 'center'
      }}
    >
      {username}
    </Title>
  </div>
</div>
      <div className="profile-nav-container">
        <Menu
          mode="horizontal"
          defaultSelectedKeys={['3']}
          style={{
            display: 'flex',
            justifyContent: 'center',
            borderBottom: '1px solid #f0f0f0',
            gap: '5px',
            flexWrap: 'wrap',
            minHeight: 'auto'
          }}
          className="profile-nav-menu"
        >
          {menuItems.map(item => (
            <Menu.Item 
              key={item.key}
              style={{
                padding: '0 8px',
                minWidth: 'auto'
              }}
            >
              <Link to={getMenuLink(item.key)} style={{ fontSize: '14px' }}>
                {item.label}
              </Link>
            </Menu.Item>
          ))}
        </Menu>
      </div>
      <Content
        style={{
          padding: '20px',
          backgroundColor: '#f4f4f9',
        }}
      >
        <div>
          {display === 'movielist' && <Movielist userId={profileUserId} />}
          {display === 'tvlist' && <TVlist userId={profileUserId} />}
          {display === 'home' && <Home userId={profileUserId} />}
          {display === 'friends' && <Friends userId={profileUserId} />}
          {display === 'settings' && isOwnProfile && <Settings />}
        </div>
      </Content>
    </Layout>
  );
};

export default Profile;