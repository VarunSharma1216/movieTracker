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
  where,
} from 'firebase/firestore';
import { Card, Spin, Row, Col, Typography, Avatar, Space, Statistic, message } from 'antd';
import { Link, useParams } from 'react-router-dom';

const { Title, Text } = Typography;

const Home = () => {
  const { username } = useParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [profileUserId, setProfileUserId] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    movieTotal: 0,
    movieWatching: 0,
    movieCompleted: 0,
    moviePlanned: 0,
    movieHoursWatched: 0,
    tvTotal: 0,
    tvWatching: 0,
    tvCompleted: 0,
    tvPlanned: 0,
    tvHoursWatched: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);

  // Check authentication status
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Fetch profile user ID from username
  useEffect(() => {
    const fetchProfileUserId = async () => {
      if (!username) return;

      try {
        const usersQuery = query(
          collection(db, "users"),
          where("username", "==", username)
        );
        const querySnapshot = await getDocs(usersQuery);

        if (querySnapshot.empty) {
          message.error('User not found');
          return;
        }

        const profileDoc = querySnapshot.docs[0];
        setProfileUserId(profileDoc.id);

        // Check if this is the current user's profile
        if (currentUser && currentUser.uid === profileDoc.id) {
          setIsOwnProfile(true);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        message.error('Error loading profile');
      }
    };

    fetchProfileUserId();
  }, [username, currentUser]);

  const fetchUserData = async () => {
    if (!profileUserId) return;

    try {
      // Fetch movie watchlist
      const movieWatchlistRef = doc(db, 'watchlists', profileUserId);
      const movieWatchlistDoc = await getDoc(movieWatchlistRef);

      // Fetch TV watchlist
      const tvWatchlistRef = doc(db, 'tvwatchlist', profileUserId);
      const tvWatchlistDoc = await getDoc(tvWatchlistRef);

      let movieStats = {
        total: 0,
        watching: 0,
        completed: 0,
        planned: 0,
        hoursWatched: 0,
      };

      let tvStats = {
        total: 0,
        watching: 0,
        completed: 0,
        planned: 0,
        hoursWatched: 0,
      };

      if (movieWatchlistDoc.exists()) {
        const movieData = movieWatchlistDoc.data();
        movieStats = {
          total: (movieData.watching?.length || 0) + (movieData.completed?.length || 0) + (movieData.planned?.length || 0),
          watching: movieData.watching?.length || 0,
          completed: movieData.completed?.length || 0,
          planned: movieData.planned?.length || 0,
          hoursWatched: calculateMovieWatchTime(movieData.completed || []),
        };
      }

      if (tvWatchlistDoc.exists()) {
        const tvData = tvWatchlistDoc.data();
        tvStats = {
          total: (tvData.watching?.length || 0) + (tvData.completed?.length || 0) + (tvData.planned?.length || 0),
          watching: tvData.watching?.length || 0,
          completed: tvData.completed?.length || 0,
          planned: tvData.planned?.length || 0,
          hoursWatched: calculateTVWatchTime(tvData.completed || []),
        };
      }

      setStats({
        movieTotal: movieStats.total,
        movieWatching: movieStats.watching,
        movieCompleted: movieStats.completed,
        moviePlanned: movieStats.planned,
        movieHoursWatched: movieStats.hoursWatched,
        tvTotal: tvStats.total,
        tvWatching: tvStats.watching,
        tvCompleted: tvStats.completed,
        tvPlanned: tvStats.planned,
        tvHoursWatched: tvStats.hoursWatched,
      });

      // Fetch recent activities
      const movieActivitiesRef = collection(db, 'activities', profileUserId, 'movie_activities');
      const tvActivitiesRef = collection(db, 'activities', profileUserId, 'tv_activities');

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

      const allActivities = [...movieActivities, ...tvActivities]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10);

      setRecentActivities(allActivities);
    } catch (error) {
      console.error('Error fetching user data:', error);
      message.error('Error loading user data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profileUserId) {
      fetchUserData();
    }
  }, [profileUserId]);

  const calculateMovieWatchTime = (completedItems) => {
    return completedItems.reduce((total, item) => total + (item.runtime || 120), 0) / 60;
  };

  const calculateTVWatchTime = (completedItems) => {
    return completedItems.reduce((total, item) => {
      const episodeLength = 45; // Average episode length in minutes
      const totalEpisodes = item.totalEpisodes || 1;
      return total + (episodeLength * totalEpisodes / 60);
    }, 0);
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
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" tip="Loading profile..." />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16} style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
        <Col span={14}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Movie Stats Overview */}
            <Title level={3}>Movies</Title>
            <Row gutter={16}>
              <Col span={6}>
                <Card>
                  <Statistic title="Total Movies" value={stats.movieTotal} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="Watching" value={stats.movieWatching} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="Completed" value={stats.movieCompleted} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="Hours Watched" value={Math.round(stats.movieHoursWatched)} />
                </Card>
              </Col>
            </Row>
            
            {/* TV Stats Overview */}
            <Title level={3}>TV Shows</Title>
            <Row gutter={16}>
              <Col span={6}>
                <Card>
                  <Statistic title="Total Shows" value={stats.tvTotal} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="Watching" value={stats.tvWatching} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="Completed" value={stats.tvCompleted} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="Hours Watched" value={Math.round(stats.tvHoursWatched)} />
                </Card>
              </Col>
            </Row>
          </Space>
        </Col>
        <Col span={10}>
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
        </Col>
      </Row>
    </div>
  );
};

export default Home;