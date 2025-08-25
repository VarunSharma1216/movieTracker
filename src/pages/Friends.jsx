import React, { useState, useEffect } from 'react';
import { 
  Input, 
  Card, 
  Avatar, 
  Button, 
  List, 
  Tabs, 
  Typography, 
  message,
  Spin,
  Empty
} from 'antd';
import { 
  UserOutlined, 
  UserAddOutlined,
  UserDeleteOutlined
} from '@ant-design/icons';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';

const { Search } = Input;
const { Title, Text } = Typography;

const Friends = ({ userId }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [friends, setFriends] = useState([]);
  const [userFriends, setUserFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get current authenticated user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user || null);
    };
    getCurrentUser();
  }, []);

  // Load friends data
  useEffect(() => {
    if (userId) {
      loadFriendsData();
    }
  }, [userId]);

  const loadFriendsData = async () => {
    setLoading(true);
    try {
      // Get the user's friends array
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('friends')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error loading user data:', userError);
        setLoading(false);
        return;
      }

      const friendIds = userData?.friends || [];
      setUserFriends(friendIds);

      if (friendIds.length > 0) {
        // Get friend details
        const { data: friendsData, error: friendsError } = await supabase
          .from('users')
          .select('id, username')
          .in('id', friendIds);

        if (friendsError) {
          console.error('Error loading friends data:', friendsError);
        } else {
          setFriends(friendsData || []);
        }
      } else {
        setFriends([]);
      }
    } catch (error) {
      console.error('Error loading friends data:', error);
    }
    setLoading(false);
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username')
        .ilike('username', `%${query}%`)
        .neq('id', currentUser?.id) // Exclude current user
        .limit(10);

      if (error) {
        console.error('Error searching users:', error);
        message.error('Error searching users');
      } else {
        // Filter out existing friends
        const filteredResults = data?.filter(user => !userFriends.includes(user.id)) || [];
        setSearchResults(filteredResults);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      message.error('Error searching users');
    }
    setSearching(false);
  };

  const addFriend = async (friendId) => {
    if (!currentUser) return;

    try {
      // Get current user's friends array
      const { data: currentUserData, error: getCurrentError } = await supabase
        .from('users')
        .select('friends')
        .eq('id', currentUser.id)
        .single();

      if (getCurrentError) {
        console.error('Error getting current user:', getCurrentError);
        message.error('Error adding friend');
        return;
      }

      const currentFriends = currentUserData?.friends || [];
      
      // Add friend to current user's friends list
      if (!currentFriends.includes(friendId)) {
        const updatedFriends = [...currentFriends, friendId];
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ friends: updatedFriends })
          .eq('id', currentUser.id);

        if (updateError) {
          console.error('Error adding friend:', updateError);
          message.error('Error adding friend');
          return;
        }

        // Also add current user to the friend's friends list
        const { data: friendData, error: getFriendError } = await supabase
          .from('users')
          .select('friends')
          .eq('id', friendId)
          .single();

        if (!getFriendError) {
          const friendFriends = friendData?.friends || [];
          if (!friendFriends.includes(currentUser.id)) {
            const updatedFriendFriends = [...friendFriends, currentUser.id];
            
            await supabase
              .from('users')
              .update({ friends: updatedFriendFriends })
              .eq('id', friendId);
          }
        }

        message.success('Friend added successfully!');
        setSearchResults(prev => prev.filter(user => user.id !== friendId));
        
        // Reload friends data if viewing own profile
        if (currentUser.id === userId) {
          loadFriendsData();
        }
      }
    } catch (error) {
      console.error('Error adding friend:', error);
      message.error('Error adding friend');
    }
  };

  const removeFriend = async (friendId) => {
    if (!currentUser) return;

    try {
      // Remove friend from current user's friends list
      const updatedFriends = userFriends.filter(id => id !== friendId);
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ friends: updatedFriends })
        .eq('id', currentUser.id);

      if (updateError) {
        console.error('Error removing friend:', updateError);
        message.error('Error removing friend');
        return;
      }

      // Also remove current user from the friend's friends list
      const { data: friendData, error: getFriendError } = await supabase
        .from('users')
        .select('friends')
        .eq('id', friendId)
        .single();

      if (!getFriendError) {
        const friendFriends = friendData?.friends || [];
        const updatedFriendFriends = friendFriends.filter(id => id !== currentUser.id);
        
        await supabase
          .from('users')
          .update({ friends: updatedFriendFriends })
          .eq('id', friendId);
      }

      message.success('Friend removed');
      loadFriendsData();
    } catch (error) {
      console.error('Error removing friend:', error);
      message.error('Error removing friend');
    }
  };

  const isOwnProfile = currentUser && currentUser.id === userId;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <Spin size="large" />
      </div>
    );
  }

  const tabItems = [
    {
      key: 'friends',
      label: `Friends (${friends.length})`,
      children: (
        <div>
          {friends.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={isOwnProfile ? "No friends yet. Search for users to add!" : "No friends to display"}
            />
          ) : (
            <List
              grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
              dataSource={friends}
              renderItem={friend => (
                <List.Item>
                  <Card
                    hoverable
                    style={{ textAlign: 'center' }}
                    actions={isOwnProfile ? [
                      <Button 
                        type="text" 
                        danger 
                        icon={<UserDeleteOutlined />}
                        onClick={() => removeFriend(friend.id)}
                      >
                        Remove
                      </Button>
                    ] : []}
                  >
                    <Link to={`/${friend.username}/profile`} style={{ textDecoration: 'none' }}>
                      <Avatar size={64} icon={<UserOutlined />} />
                      <div style={{ marginTop: 8 }}>
                        <Text strong>{friend.username}</Text>
                      </div>
                    </Link>
                  </Card>
                </List.Item>
              )}
            />
          )}
        </div>
      )
    }
  ];

  // Add search tab only for own profile
  if (isOwnProfile) {
    tabItems.unshift({
      key: 'search',
      label: 'Find Friends',
      children: (
        <div>
          <Search
            placeholder="Search for users by username..."
            allowClear
            size="large"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onSearch={searchUsers}
            loading={searching}
            style={{ marginBottom: 20 }}
          />
          
          {searchResults.length > 0 && (
            <List
              grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
              dataSource={searchResults}
              renderItem={user => (
                <List.Item>
                  <Card
                    hoverable
                    style={{ textAlign: 'center' }}
                    actions={[
                      <Button 
                        type="primary" 
                        icon={<UserAddOutlined />}
                        onClick={() => addFriend(user.id)}
                      >
                        Add Friend
                      </Button>
                    ]}
                  >
                    <Link to={`/${user.username}/profile`} style={{ textDecoration: 'none' }}>
                      <Avatar size={64} icon={<UserOutlined />} />
                      <div style={{ marginTop: 8 }}>
                        <Text strong>{user.username}</Text>
                      </div>
                    </Link>
                  </Card>
                </List.Item>
              )}
            />
          )}
          
          {searchQuery && searchResults.length === 0 && !searching && (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No users found"
            />
          )}
        </div>
      )
    });
  }

  return (
    <div style={{ padding: '20px 0' }}>
      <Tabs defaultActiveKey={isOwnProfile ? "search" : "friends"} items={tabItems} />
    </div>
  );
};

export default Friends;