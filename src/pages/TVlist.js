  import React, { useState, useEffect } from 'react';
  import { supabase } from '../supabase';
  import { message, Spin, Table, Divider, Input } from 'antd';
  import { MinusOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
  import { Link, useParams } from 'react-router-dom';
  import axios from 'axios';
  import { 
    PageTransition, 
    StaggerContainer, 
    StaggerItem, 
    HoverLift, 
    FadeIn, 
    SlideUp
  } from '../components/animations/AnimatedComponents';

  const TVlist = () => {
    const { username } = useParams();
    const [currentUser, setCurrentUser] = useState(null);
    const [profileUserId, setProfileUserId] = useState(null);
    const [isOwnProfile, setIsOwnProfile] = useState(false);
    const [watchingShows, setWatchingShows] = useState([]);
    const [completedShows, setCompletedShows] = useState([]);
    const [plannedShows, setPlannedShows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [seasonsData, setSeasonsData] = useState({});
    const [episodesData, setEpisodesData] = useState({});
    const [hoveredRow, setHoveredRow] = useState(null);
    const [editingShow, setEditingShow] = useState(null);

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
          
          // For TV list, always use current user
          setProfileUserId(user.id);
          setIsOwnProfile(true);
          
          // Fetch watchlist
          const { data, error } = await supabase
            .from('tvwatchlist')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (data) {
            const { watching = [], completed = [], planned = [] } = data;
            setWatchingShows(watching);
            setCompletedShows(completed);
            setPlannedShows(planned);
          } else {
            setWatchingShows([]);
            setCompletedShows([]);
            setPlannedShows([]);
          }
          
        } catch (error) {
          console.error('Error loading TV data:', error);
        } finally {
          setLoading(false);
        }
      };
      
      loadData();
    }, []);



    // Modify all interaction functions to check for isOwnProfile
    const updateRating = async (showId, newRating, listName) => {
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
          watching: watchingShows,
          completed: completedShows,
          planned: plannedShows,
        };

        // Update the rating for the specific show in the relevant list
        updatedList[listName] = updatedList[listName].map((show) =>
          show.id === showId ? { ...show, rating: newRating } : show
        );

        // Save the updated list to Supabase
        const { error } = await supabase
          .from('tvwatchlist')
          .update({ [listName]: updatedList[listName] })
          .eq('user_id', currentUser.id);
        
        if (error) throw error;

        // Update the state locally
        if (listName === 'watching') setWatchingShows(updatedList[listName]);
        if (listName === 'completed') setCompletedShows(updatedList[listName]);
        if (listName === 'planned') setPlannedShows(updatedList[listName]);

        setEditingShow(null); // Exit editing mode
        message.success('Rating updated!', 0.7);
      } catch (error) {
        message.error(`Error updating rating: ${error.message}`);
      }
    };

    const fetchShowDetails = async (show) => {
      const apiKey = process.env.REACT_APP_TMDB_API_KEY;
      try {
        const showResponse = await axios.get(
          `https://api.themoviedb.org/3/tv/${show.id}?api_key=${apiKey}`
        );
        const { number_of_seasons, vote_average } = showResponse.data;
        
        // Fetch episodes for current season
        const episodeCount = await fetchEpisodesCount(show.id, show.currSeason || 1);
        
        // Update episodes data while preserving existing episode count
        setEpisodesData(prev => ({
          ...prev,
          [show.id]: {
            totalEpisodes: episodeCount,
            currEpisode: show.currEpisode || prev[show.id]?.currEpisode || 1
          }
        }));

        return {
          ...show,
          totalSeasons: number_of_seasons,
          vote_average,
          currEpisode: show.currEpisode || 1, // Ensure currEpisode is preserved
          currSeason: show.currSeason || 1     // Ensure currSeason is preserved
        };
      } catch (error) {
        console.error(`Failed to fetch data for show ID ${show.id}:`, error);
        return show;
      }
    };

    const fetchSeasons = async (showId) => {
      try {
        // Make the API request to fetch the number of seasons
        const apiKey = process.env.REACT_APP_TMDB_API_KEY;
        const response = await axios.get(
          `https://api.themoviedb.org/3/tv/${showId}?api_key=${apiKey}`
        );
        const numberOfSeasons = response.data.number_of_seasons;
        setSeasonsData((prev) => ({ ...prev, [showId]: numberOfSeasons }));
      } catch (error) {
        console.error('Error fetching number of seasons:', error);
        // Set default in case of error
        setSeasonsData((prev) => ({ ...prev, [showId]: 1 }));
      }
    };

    const fetchEpisodesCount = async (showId, season) => {
      try {
        const apiKey = process.env.REACT_APP_TMDB_API_KEY;
        const response = await axios.get(
          `https://api.themoviedb.org/3/tv/${showId}/season/${season}?api_key=${apiKey}`
        );
        return response.data?.episodes?.length || 1;
      } catch (error) {
        console.error('Error fetching episodes:', error);
        return 1;
      }
    };


    const incrementEpisode = async (showId, listName) => {
      if (!isOwnProfile) {
        message.error("You can only update progress on your own profile");
        return;
      }

      if (!currentUser) {
        message.error('You must be logged in to update episodes.');
        return;
      }

      const showData = episodesData[showId];
      if (!showData) {
        message.error('Episode data not found');
        return;
      }

      const { currEpisode, totalEpisodes } = showData;
      const show = listName === 'watching' ? 
        watchingShows.find(s => s.id === showId) : 
        completedShows.find(s => s.id === showId) || 
        plannedShows.find(s => s.id === showId);

      if (!show) {
        message.error('Show not found');
        return;
      }

      let newEpisode = currEpisode + 1;
      let newSeason = show.currSeason || 1;
      let shouldMoveToCompleted = false;

      // Check if we need to move to next season
      if (newEpisode > totalEpisodes) {
        // Fetch total number of seasons
        const totalSeasons = seasonsData[showId] || 1;
        
        if (newSeason < totalSeasons) {
          // Move to next season
          newSeason++;
          newEpisode = 1;
          
          // Fetch new season's episode count
          const newTotalEpisodes = await fetchEpisodesCount(showId, newSeason);
          setEpisodesData(prev => ({
            ...prev,
            [showId]: {
              totalEpisodes: newTotalEpisodes,
              currEpisode: newEpisode
            }
          }));
        } else {
          // All seasons completed
          if (listName === 'watching') {
            shouldMoveToCompleted = true;
          } else {
            message.info('All episodes completed!');
            return;
          }
        }
      }

      if (shouldMoveToCompleted) {
        // Move show from watching to completed
        const updatedWatching = watchingShows.filter(s => s.id !== showId);
        const showToMove = { ...show, currEpisode: newEpisode, currSeason: newSeason };
        const updatedCompleted = [...completedShows, showToMove];

        const { error } = await supabase
          .from('tvwatchlist')
          .update({
            watching: updatedWatching,
            completed: updatedCompleted
          })
          .eq('user_id', currentUser.id);
        
        if (error) throw error;

        setWatchingShows(updatedWatching);
        setCompletedShows(updatedCompleted);
        message.success('Show completed and moved to completed list!', 1);
      } else {
        // Update episode and season count
        const updatedList = listName === 'watching' ? 
          watchingShows.map(s => s.id === showId ? { ...s, currEpisode: newEpisode, currSeason: newSeason } : s) :
          listName === 'completed' ?
          completedShows.map(s => s.id === showId ? { ...s, currEpisode: newEpisode, currSeason: newSeason } : s) :
          plannedShows.map(s => s.id === showId ? { ...s, currEpisode: newEpisode, currSeason: newSeason } : s);

        const { error } = await supabase
          .from('tvwatchlist')
          .update({ [listName]: updatedList })
          .eq('user_id', currentUser.id);
        
        if (error) throw error;

        // Update local state
        if (listName === 'watching') setWatchingShows(updatedList);
        else if (listName === 'completed') setCompletedShows(updatedList);
        else setPlannedShows(updatedList);
      }

      // Update episodes data state
      setEpisodesData(prev => ({
        ...prev,
        [showId]: {
          ...prev[showId],
          currEpisode: newEpisode
        }
      }));

      message.success('Progress updated!', 0.7);
    };

    const decrementEpisode = async (showId, listName) => {
      if (!isOwnProfile) {
        message.error("You can only update progress on your own profile");
        return;
      }

      if (!currentUser) {
        message.error('You must be logged in to update episodes.');
        return;
      }

      const showData = episodesData[showId];
      if (!showData) {
        message.error('Episode data not found');
        return;
      }

      const { currEpisode } = showData;
      const show = listName === 'watching' ? 
        watchingShows.find(s => s.id === showId) : 
        completedShows.find(s => s.id === showId) || 
        plannedShows.find(s => s.id === showId);

      if (!show) {
        message.error('Show not found');
        return;
      }

      let newEpisode = currEpisode - 1;
      let newSeason = show.currSeason || 1;

      // Check if we need to move to previous season
      if (newEpisode < 1 && newSeason > 1) {
        newSeason--;
        // Fetch previous season's episode count
        const prevSeasonEpisodes = await fetchEpisodesCount(showId, newSeason);
        newEpisode = prevSeasonEpisodes;
        
        setEpisodesData(prev => ({
          ...prev,
          [showId]: {
            totalEpisodes: prevSeasonEpisodes,
            currEpisode: newEpisode
          }
        }));
      }

      // Update episode and season count
      const updatedList = listName === 'watching' ? 
        watchingShows.map(s => s.id === showId ? { ...s, currEpisode: newEpisode, currSeason: newSeason } : s) :
        listName === 'completed' ?
        completedShows.map(s => s.id === showId ? { ...s, currEpisode: newEpisode, currSeason: newSeason } : s) :
        plannedShows.map(s => s.id === showId ? { ...s, currEpisode: newEpisode, currSeason: newSeason } : s);

      const { error } = await supabase
        .from('tvwatchlist')
        .update({ [listName]: updatedList })
        .eq('user_id', currentUser.id);
      
      if (error) throw error;

      // Update local state
      if (listName === 'watching') setWatchingShows(updatedList);
      else if (listName === 'completed') setCompletedShows(updatedList);
      else setPlannedShows(updatedList);

      // Update episodes data state
      setEpisodesData(prev => ({
        ...prev,
        [showId]: {
          ...prev[showId],
          currEpisode: newEpisode
        }
      }));

      message.success('Progress updated!', 0.7);
    };

    const handleRemoveShow = async (showId, listName) => {
      if (!isOwnProfile) {
        message.error("You can only remove shows from your own profile");
        return;
      }

      if (!currentUser) {
        message.error('You must be logged in to remove shows.');
        return;
      }

      try {
        const updatedList = {
          watching: watchingShows,
          completed: completedShows,
          planned: plannedShows,
        };

        // Remove the show from the relevant list
        updatedList[listName] = updatedList[listName].filter((show) => show.id !== showId);

        // Save the updated list to Supabase
        const { error } = await supabase
          .from('tvwatchlist')
          .update({ [listName]: updatedList[listName] })
          .eq('user_id', currentUser.id);
        
        if (error) throw error;

        // Update the state locally
        if (listName === 'watching') setWatchingShows(updatedList[listName]);
        if (listName === 'completed') setCompletedShows(updatedList[listName]);
        if (listName === 'planned') setPlannedShows(updatedList[listName]);

        message.success('Show removed!', 0.7);
      } catch (error) {
        message.error(`Error removing show: ${error.message}`);
      }
    };

    // Modify columns to only show interactive elements for own profile
    const columns = (listName, hoveredRow) => [
      {
        title: 'Title',
        dataIndex: 'name',
        key: 'title',
        align: 'left',
        render: (text, record) => (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* TV show poster image */}
            {record.poster_path && (
              <img
                src={`https://image.tmdb.org/t/p/w500${record.poster_path}`}  // Assuming using TMDb image API
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
            {/* TV show title link */}
            <Link to={`/tv/${record.id}`} style={{ textDecoration: 'none', color: '#1890ff' }}>
              {text}
            </Link>
          </div>
        ),
      },
      {
        title: 'Season',
        key: 'season',
        align: 'center',
        width: 4,
        render: (_, record) => {
          const showId = record.id;
    
          // Trigger fetching seasons if not already fetched
          if (!seasonsData[showId]) {
            fetchSeasons(showId);
          }
    
          // Return the seasons data if available
          const seasonsWatched = record.currSeason || 1;
          console.log(seasonsWatched);
    
          return (
            <span>{seasonsData[showId] ? `${seasonsWatched}/${seasonsData[showId]}` : 'Loading seasons...'}</span>
          );
        },
      },
      {
        title: 'Episode',
        key: 'episode',
        align: 'center',
        width: 4,
        render: (_, record) => {
          const showData = episodesData[record.id];
          if (!showData) return 'Loading...';

          return (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}>
              {isOwnProfile && (
                <MinusOutlined
                  style={{
                    marginRight: 10,
                    cursor: 'pointer',
                    fontSize: '12px',
                    visibility: hoveredRow === record.key ? 'visible' : 'hidden',
                  }}
                  onClick={() => decrementEpisode(record.id, listName)}
                />
              )}
              <span>{`${showData.currEpisode}/${showData.totalEpisodes}`}</span>
              {isOwnProfile && (
                <PlusOutlined
                  style={{
                    marginLeft: 10,
                    cursor: 'pointer',
                    fontSize: '12px',
                    visibility: hoveredRow === record.key ? 'visible' : 'hidden',
                  }}
                  onClick={() => incrementEpisode(record.id, listName)}
                />
              )}
            </div>
          );
        },
      },
      {
        title: 'Rating',
        dataIndex: 'rating',
        key: 'rating',
        width: 4,
        align: 'center',
        render: (rating, record) =>
          isOwnProfile && editingShow === record.id ? (
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
              onClick={() => isOwnProfile && setEditingShow(record.id)}
            >
              {rating ? `${rating}/10` : 'N/A'}
            </span>
          ),
      },
      {
        key: 'action',
        width: 50,
        align: 'center',
        render: (_, record) =>
          isOwnProfile && hoveredRow === record.key ? (
            <MinusCircleOutlined
              style={{ cursor: 'pointer', color: 'red' }}
              onClick={() => handleRemoveShow(record.id, listName)}
            />
          ) : null,
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
                    dataSource={watchingShows.map((show) => ({ ...show, key: show.id }))}
                    columns={columns('watching', hoveredRow)}
                    pagination={false}
                    onRow={(record) => ({
                      onMouseEnter: () => isOwnProfile && setHoveredRow(record.key),
                      onMouseLeave: () => isOwnProfile && setHoveredRow(null),
                    })}
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
                    dataSource={completedShows.map((show) => ({ ...show, key: show.id }))}
                    columns={columns('completed', hoveredRow)}
                    pagination={false}
                    onRow={(record) => ({
                      onMouseEnter: () => isOwnProfile && setHoveredRow(record.key),
                      onMouseLeave: () => isOwnProfile && setHoveredRow(null),
                    })}
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
                    dataSource={plannedShows.map((show) => ({ ...show, key: show.id }))}
                    columns={columns('planned', hoveredRow)}
                    pagination={false}
                    onRow={(record) => ({
                      onMouseEnter: () => isOwnProfile && setHoveredRow(record.key),
                      onMouseLeave: () => isOwnProfile && setHoveredRow(null),
                    })}
                  />
                </HoverLift>
              </FadeIn>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </PageTransition>
    );
  };

  export default TVlist;
