import React, { useEffect, useState } from 'react';
import { useLocation, useParams, Navigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Layout, Menu, Avatar, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { doc, getDoc, getDocs, query, collection, where } from 'firebase/firestore';
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
        const usersQuery = query(
          collection(db, "users"),
          where("username", "==", username)
        );
        const querySnapshot = await getDocs(usersQuery);


        if (querySnapshot.empty) {
          console.log("No profile found for username:", username);
          setIsValidProfile(false);
          setLoading(false);
          return;
        }

        const profileDoc = querySnapshot.docs[0];

        setProfileUserId(profileDoc.id);
        setIsValidProfile(true);

        // Check if this is the current user's profile
        if (currentUser && currentUser.uid === profileDoc.id) {
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    return () => unsubscribe();
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

  if (!isValidProfile) {
    return <Navigate to="/" replace />;
  }

  const getMenuLink = (section) => {
    return `/${username}/profile#${section}-section`;
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
    padding: '30px 200px',
  }}
>
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'start',
    width: 'fit-content'  // This ensures the container is only as wide as needed
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
        alignSelf: 'center'  // This centers the title relative to the Avatar
      }}
    >
      {username}
    </Title>
  </div>
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
        {menuItems.map(item => (
          <Menu.Item key={item.key}>
            <Link to={getMenuLink(item.key)}>{item.label}</Link>
          </Menu.Item>
        ))}
      </Menu>
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