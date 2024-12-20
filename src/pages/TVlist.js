import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase'; // Import Firebase functions
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Button, message, Spin, Table, Divider, Input } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axios from 'axios';


const TVlist = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [watchingShows, setWatchingShows] = useState([]);
  const [completedShows, setCompletedShows] = useState([]);
  const [plannedShows, setPlannedShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seasonsData, setSeasonsData] = useState({});
  const [currSeason, setCurrSeason] = useState(1);
  const [episodesData, setEpisodesData] = useState({});

  const [editingShow, setEditingShow] = useState(null); // Tracks the show being edited

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false); // Stop loading once the auth state is determined
    });

    return () => unsubscribe(); // Cleanup listener
  }, []);

  const fetchWatchlist = async () => {
    if (!currentUser) {
      message.error('You must be logged in to view your watchlist.');
      return;
    }
  
    setLoading(true);
    try {
      const userWatchlistRef = doc(db, 'tvwatchlist', currentUser.uid);
      const userWatchlistDoc = await getDoc(userWatchlistRef);
  
      if (userWatchlistDoc.exists()) {
        const { watching = [], completed = [], planned = [] } = userWatchlistDoc.data();
        setWatchingShows(watching);
        setCompletedShows(completed);
        setPlannedShows(planned);
  
        // Cache total episodes and seasons for each show in Firebase
        const updatedWatching = await Promise.all(
          watching.map(async (show) => {
            if (!show.totalEpisodes || !show.totalSeasons) {
              const totalEpisodes = await fetchEpisodesCount(show.id);
              const totalSeasons = await fetchSeasonsCount(show.id);
  
              return { ...show, totalEpisodes, totalSeasons };
            }
            return show;
          })
        );
  
        // Update Firebase with cached data
        await updateDoc(userWatchlistRef, { watching: updatedWatching });
        setWatchingShows(updatedWatching);
      } else {
        setWatchingShows([]);
        setCompletedShows([]);
        setPlannedShows([]);
        message.info('Your watchlist is empty.');
      }
    } catch (error) {
      message.error(`Error fetching watchlist: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeasonsCount = async (showId) => {
    try {
      const apiKey = process.env.REACT_APP_TMDB_API_KEY;
      const response = await axios.get(
        `https://api.themoviedb.org/3/tv/${showId}?api_key=${apiKey}`
      );
      return response.data.number_of_seasons;
    } catch (error) {
      console.error('Error fetching total seasons:', error);
      return 1; // Default value if API fails
    }
  };
  
  
  
  const fetchEpisodesCount = async (showId) => {
    try {
      const apiKey = process.env.REACT_APP_TMDB_API_KEY;
      const response = await axios.get(
        `https://api.themoviedb.org/3/tv/${showId}?api_key=${apiKey}`
      );
      return response.data.number_of_episodes;
    } catch (error) {
      console.error('Error fetching total episodes:', error);
      return 1; // Default value if API fails
    }
  };
  
  
  

  useEffect(() => {
    if (currentUser) {
      fetchWatchlist();
    }
  }, [currentUser]);

  const updateRating = async (showId, newRating, listName) => {
    if (!currentUser) {
      message.error('You must be logged in to update the rating.');
      return;
    }

    try {
      const userWatchlistRef = doc(db, 'tvwatchlist', currentUser.uid);
      const updatedList = {
        watching: watchingShows,
        completed: completedShows,
        planned: plannedShows,
      };

      // Update the rating for the specific show in the relevant list
      updatedList[listName] = updatedList[listName].map((show) =>
        show.id === showId ? { ...show, rating: newRating } : show
      );

      // Save the updated list to Firebase
      await updateDoc(userWatchlistRef, {
        [listName]: updatedList[listName],
      });

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

  const fetchEpisodes = async (showId) => {
    try {
      const apiKey = process.env.REACT_APP_TMDB_API_KEY;
      const response = await axios.get(
        `https://api.themoviedb.org/3/tv/${showId}/season/${currSeason}?api_key=${apiKey}`
      );
  
      const numberOfEpisodes = response.data.episodes?.length ?? 1;
  
      setEpisodesData((prev) => ({
        ...prev,
        [showId]: {
          ...prev[showId],
          currEpisode: prev[showId]?.currEpisode || 1,
          totalEpisodes: numberOfEpisodes,
        },
      }));
    } catch (error) {
      console.error('Error fetching number of episodes:', error);
      setEpisodesData((prev) => ({
        ...prev,
        [showId]: {
          currEpisode: prev[showId]?.currEpisode || 1,
          totalEpisodes: prev[showId]?.totalEpisodes || 'Error',
        },
      }));
    }
  };
  

  const incrementEpisode = async (showId) => {
    if (!currentUser) {
      message.error('You must be logged in to update episodes.');
      return;
    }
  
    const currEpisode = episodesData[showId]?.currEpisode || 1;
    const totalEpisodes = episodesData[showId]?.totalEpisodes || 1;
  
    if (currEpisode >= totalEpisodes) {
      message.info('You have reached the last episode.');
      return;
    }
  
    const newEpisode = currEpisode + 1;
  
    setEpisodesData((prev) => ({
      ...prev,
      [showId]: {
        ...prev[showId],
        currEpisode: newEpisode,
      },
    }));
  
    try {
      const userWatchlistRef = doc(db, 'tvwatchlist', currentUser.uid);
      const updatedWatching = watchingShows.map((show) =>
        show.id === showId
          ? { ...show, currEpisode: newEpisode, currSeason: currSeason }
          : show
      );
  
      await updateDoc(userWatchlistRef, { watching: updatedWatching });
  
      setWatchingShows(updatedWatching);
      message.success('Episode updated!', 0.7);
    } catch (error) {
      message.error(`Error updating episode: ${error.message}`);
    }
  };
  
  
  
  
  

  const columns = (listName) => [
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
      key: 'action',
      align: 'center',
      width: 4,
      render: (_, record) => {
        const showId = record.id;

        // Check if data already fetched for this show
        if (!seasonsData[showId]) {
          fetchSeasons(showId); // Trigger the API request if data not already fetched
        }
        const seasonsWatched = 1;




        return (
          <span>{seasonsData[showId] ? `${seasonsWatched}/${seasonsData[showId]}` : 'Loading...'}</span>
        );
      },
    },
    {
  title: 'Episode',
  key: 'action',
  align: 'center',
  render: (_, record) => {
    const showId = record.id;

    if (!episodesData[showId]?.totalEpisodes) {
      fetchEpisodes(showId);
    }

    const currEpisode = episodesData[showId]?.currEpisode || 1;
    const totalEpisodes = episodesData[showId]?.totalEpisodes || 'Loading...';

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span>{`${currEpisode}/${totalEpisodes}`}</span>
        <PlusOutlined
          style={{ marginLeft: 10, cursor: 'pointer', fontSize: '12px' }}
          onClick={() => incrementEpisode(showId)}
        />
      </div>
    );
  },
},

    
    
    
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      width: 100,
      align: 'center',
      render: (rating, record) =>
        editingShow === record.id ? (
          <Input
            style={{ width: 80 }}
            defaultValue={rating}
            onBlur={(e) => updateRating(record.id, e.target.value, listName)}
            onPressEnter={(e) => updateRating(record.id, e.target.value, listName)}
            autoFocus
          />
        ) : (
          <span
            style={{ cursor: 'pointer', color: 'black' }}
            onClick={() => setEditingShow(record.id)}
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
        <MinusCircleOutlined
          style={{  cursor: 'pointer', color: 'red' }}
          onClick={() => handleRemoveMovie(record.id, listName)}
        />
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" tip="Loading watchlist..." />
      </div>
    );
  }

  if (!currentUser) {
    return <div>You must be logged in to view your watchlist.</div>;
  }

  return (
    <div style={{ maxWidth: 800, margin: 'auto', padding: 20 }}>
      <Divider>Watching</Divider>
      <Table
        dataSource={watchingShows.map((show) => ({ ...show, key: show.id }))}
        columns={columns('watching')}
        pagination={false}
      />

      <Divider>Completed</Divider>
      <Table
        dataSource={completedShows.map((show) => ({ ...show, key: show.id }))}
        columns={columns('completed')}
        pagination={false}
      />

      <Divider>Planned</Divider>
      <Table
        dataSource={plannedShows.map((show) => ({ ...show, key: show.id }))}
        columns={columns('planned')}
        pagination={false}
      />
    </div>
  );
};

export default TVlist;
