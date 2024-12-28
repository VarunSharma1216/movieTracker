import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { Card, Spin, Row, Col, Typography, Avatar, Space, Statistic } from 'antd';
import { Link } from 'react-router-dom';

const { Title, Text } = Typography;

const Dashboard = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    watching: 0,
    completed: 0,
    planned: 0,
    hoursWatched: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        fetchUserData(user.uid);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchUserData = async (userId) => {
    try {
      const watchlistRef = doc(db, 'watchlists', userId);
      const watchlistDoc = await getDoc(watchlistRef);

      if (watchlistDoc.exists()) {
        const data = watchlistDoc.data();
        setStats({
          total: (data.watching?.length || 0) + (data.completed?.length || 0) + (data.planned?.length || 0),
          watching: data.watching?.length || 0,
          completed: data.completed?.length || 0,
          planned: data.planned?.length || 0,
          hoursWatched: calculateWatchTime(data.completed || []),
        });
      }

      const movieActivitiesRef = collection(db, 'activities', userId, 'movie_activities');
      const tvActivitiesRef = collection(db, 'activities', userId, 'tv_activities');

      const movieQuery = query(movieActivitiesRef, orderBy('timestamp', 'desc'), limit(10));
      const tvQuery = query(tvActivitiesRef, orderBy('timestamp', 'desc'), limit(10));

      const [movieSnapshot, tvSnapshot] = await Promise.all([getDocs(movieQuery), getDocs(tvQuery)]);

      const movieActivities = movieSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      }));

      const tvActivities = tvSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      }));

      const allActivities = [...movieActivities, ...tvActivities].sort(
        (a, b) => b.timestamp - a.timestamp
      ).slice(0, 10);

      setRecentActivities(allActivities);

      
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const calculateWatchTime = (completedItems) => {
    return completedItems.reduce((total, item) => total + (item.runtime || 120), 0) / 60;
  };

  const formatTimeAgo = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return <Spin size="large" align="center" />;
  }

  return (
    <div style={{ padding: 24, justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        

        {/* Stats Overview */}
        <Row gutter={16}  style={{ width: '100%', maxWidth: '1200px' }}>
          <Col span={4}>
            <Card>
              <Statistic title="Total Entries" value={stats.total} />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic title="Watching" value={stats.watching} />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic title="Completed" value={stats.completed} />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic title="Hours Watched" value={Math.round(stats.hoursWatched)} />
            </Card>
          </Col>
        </Row>

        {/* Recent Activities */}
        <Card title="Recent Activities">
          {recentActivities.map((activity) => (
            <div key={activity.id} style={{ display: 'flex', marginBottom: '16px' }}>
              {activity.poster_path && (
                <Avatar
                  shape="square"
                  size={64}
                  src={`https://image.tmdb.org/t/p/w92${activity.poster_path}`}
                  alt={activity.title}
                />
              )}
              <div style={{ marginLeft: '16px', flex: 1 }}>
                <Title level={5}>
                  <Link to={`/${activity.type}/${activity.mediaId}`}>
                    {activity.title}
                  </Link>
                </Title>
                <Text>{activity.action}</Text>
                <div>
                  <Text type="secondary">{formatTimeAgo(activity.timestamp)}</Text>
                </div>
              </div>
            </div>
          ))}
        </Card>
      </Space>
    </div>
  );
};

export default Dashboard;
