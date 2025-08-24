import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { message, Button, Dropdown, Card, Space, Typography, Image, Spin, Alert, Row, Col, Tabs, Avatar, Tag, List, Divider } from 'antd';
import { supabase } from '../supabase';
import { PlayCircleOutlined, DollarCircleOutlined, ClockCircleOutlined, CalendarOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const items = [
  { label: 'Watching', key: 'watching' },
  { label: 'Planned', key: 'planned' },
  { label: 'Completed', key: 'completed' },
];

const TVDetail = () => {
  const { tvId } = useParams();
  const navigate = useNavigate();
  const [tvShow, setTVShow] = useState(null);
  const [credits, setCredits] = useState(null);
  const [streamingInfo, setStreamingInfo] = useState(null);
  const [similar, setSimilar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [option, setOption] = useState('Click to Select an Option');

  const addActivity = async (tvData, action) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const activityData = {
        user_id: user.id,
        mediaid: tvData.id,
        title: tvData.name,
        poster_path: tvData.poster_path,
        action,
        type: 'tv'
      };

      const { error } = await supabase
        .from('tv_activities')
        .insert(activityData);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error adding activity:', error);
    }
  };

  const fetchTVStatus = async (tvId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data: watchlistData, error } = await supabase
        .from('tvwatchlist')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error || !watchlistData) {
        setOption('Click to Select an Option');
        return;
      }

      const lists = ['watching', 'completed', 'planned'];
      for (const listName of lists) {
        const listShows = watchlistData[listName] || [];
        if (listShows.some((item) => item.id === parseInt(tvId))) {
          setOption(listName.charAt(0).toUpperCase() + listName.slice(1));
          return;
        }
      }
      setOption('Click to Select an Option');
    } catch (error) {
      console.error('Error fetching TV status:', error);
    }
  };

  const handleSelect = (value) => {
    const [type, id] = value.split("-");
    if (type === "movie") {
      navigate(`/movie/${id}`);
    } else if (type === "tv") {
      navigate(`/tv/${id}`);
    }
  };

  const addToWatchlist = async (tvShow, targetList) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      message.error('You must be logged in to add shows to your watchlist.');
      return;
    }
  
    const { id, name, poster_path, first_air_date, vote_average, overview, genres, seasons } = tvShow;
  
    // Calculate the number of episodes in the last season
    const lastSeasonNumber = tvShow.number_of_seasons;
    const lastSeason = tvShow.seasons?.find(season => season.season_number === lastSeasonNumber);
    const lastSeasonEpisodes = lastSeason?.episode_count || 0;
  
    try {
      // Get current watchlist
      const { data: currentWatchlist } = await supabase
        .from('tvwatchlist')
        .select('*')
        .eq('user_id', user.id)
        .single();

      let watchlistData = {
        watching: [],
        completed: [],
        planned: []
      };
      
      let previousList = null;

      if (currentWatchlist) {
        watchlistData = {
          watching: currentWatchlist.watching || [],
          completed: currentWatchlist.completed || [],
          planned: currentWatchlist.planned || []
        };

        // Check for the show in all lists and remove it
        for (const [listName, listShows] of Object.entries(watchlistData)) {
          const showIndex = listShows.findIndex((item) => item.id === id);
          if (showIndex !== -1) {
            previousList = listName;
            watchlistData[listName] = listShows.filter((item) => item.id !== id);
            break;
          }
        }
      }
  
      // Set current season and episode based on whether the show is completed
      const currSeason = targetList === 'completed' ? tvShow.number_of_seasons : 1;
      const currEpisode = targetList === 'completed' ? lastSeasonEpisodes : 1;
  
      // Add the show to the target list
      const showData = {
        id,
        name,
        poster_path,
        first_air_date,
        vote_average,
        overview,
        genres,
        currEpisode,
        currSeason,
        totalSeasons: tvShow.number_of_seasons,
        totalEpisodes: tvShow.number_of_episodes,
        added_date: new Date().toISOString()
      };
      
      watchlistData[targetList].push(showData);

      // Update or insert the watchlist
      const { error } = await supabase
        .from('tvwatchlist')
        .upsert({
          user_id: user.id,
          ...watchlistData
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
  
      let actionMessage;
      switch (targetList) {
        case 'watching':
          actionMessage = previousList ? 'moved to watching' : 'started watching';
          break;
        case 'completed':
          actionMessage = previousList ? 'marked as completed' : 'completed';
          break;
        case 'planned':
          actionMessage = previousList ? 'moved to plan to watch' : 'added to plan to watch';
          break;
        default:
          actionMessage = 'updated status';
      }
  
      await addActivity(tvShow, actionMessage);
  
    } catch (error) {
      message.error(`Error updating watchlist: ${error.message}`);
    }
  };

  const onClick = ({ key }) => {
    const selectedItem = items.find((item) => item.key === key);
    if (selectedItem) {
      setOption(selectedItem.label);
      message.success(`${tvShow.name} ${selectedItem.label.toLowerCase() === 'watching' ? 'added to Currently Watching' : 
        selectedItem.label.toLowerCase() === 'planned' ? 'added to Plan to Watch' : 
        'marked as Completed'}`, 0.7);

      addToWatchlist(tvShow, selectedItem.label.toLowerCase());
    }
  };

  const renderStreamingServices = () => {
    const usProviders = streamingInfo?.results?.US;
    if (!usProviders) return <Text>No streaming information available</Text>;

    const renderProviderList = (providers, title) => {
      if (!providers?.length) return null;
      return (
        <div style={{ marginBottom: '16px' }}>
          <Text strong>{title}</Text>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
            {providers.map(provider => (
              <Avatar
                key={provider.provider_id}
                src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                alt={provider.provider_name}
                title={provider.provider_name}
                size="large"
              />
            ))}
          </div>
        </div>
      );
    };

    return (
      <>
        {renderProviderList(usProviders.flatrate, "Stream")}
        {renderProviderList(usProviders.rent, "Rent")}
        {renderProviderList(usProviders.buy, "Buy")}
      </>
    );
  };

  useEffect(() => {
    const fetchAllTVData = async () => {
      try {
        const apiKey = process.env.REACT_APP_TMDB_API_KEY;
        
        const [
          tvResponse,
          creditsResponse,
          watchProvidersResponse,
          similarResponse,
        ] = await Promise.all([
          axios.get(`https://api.themoviedb.org/3/tv/${tvId}?api_key=${apiKey}`),
          axios.get(`https://api.themoviedb.org/3/tv/${tvId}/credits?api_key=${apiKey}`),
          axios.get(`https://api.themoviedb.org/3/tv/${tvId}/watch/providers?api_key=${apiKey}`),
          axios.get(`https://api.themoviedb.org/3/tv/${tvId}/similar?api_key=${apiKey}`),
        ]);

        setTVShow(tvResponse.data);
        setCredits(creditsResponse.data);
        setStreamingInfo(watchProvidersResponse.data);
        setSimilar(similarResponse.data);

        fetchTVStatus(tvId);
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllTVData();
  }, [tvId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="Loading TV show details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <Alert
          message="Error"
          description={`Error fetching TV show details: ${error.message}`}
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '20px auto', padding: '20px' }}>
      <Card>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={10} md={8} lg={6}>
            <Row style={{ marginBottom: '20px' }}>
              {tvShow.poster_path && (
                <Image
                  src={`https://image.tmdb.org/t/p/w500${tvShow.poster_path}`}
                  alt={tvShow.name}
                  style={{ width: '100%', height: 'auto' }}
                />
              )}
            </Row>

            <Row style={{ marginBottom: '10px' }}>
              <Dropdown menu={{ items, onClick }}>
                <Button block>{option}</Button>
              </Dropdown>
            </Row>
          </Col>

          <Col xs={24} sm={14} md={16} lg={18}>
            <div style={{ padding: '20px' }}>
              <Title level={2}>{tvShow.name}</Title>
              
              <Space size={[0, 8]} wrap>
                <Tag icon={<CalendarOutlined />}>{tvShow.first_air_date}</Tag>
                <Tag icon={<ClockCircleOutlined />}>{tvShow.episode_run_time?.[0] || 'N/A'} min</Tag>
                <Tag icon={<PlayCircleOutlined />}>
                  {tvShow.number_of_seasons} Seasons, {tvShow.number_of_episodes} Episodes
                </Tag>
                <Tag color="gold">{tvShow.vote_average.toFixed(1)} / 10</Tag>
              </Space>

              {tvShow.genres?.map(genre => (
                <Tag key={genre.id} style={{ margin: '8px 4px' }}>{genre.name}</Tag>
              ))}

              <Paragraph style={{ marginTop: '20px' }}>{tvShow.overview}</Paragraph>
            </div>
          </Col>
        </Row>
      </Card>

      <Card style={{ marginTop: '20px' }}>
        <Tabs defaultActiveKey="cast">
          <TabPane tab="Cast & Crew" key="cast">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Title level={4}>Top Cast</Title>
                <Row gutter={[16, 16]}>
                  {credits?.cast?.slice(0, 6).map(actor => (
                    <Col xs={12} sm={8} md={6} lg={4} key={actor.id}>
                      <Card
                        hoverable
                        cover={
                          <img
                            alt={actor.name}
                            src={actor.profile_path 
                              ? `https://image.tmdb.org/t/p/w300${actor.profile_path}`
                              : '/api/placeholder/300/450'}
                          />
                        }
                      >
                        <Card.Meta
                          title={actor.name}
                          description={actor.character}
                        />
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Col>

              <Col span={24} style={{ marginTop: '20px' }}>
                <Title level={4}>Creators & Key Crew</Title>
                <List
                  grid={{ gutter: 16, column: 4 }}
                  dataSource={[
                    ...(tvShow.created_by || []),
                    ...(credits?.crew?.filter(person => 
                      ['Executive Producer', 'Producer', 'Writer'].includes(person.job)
                    ) || [])
                  ]}
                  renderItem={person => (
                    <List.Item>
                      <Card>
                        <Card.Meta
                          avatar={
                            <Avatar
                              src={person.profile_path 
                                ? `https://image.tmdb.org/t/p/w200${person.profile_path}`
                                : null}
                              size={64}
                            />
                          }
                          title={person.name}
                          description={person.job || 'Creator'}
                        />
                      </Card>
                    </List.Item>
                  )}
                />
              </Col>
            </Row>
          </TabPane>

          <TabPane tab="Where to Watch" key="streaming">
            <Title level={4}>Streaming Availability</Title>
            {renderStreamingServices()}
          </TabPane>

          <TabPane tab="Similar Shows" key="similar">
            <Title level={4}>You Might Also Like</Title>
            <Row gutter={[16, 16]}>
              {similar?.results?.slice(0, 6).map(show => (
                <Col xs={12} sm={8} md={6} lg={4} key={show.id}>
                  <Card
                    hoverable
                    onClick={() => handleSelect(`tv-${show.id}`)}
                    cover={
                      <img
                        alt={show.name}
                        src={`https://image.tmdb.org/t/p/w300${show.poster_path}`}
                      />
                    }
                  >
                    <Card.Meta
                      title={show.name}
                      description={`${show.vote_average.toFixed(1)} / 10`}
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default TVDetail;