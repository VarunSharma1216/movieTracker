import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Card, Spin, Row, Col, Typography, Avatar, Space, Statistic, message } from 'antd';
import { Link, useParams } from 'react-router-dom';
import { 
  PageTransition, 
  StaggerContainer, 
  StaggerItem, 
  HoverLift, 
  FadeIn, 
  SlideUp,
  SlideInLeft,
  SlideInRight,
  CountUp
} from '../components/animations/AnimatedComponents';

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch profile user ID from username
  useEffect(() => {
    const fetchProfileUserId = async () => {
      if (!username) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('id')
          .eq('username', username)
          .single();

        if (error || !data) {
          message.error('User not found');
          return;
        }

        setProfileUserId(data.id);

        // Check if this is the current user's profile
        if (currentUser && currentUser.id === data.id) {
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
      const { data: movieWatchlist } = await supabase
        .from('moviewatchlist')
        .select('*')
        .eq('user_id', profileUserId)
        .single();

      // Fetch TV watchlist
      const { data: tvWatchlist } = await supabase
        .from('tvwatchlist')
        .select('*')
        .eq('user_id', profileUserId)
        .single();

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

      if (movieWatchlist) {
        movieStats = {
          total: (movieWatchlist.watching?.length || 0) + (movieWatchlist.completed?.length || 0) + (movieWatchlist.planned?.length || 0),
          watching: movieWatchlist.watching?.length || 0,
          completed: movieWatchlist.completed?.length || 0,
          planned: movieWatchlist.planned?.length || 0,
          hoursWatched: calculateMovieWatchTime(movieWatchlist.completed || []),
        };
      }

      if (tvWatchlist) {
        tvStats = {
          total: (tvWatchlist.watching?.length || 0) + (tvWatchlist.completed?.length || 0) + (tvWatchlist.planned?.length || 0),
          watching: tvWatchlist.watching?.length || 0,
          completed: tvWatchlist.completed?.length || 0,
          planned: tvWatchlist.planned?.length || 0,
          hoursWatched: calculateTVWatchTime(tvWatchlist.completed || []),
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
      const [movieActivitiesData, tvActivitiesData] = await Promise.all([
        supabase
          .from('movie_activities')
          .select('*')
          .eq('user_id', profileUserId)
          .order('timestamp', { ascending: false })
          .limit(10),
        supabase
          .from('tv_activities')
          .select('*')
          .eq('user_id', profileUserId)
          .order('timestamp', { ascending: false })
          .limit(10)
      ]);

      const movieActivities = (movieActivitiesData.data || []).map((activity) => ({
        ...activity,
        timestamp: new Date(activity.timestamp),
      }));

      const tvActivities = (tvActivitiesData.data || []).map((activity) => ({
        ...activity,
        timestamp: new Date(activity.timestamp),
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
      <PageTransition>
        <div style={{ textAlign: 'center', padding: 50 }}>
          <Spin size="large" tip="Loading profile..." />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div style={{ padding: 16 }}>
        <Row gutter={16} style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
          <Col xs={24} sm={24} md={14}>
            <SlideInLeft delay={0.1}>
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* Movie Stats Overview */}
                <FadeIn delay={0.2}>
                  <Title level={3}>Movies</Title>
                </FadeIn>
                <StaggerContainer staggerDelay={0.1}>
                  <Row gutter={[16, 16]}>
                    <Col xs={12} sm={6} md={6}>
                      <StaggerItem>
                        <HoverLift scale={1.02}>
                          <Card>
                            <CountUp delay={0.3}>
                              <Statistic 
                                title="Total Movies" 
                                value={stats.movieTotal} 
                                valueStyle={{ fontSize: '16px' }}
                                titleStyle={{ fontSize: '12px' }}
                              />
                            </CountUp>
                          </Card>
                        </HoverLift>
                      </StaggerItem>
                    </Col>
                    <Col xs={12} sm={6} md={6}>
                      <StaggerItem>
                        <HoverLift scale={1.02}>
                          <Card>
                            <CountUp delay={0.4}>
                              <Statistic 
                                title="Watching" 
                                value={stats.movieWatching}
                                valueStyle={{ fontSize: '16px' }}
                                titleStyle={{ fontSize: '12px' }}
                              />
                            </CountUp>
                          </Card>
                        </HoverLift>
                      </StaggerItem>
                    </Col>
                    <Col xs={12} sm={6} md={6}>
                      <StaggerItem>
                        <HoverLift scale={1.02}>
                          <Card>
                            <CountUp delay={0.5}>
                              <Statistic 
                                title="Completed" 
                                value={stats.movieCompleted}
                                valueStyle={{ fontSize: '16px' }}
                                titleStyle={{ fontSize: '12px' }}
                              />
                            </CountUp>
                          </Card>
                        </HoverLift>
                      </StaggerItem>
                    </Col>
                    <Col xs={12} sm={6} md={6}>
                      <StaggerItem>
                        <HoverLift scale={1.02}>
                          <Card>
                            <CountUp delay={0.6}>
                              <Statistic 
                                title="Hours Watched" 
                                value={Math.round(stats.movieHoursWatched)}
                                valueStyle={{ fontSize: '16px' }}
                                titleStyle={{ fontSize: '12px' }}
                              />
                            </CountUp>
                          </Card>
                        </HoverLift>
                      </StaggerItem>
                    </Col>
                  </Row>
                </StaggerContainer>
                
                {/* TV Stats Overview */}
                <FadeIn delay={0.7}>
                  <Title level={3}>TV Shows</Title>
                </FadeIn>
                <StaggerContainer staggerDelay={0.1}>
                  <Row gutter={[16, 16]}>
                    <Col xs={12} sm={6} md={6}>
                      <StaggerItem>
                        <HoverLift scale={1.02}>
                          <Card>
                            <CountUp delay={0.8}>
                              <Statistic 
                                title="Total Shows" 
                                value={stats.tvTotal}
                                valueStyle={{ fontSize: '16px' }}
                                titleStyle={{ fontSize: '12px' }}
                              />
                            </CountUp>
                          </Card>
                        </HoverLift>
                      </StaggerItem>
                    </Col>
                    <Col xs={12} sm={6} md={6}>
                      <StaggerItem>
                        <HoverLift scale={1.02}>
                          <Card>
                            <CountUp delay={0.9}>
                              <Statistic 
                                title="Watching" 
                                value={stats.tvWatching}
                                valueStyle={{ fontSize: '16px' }}
                                titleStyle={{ fontSize: '12px' }}
                              />
                            </CountUp>
                          </Card>
                        </HoverLift>
                      </StaggerItem>
                    </Col>
                    <Col xs={12} sm={6} md={6}>
                      <StaggerItem>
                        <HoverLift scale={1.02}>
                          <Card>
                            <CountUp delay={1.0}>
                              <Statistic 
                                title="Completed" 
                                value={stats.tvCompleted}
                                valueStyle={{ fontSize: '16px' }}
                                titleStyle={{ fontSize: '12px' }}
                              />
                            </CountUp>
                          </Card>
                        </HoverLift>
                      </StaggerItem>
                    </Col>
                    <Col xs={12} sm={6} md={6}>
                      <StaggerItem>
                        <HoverLift scale={1.02}>
                          <Card>
                            <CountUp delay={1.1}>
                              <Statistic 
                                title="Hours Watched" 
                                value={Math.round(stats.tvHoursWatched)}
                                valueStyle={{ fontSize: '16px' }}
                                titleStyle={{ fontSize: '12px' }}
                              />
                            </CountUp>
                          </Card>
                        </HoverLift>
                      </StaggerItem>
                    </Col>
                  </Row>
                </StaggerContainer>
              </Space>
            </SlideInLeft>
          </Col>
          <Col xs={24} sm={24} md={10}>
            <SlideInRight delay={0.3}>
              <HoverLift scale={1.01}>
                <Card title="Recent Activities">
                  <StaggerContainer staggerDelay={0.1}>
                    {recentActivities.map((activity) => (
                      <StaggerItem key={activity.id}>
                        <HoverLift scale={1.01} shadow={false}>
                          <div style={{ display: 'flex', marginBottom: '16px', flexWrap: 'wrap' }}>
                            {activity.poster_path && (
                              <Avatar
                                shape="square"
                                size={64}
                                src={`https://image.tmdb.org/t/p/w92${activity.poster_path}`}
                                alt={activity.title}
                                style={{ flexShrink: 0 }}
                              />
                            )}
                            <div style={{ 
                              marginLeft: activity.poster_path ? '16px' : '0', 
                              flex: 1, 
                              minWidth: 0,
                              wordWrap: 'break-word',
                              overflowWrap: 'break-word'
                            }}>
                              <Title 
                                level={5} 
                                style={{ 
                                  marginBottom: '4px',
                                  fontSize: '14px',
                                  lineHeight: '1.2'
                                }}
                              >
                                <Link to={`/${activity.type}/${activity.mediaId}`}>
                                  {activity.title}
                                </Link>
                              </Title>
                              <Text style={{ fontSize: '12px' }}>{activity.action}</Text>
                              <div>
                                <Text type="secondary" style={{ fontSize: '11px' }}>
                                  {formatTimeAgo(activity.timestamp)}
                                </Text>
                              </div>
                            </div>
                          </div>
                        </HoverLift>
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                </Card>
              </HoverLift>
            </SlideInRight>
          </Col>
        </Row>
      </div>
    </PageTransition>
  );
};

export default Home;