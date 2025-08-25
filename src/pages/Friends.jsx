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
  Empty,
  Badge,
  Space
} from 'antd';
import { 
  UserOutlined, 
  UserAddOutlined,
  UserDeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  InboxOutlined
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
  const [friendRequests, setFriendRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get current authenticated user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user || null);
    };
    getCurrentUser();
  }, []);

  // Load friends data and requests
  useEffect(() => {
    if (userId) {
      loadFriendsData();
    }
  }, [userId]);

  useEffect(() => {
    if (userId && currentUser) {
      loadFriendRequests();
    }
  }, [userId, currentUser]);

  const loadFriendsData = async () => {
    setLoading(true);
    console.log(`🔄 Loading friends data for userId: ${userId}`);
    
    try {
      // Get the user's friends array
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('friends')
        .eq('id', userId)
        .single();

      console.log(`📋 User data result:`, { userData, userError });

      if (userError) {
        console.error('Error loading user data:', userError);
        setLoading(false);
        return;
      }

      const friendIds = userData?.friends || [];
      console.log(`👥 Friend IDs for user ${userId}:`, friendIds);
      setUserFriends(friendIds);

      if (friendIds.length > 0) {
        // Get friend details
        const { data: friendsData, error: friendsError } = await supabase
          .from('users')
          .select('id, username')
          .in('id', friendIds);

        console.log(`📇 Friends details result:`, { friendsData, friendsError });

        if (friendsError) {
          console.error('Error loading friends data:', friendsError);
        } else {
          setFriends(friendsData || []);
          console.log(`✅ Set friends state:`, friendsData);
        }
      } else {
        console.log(`📭 No friends found for user ${userId}`);
        setFriends([]);
      }
    } catch (error) {
      console.error('Error loading friends data:', error);
    }
    setLoading(false);
  };

  const loadFriendRequests = async () => {
    if (!currentUser) {
      console.log('Skipping friend requests load - no current user');
      return;
    }

    console.log('Debug - currentUser.id:', currentUser.id, 'userId:', userId, 'match:', currentUser.id === userId);

    try {
      console.log('Loading friend requests for user:', userId);
      
      // Load incoming friend requests (for inbox)
      const { data: incomingRequests, error: incomingError } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:users!sender_id(id, username)
        `)
        .eq('receiver_id', userId)
        .eq('status', 'pending');

      console.log('Incoming requests result:', { incomingRequests, incomingError });

      if (incomingError) {
        console.error('Error loading incoming requests:', incomingError);
      } else {
        setFriendRequests(incomingRequests || []);
      }

      // Load outgoing friend requests (to filter search results)
      const { data: outgoingRequests, error: outgoingError } = await supabase
        .from('friend_requests')
        .select('receiver_id')
        .eq('sender_id', userId)
        .eq('status', 'pending');

      console.log('Outgoing requests result:', { outgoingRequests, outgoingError });

      if (outgoingError) {
        console.error('Error loading outgoing requests:', outgoingError);
      } else {
        setSentRequests(outgoingRequests?.map(req => req.receiver_id) || []);
      }
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
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
        // Filter out existing friends and users with pending requests
        const excludeIds = [...userFriends, ...sentRequests];
        const filteredResults = data?.filter(user => !excludeIds.includes(user.id)) || [];
        setSearchResults(filteredResults);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      message.error('Error searching users');
    }
    setSearching(false);
  };

  const sendFriendRequest = async (receiverId) => {
    if (!currentUser) return;

    try {
      console.log('Sending friend request:', { sender: currentUser.id, receiver: receiverId });
      
      const { data, error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: currentUser.id,
          receiver_id: receiverId,
          status: 'pending'
        })
        .select();

      if (error) {
        console.error('Supabase error sending friend request:', error);
        message.error(`Error sending friend request: ${error.message}`);
        return;
      }

      console.log('Friend request sent successfully:', data);
      message.success('Friend request sent!');
      
      // Add to sent requests to update UI immediately
      setSentRequests(prev => [...prev, receiverId]);
      
      // Remove from search results
      setSearchResults(prev => prev.filter(user => user.id !== receiverId));
      
      // Reload requests
      loadFriendRequests();
    } catch (error) {
      console.error('Error sending friend request:', error);
      message.error(`Error sending friend request: ${error.message}`);
    }
  };

  const respondToFriendRequest = async (requestId, senderId, action) => {
    if (!currentUser) return;

    try {
      if (action === 'accept') {
        console.log(`Accepting friend request: ${requestId}, accepter: ${currentUser.id}, requester: ${senderId}`);
        
        // Use the Supabase function to handle bidirectional friendship
        const { error: acceptError } = await supabase.rpc('accept_friend_request', {
          request_id: requestId,
          accepter_id: currentUser.id,
          requester_id: senderId
        });

        if (acceptError) {
          console.error('Error accepting friend request:', acceptError);
          message.error(`Error accepting friend request: ${acceptError.message}`);
          return;
        }

        console.log('✅ Friend request accepted successfully via RPC function');
        message.success('Friend request accepted! You are now friends.');
        
      } else if (action === 'decline') {
        // Decline/delete the request
        const { error } = await supabase
          .from('friend_requests')
          .delete()
          .eq('id', requestId);

        if (error) {
          console.error('Error declining request:', error);
          message.error('Error declining friend request');
          return;
        }

        message.success('Friend request declined');
      }

      // Reload data
      loadFriendRequests();
      loadFriendsData();
    } catch (error) {
      console.error('Error responding to friend request:', error);
      message.error('Error processing request');
    }
  };

  const addToFriendsList = async (userId, friendId) => {
    try {
      console.log(`Adding ${friendId} to ${userId}'s friends list`);
      
      // Get current friends list
      const { data: userData, error: getUserError } = await supabase
        .from('users')
        .select('friends')
        .eq('id', userId)
        .single();

      if (getUserError) {
        console.error(`Error getting user ${userId} friends:`, getUserError);
        throw getUserError;
      }

      const currentFriends = userData?.friends || [];
      console.log(`${userId} current friends:`, currentFriends);
      
      // Add friend if not already in list
      if (!currentFriends.includes(friendId)) {
        const updatedFriends = [...currentFriends, friendId];
        console.log(`${userId} updated friends:`, updatedFriends);
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ friends: updatedFriends })
          .eq('id', userId);

        if (updateError) {
          console.error(`Error updating ${userId} friends list:`, updateError);
          throw updateError;
        } else {
          console.log(`✅ Successfully added ${friendId} to ${userId}'s friends`);
        }
      } else {
        console.log(`${friendId} already in ${userId}'s friends list`);
      }
    } catch (error) {
      console.error(`Error adding ${friendId} to ${userId}'s friends list:`, error);
      throw error;
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
  console.log('Debug - isOwnProfile:', isOwnProfile, 'friendRequests.length:', friendRequests.length);

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
        <div style={{ 
          maxWidth: '800px', 
          margin: '0 auto', 
          padding: '30px 20px 30px 20px' 
        }}>
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

  // Add search and inbox tabs only for own profile
  if (isOwnProfile) {
    // Add Find Friends tab
    tabItems.unshift({
      key: 'search',
      label: 'Find Friends',
      children: (
        <div style={{ 
          maxWidth: '800px', 
          margin: '0 auto', 
          padding: '30px 20px 30px 20px' 
        }}>
          <Search
            placeholder="Search for users by username..."
            allowClear
            size="large"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onSearch={searchUsers}
            loading={searching}
            style={{ 
              marginBottom: 20,
              maxWidth: '500px',
              margin: '0 auto 20px auto',
              display: 'block'
            }}
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
                      sentRequests.includes(user.id) ? (
                        <Button 
                          disabled
                          type="default"
                        >
                          Request Sent
                        </Button>
                      ) : (
                        <Button 
                          type="primary" 
                          icon={<UserAddOutlined />}
                          onClick={() => sendFriendRequest(user.id)}
                        >
                          Send Request
                        </Button>
                      )
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
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No users found"
              />
            </div>
          )}
        </div>
      )
    });

    // Add Inbox tab
    tabItems.push({
      key: 'inbox',
      label: (
        <Space>
          <InboxOutlined />
          Inbox
          {friendRequests.length > 0 && (
            <Badge count={friendRequests.length} size="small" />
          )}
        </Space>
      ),
      children: (
        <div style={{ 
          maxWidth: '800px', 
          margin: '0 auto', 
          padding: '30px 20px 30px 20px' 
        }}>
          <Title level={4} style={{ textAlign: 'center', marginTop: '0' }}>Friend Requests</Title>
          {friendRequests.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No pending friend requests"
            />
          ) : (
            <List
              dataSource={friendRequests}
              renderItem={request => (
                <List.Item
                  actions={[
                    <Button 
                      type="primary" 
                      icon={<CheckOutlined />}
                      onClick={() => respondToFriendRequest(request.id, request.sender.id, 'accept')}
                    >
                      Accept
                    </Button>,
                    <Button 
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => respondToFriendRequest(request.id, request.sender.id, 'decline')}
                    >
                      Decline
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<UserOutlined />} />}
                    title={
                      <Link to={`/${request.sender.username}/profile`}>
                        {request.sender.username}
                      </Link>
                    }
                    description={`Sent you a friend request • ${new Date(request.created_at).toLocaleDateString()}`}
                  />
                </List.Item>
              )}
            />
          )}
        </div>
      )
    });
  }

  return (
    <div style={{ 
      padding: '20px 0',
      minHeight: '70vh',
      backgroundColor: '#fafafa'
    }}>
      <div style={{ 
        maxWidth: '1000px', 
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <Tabs 
          defaultActiveKey={isOwnProfile ? "search" : "friends"} 
          items={tabItems}
          style={{ padding: '0 20px' }}
          tabBarStyle={{ 
            margin: '0', 
            paddingTop: '20px',
            borderBottom: '1px solid #f0f0f0'
          }}
        />
      </div>
    </div>
  );
};

export default Friends;