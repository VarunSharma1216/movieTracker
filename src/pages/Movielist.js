import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { message, Spin, Table, Divider, Input } from 'antd';
import { MinusCircleOutlined } from '@ant-design/icons';
import { Link, useParams } from 'react-router-dom';
import { 
  PageTransition, 
  StaggerContainer, 
  StaggerItem, 
  HoverLift, 
  FadeIn, 
  SlideUp,
  ScaleIn
} from '../components/animations/AnimatedComponents';

const Movielist = () => {
  const { username } = useParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [profileUserId, setProfileUserId] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [watchingMovies, setWatchingMovies] = useState([]);
  const [completedMovies, setCompletedMovies] = useState([]);
  const [plannedMovies, setPlannedMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingMovie, setEditingMovie] = useState(null);

  // Simplified: Load auth and data quickly
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      try {
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user || null;
        setCurrentUser(user);
        
        if (!user) {
          setLoading(false);
          return;
        }
        
        // For movie list, always use current user
        setProfileUserId(user.id);
        setIsOwnProfile(true);
        
        // Fetch watchlist
        const { data, error } = await supabase
          .from('moviewatchlist')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (data) {
          const { watching = [], completed = [], planned = [] } = data;
          setWatchingMovies(watching);
          setCompletedMovies(completed);
          setPlannedMovies(planned);
        } else {
          setWatchingMovies([]);
          setCompletedMovies([]);
          setPlannedMovies([]);
        }
        
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);



  const handleRemoveMovie = async (movieId, listName) => {
    if (!isOwnProfile) {
      message.error("You can only remove movies from your own profile");
      return;
    }

    if (!currentUser) {
      message.error('You must be logged in to remove a movie.');
      return;
    }

    try {
      const updatedList = {
        watching: watchingMovies,
        completed: completedMovies,
        planned: plannedMovies,
      };

      // Filter out the movie to be removed
      updatedList[listName] = updatedList[listName].filter((movie) => movie.id !== movieId);

      // Save the updated list to Supabase
      const { error } = await supabase
        .from('moviewatchlist')
        .update({ [listName]: updatedList[listName] })
        .eq('user_id', currentUser.id);
      
      if (error) throw error;

      // Update the state locally
      if (listName === 'watching') setWatchingMovies(updatedList[listName]);
      if (listName === 'completed') setCompletedMovies(updatedList[listName]);
      if (listName === 'planned') setPlannedMovies(updatedList[listName]);

      message.success('Movie removed!', 0.7);
    } catch (error) {
      message.error(`Error removing movie: ${error.message}`);
    }
  };

  const updateRating = async (movieId, newRating, listName) => {
    if (!isOwnProfile) {
      message.error("You can only update ratings on your own profile");
      return;
    }

    if (!currentUser) {
      message.error('You must be logged in to update the rating.');
      return;
    }

    try {
      const updatedList = {
        watching: watchingMovies,
        completed: completedMovies,
        planned: plannedMovies,
      };

      // Update the rating for the specific movie in the relevant list
      updatedList[listName] = updatedList[listName].map((movie) =>
        movie.id === movieId ? { ...movie, rating: newRating } : movie
      );

      // Save the updated list to Supabase
      const { error } = await supabase
        .from('moviewatchlist')
        .update({ [listName]: updatedList[listName] })
        .eq('user_id', currentUser.id);
      
      if (error) throw error;

      // Update the state locally
      if (listName === 'watching') setWatchingMovies(updatedList[listName]);
      if (listName === 'completed') setCompletedMovies(updatedList[listName]);
      if (listName === 'planned') setPlannedMovies(updatedList[listName]);

      setEditingMovie(null); // Exit editing mode
      message.success('Rating updated!', 0.7);
    } catch (error) {
      message.error(`Error updating rating: ${error.message}`);
    }
  };

  const columns = (listName) => [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      align: 'left',
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {record.poster_path && (
            <img
              src={`https://image.tmdb.org/t/p/w500${record.poster_path}`}
              alt={text}
              style={{
                width: 40,
                height: 40,
                marginRight: 10,
                objectFit: 'cover',
                borderRadius: '4px',
              }}
            />
          )}
          <Link to={`/movie/${record.id}`} style={{ textDecoration: 'none', color: '#1890ff' }}>
            {text}
          </Link>
        </div>
      ),
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      width: 100,
      align: 'center',
      render: (rating, record) =>
        isOwnProfile && editingMovie === record.id ? (
          <Input
            style={{ width: 80 }}
            defaultValue={rating}
            onBlur={(e) => updateRating(record.id, e.target.value, listName)}
            onPressEnter={(e) => updateRating(record.id, e.target.value, listName)}
            autoFocus
          />
        ) : (
          <span
            style={{ cursor: isOwnProfile ? 'pointer' : 'default', color: 'black' }}
            onClick={() => isOwnProfile && setEditingMovie(record.id)}
          >
            {rating ? `${rating}/10` : 'N/A'}
          </span>
        ),
    },
    {
      key: 'action',
      align: 'center',
      width: 4,
      render: (_, record) => (
        isOwnProfile && (
          <MinusCircleOutlined
            style={{ cursor: 'pointer', color: 'red' }}
            onClick={() => handleRemoveMovie(record.id, listName)}
          />
        )
      ),
    },
  ];

  if (loading) {
    return (
      <PageTransition>
        <div style={{ textAlign: 'center', padding: 50 }}>
          <Spin size="large" tip="Loading watchlist..." />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div style={{ maxWidth: 800, margin: 'auto', padding: 20 }}>
        <StaggerContainer staggerDelay={0.2}>
          <StaggerItem>
            <SlideUp delay={0.1}>
              <Divider>Watching</Divider>
            </SlideUp>
            <FadeIn delay={0.2}>
              <HoverLift scale={1.01} shadow={false}>
                <Table
                  dataSource={watchingMovies.map((movie) => ({ ...movie, key: movie.id }))}
                  columns={columns('watching')}
                  pagination={false}
                />
              </HoverLift>
            </FadeIn>
          </StaggerItem>

          <StaggerItem>
            <SlideUp delay={0.1}>
              <Divider>Completed</Divider>
            </SlideUp>
            <FadeIn delay={0.2}>
              <HoverLift scale={1.01} shadow={false}>
                <Table
                  dataSource={completedMovies.map((movie) => ({ ...movie, key: movie.id }))}
                  columns={columns('completed')}
                  pagination={false}
                />
              </HoverLift>
            </FadeIn>
          </StaggerItem>

          <StaggerItem>
            <SlideUp delay={0.1}>
              <Divider>Planned</Divider>
            </SlideUp>
            <FadeIn delay={0.2}>
              <HoverLift scale={1.01} shadow={false}>
                <Table
                  dataSource={plannedMovies.map((movie) => ({ ...movie, key: movie.id }))}
                  columns={columns('planned')}
                  pagination={false}
                />
              </HoverLift>
            </FadeIn>
          </StaggerItem>
        </StaggerContainer>
      </div>
    </PageTransition>
  );
};

export default Movielist;