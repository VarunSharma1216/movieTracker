import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { message, Button, Dropdown, Card, Space, Typography, Image, Spin, Alert, Row, Col, Tabs, Avatar, Tag, List, Divider } from 'antd';
import { supabase } from '../supabase';
import { PlayCircleOutlined, DollarCircleOutlined, ClockCircleOutlined, CalendarOutlined } from '@ant-design/icons';
import { 
  PageTransition, 
  StaggerContainer, 
  StaggerItem, 
  HoverLift, 
  FadeIn, 
  SlideUp,
  SlideInLeft,
  SlideInRight,
  ScaleIn
} from '../components/animations/AnimatedComponents';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const items = [
  { label: 'Watching', key: 'item-1' },
  { label: 'Planned', key: 'item-2' },
  { label: 'Completed', key: 'item-3' },
];

const MovieDetail = () => {
  const { movieId } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [credits, setCredits] = useState(null);
  const [streamingInfo, setStreamingInfo] = useState(null);
  const [similar, setSimilar] = useState(null);
  const [franchise, setFranchise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [option, setOption] = useState('Click to Select an Option');
  

  // Function to fetch the movie's current status in database

  const addActivity = async (movieData, action) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const activityData = {
        user_id: user.id,
        mediaid: movieData.id,
        title: movieData.title,
        poster_path: movieData.poster_path,
        action,
        type: 'movie'
      };

      const { error } = await supabase
        .from('movie_activities')
        .insert(activityData);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error adding activity:', error);
    }
  };


  const fetchMovieStatus = async (movieId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data: watchlistData, error } = await supabase
        .from('moviewatchlist')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error || !watchlistData) {
        setOption('Click to Select an Option');
        return;
      }

      // Check each list to see where the movie exists
      const lists = ['watching', 'completed', 'planned'];
      for (const listName of lists) {
        const listMovies = watchlistData[listName] || [];
        const movieExists = listMovies.some((item) => item.id === parseInt(movieId));
        if (movieExists) {
          setOption(listName.charAt(0).toUpperCase() + listName.slice(1));
          return;
        }
      }
      setOption('Click to Select an Option');
    } catch (error) {
      console.error('Error fetching movie status:', error);
    }
  };


  const handleSelect = (value) => {
    const [type, id] = value.split("-"); // Split the prefix and ID
    if (type === "movie") {
      navigate(`/movie/${id}`); // Navigate to the movie detail page
    } else if (type === "tv") {
      navigate(`/tv/${id}`); // Navigate to the TV show detail page
    }
  };

  // Function to add movie to the watchlist
  const addToWatchlist = async (movie, targetList) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      message.error('You must be logged in to add movies to your watchlist.');
      return;
    }

    const { id, title, poster_path, release_date, vote_average, overview, genres } = movie;

    try {
      // First get current watchlist
      const { data: currentWatchlist } = await supabase
        .from('moviewatchlist')
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

        // Check for the movie in all lists and remove it
        for (const [listName, listMovies] of Object.entries(watchlistData)) {
          const movieIndex = listMovies.findIndex((item) => item.id === id);
          if (movieIndex !== -1) {
            previousList = listName;
            watchlistData[listName] = listMovies.filter((item) => item.id !== id);
            break;
          }
        }
      }

      // Add the movie to the target list
      const movieData = {
        id,
        title,
        poster_path,
        release_date,
        vote_average,
        overview,
        genres,
        added_date: new Date().toISOString()
      };
      
      watchlistData[targetList].push(movieData);

      // Update or insert the watchlist
      const { error } = await supabase
        .from('moviewatchlist')
        .upsert({
          user_id: user.id,
          ...watchlistData
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      // Add activity based on the action
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

      await addActivity(movie, actionMessage);

    } catch (error) {
      console.error('Error updating watchlist:', error);
      message.error(`Error updating watchlist: ${error.message}`);
    }
  };

  // onClick handler that updates the option state with the selected label and adds to the watchlist
  const onClick = ({ key }) => {
    const selectedItem = items.find((item) => item.key === key);
    if (selectedItem) {
      setOption(selectedItem.label);
      message.success(`${movie.title} ${selectedItem.label.toLowerCase() === 'watching' ? 'added to Currently Watching' : 
        selectedItem.label.toLowerCase() === 'planned' ? 'added to Plan to Watch' : 
        'marked as Completed'}`, 0.7);

      addToWatchlist(movie, selectedItem.label.toLowerCase());
    }
  };

  useEffect(() => {
    const fetchAllMovieData = async () => {
      try {
        const apiKey = process.env.REACT_APP_TMDB_API_KEY;
        
        // Fetch movie details, credits, streaming info, similar movies, and collection in parallel
        const [
          movieResponse,
          creditsResponse,
          watchProvidersResponse,
          similarResponse,
        ] = await Promise.all([
          axios.get(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}`),
          axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${apiKey}`),
          axios.get(`https://api.themoviedb.org/3/movie/${movieId}/watch/providers?api_key=${apiKey}`),
          axios.get(`https://api.themoviedb.org/3/movie/${movieId}/similar?api_key=${apiKey}`),
        ]);

        setMovie(movieResponse.data);
        setCredits(creditsResponse.data);
        setStreamingInfo(watchProvidersResponse.data);
        setSimilar(similarResponse.data);

        // If movie belongs to a collection, fetch collection details
        if (movieResponse.data.belongs_to_collection) {
          const collectionResponse = await axios.get(
            `https://api.themoviedb.org/3/collection/${movieResponse.data.belongs_to_collection.id}?api_key=${apiKey}`
          );
          setFranchise(collectionResponse.data);
        }

        // Fetch the movie's status in the watchlist
        fetchMovieStatus(movieId);
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllMovieData();
  }, [movieId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="Loading movie details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <Alert
          message="Error"
          description={`Error fetching movie details: ${error.message}`}
          type="error"
          showIcon
        />
      </div>
    );
  }

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

  return (
    <PageTransition>
      <div style={{ maxWidth: '900px', margin: '20px auto', padding: '20px' }}>
        {/* Top Section */}
        <FadeIn delay={0.1}>
          <Card>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={10} md={8} lg={6}>
                <SlideInLeft delay={0.2}>
                  <Row style={{ marginBottom: '20px' }}>
                    {movie.poster_path && (
                      <ScaleIn delay={0.3}>
                        <Image
                          src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                          alt={movie.title}
                          style={{ width: '100%', height: 'auto' }}
                        />
                      </ScaleIn>
                    )}
                  </Row>

                  <Row style={{ marginBottom: '10px' }}>
                    <HoverLift scale={1.02}>
                      <Dropdown menu={{ items, onClick }}>
                        <Button block size="large">{option}</Button>
                      </Dropdown>
                    </HoverLift>
                  </Row>
                </SlideInLeft>
              </Col>

              <Col xs={24} sm={14} md={16} lg={18}>
                <SlideInRight delay={0.2}>
                  <div style={{ padding: '20px' }}>
                    <FadeIn delay={0.4}>
                      <Title level={2}>{movie.title}</Title>
                    </FadeIn>
                    
                    <FadeIn delay={0.5}>
                      <Space size={[0, 8]} wrap>
                        <Tag icon={<CalendarOutlined />}>{movie.release_date}</Tag>
                        <Tag icon={<ClockCircleOutlined />}>{movie.runtime} min</Tag>
                        <Tag icon={<DollarCircleOutlined />}>${movie.budget?.toLocaleString()}</Tag>
                        <Tag color="gold">{movie.vote_average.toFixed(1)} / 10</Tag>
                      </Space>
                    </FadeIn>

                    <FadeIn delay={0.6}>
                      {movie.genres?.map(genre => (
                        <Tag key={genre.id} style={{ margin: '8px 4px' }}>{genre.name}</Tag>
                      ))}
                    </FadeIn>

                    <SlideUp delay={0.7}>
                      <Paragraph style={{ marginTop: '20px' }}>{movie.overview}</Paragraph>
                    </SlideUp>
                  </div>
                </SlideInRight>
              </Col>
            </Row>
          </Card>
        </FadeIn>

      {/* Detailed Information Tabs */}
      <FadeIn delay={0.8}>
        <Card style={{ marginTop: '20px' }}>
          <Tabs defaultActiveKey="cast">
            <TabPane tab="Cast & Crew" key="cast">
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <SlideUp delay={0.1}>
                    <Title level={4}>Top Cast</Title>
                  </SlideUp>
                  <StaggerContainer staggerDelay={0.1}>
                    <Row gutter={[16, 16]}>
                      {credits?.cast?.slice(0, 6).map(actor => (
                        <Col xs={12} sm={8} md={6} lg={4} key={actor.id}>
                          <StaggerItem>
                            <HoverLift scale={1.05}>
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
                            </HoverLift>
                          </StaggerItem>
                        </Col>
                      ))}
                    </Row>
                  </StaggerContainer>
                </Col>

              <Col span={24} style={{ marginTop: '20px' }}>
                <Title level={4}>Director & Key Crew</Title>
                <List
                  grid={{ gutter: 16, column: 4 }}
                  dataSource={credits?.crew?.filter(person => 
                    ['Director', 'Producer', 'Screenplay', 'Writer'].includes(person.job)
                  )}
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
                          description={person.job}
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

          {franchise && (
            <TabPane tab="Franchise" key="franchise">
              <Title level={4}>{franchise.name}</Title>
              <Row gutter={[16, 16]}>
                {franchise.parts?.sort((a, b) => a.release_date.localeCompare(b.release_date))
                  .map(movie => (
                    <Col xs={12} sm={8} md={6} lg={4} key={movie.id}>
                      <Card
                        hoverable
                        cover={
                          <img
                            alt={movie.title}
                            src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`}
                          />
                        }
                      >
                        <Card.Meta
                          title={movie.title}
                          description={movie.release_date?.split('-')[0]}
                        />
                      </Card>
                    </Col>
                  ))}
              </Row>
            </TabPane>
          )}

          <TabPane tab="Similar Movies" key="similar">
            <Title level={4}>You Might Also Like</Title>
            <Row gutter={[16, 16]}>
              {similar?.results?.slice(0, 6).map(movie => (
                <Col xs={12} sm={8} md={6} lg={4} key={movie.id}>
                  <Card
                    hoverable
                    onClick={() => handleSelect(`movie-${movie.id}`)}
                    cover={
                      <img
                        alt={movie.title}
                        src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`}
                      />
                    }
                  >
                    <Card.Meta
                      title={movie.title}
                      description={`${movie.vote_average.toFixed(1)} / 10`}
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </TabPane>
        </Tabs>
        </Card>
      </FadeIn>
      </div>
    </PageTransition>
  );
};


export default MovieDetail;
