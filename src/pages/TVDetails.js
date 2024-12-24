import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { message, Button, Dropdown, Card, Typography, Image, Spin, Alert, Row, Col } from 'antd';
import { auth, db } from '../firebase'; // Ensure correct Firebase setup
import { doc, getDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

const { Title, Text } = Typography;

const items = [
  { label: 'Watching', key: 'watching' },
  { label: 'Planned', key: 'planned' },
  { label: 'Completed', key: 'completed' },
];

const TVDetail = () => {
  const { tvId } = useParams();
  const [tvShow, setTVShow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [option, setOption] = useState('Click to Select an Option');

  // Fetch the current TV show's status from the tvwatchlist
  const fetchTVStatus = async (tvId) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const watchlistRef = doc(db, 'tvwatchlist', user.uid);
      const watchlistSnapshot = await getDoc(watchlistRef);

      if (watchlistSnapshot.exists()) {
        const watchlistData = watchlistSnapshot.data();
        for (const [listName, listShows] of Object.entries(watchlistData)) {
          if (listShows.some((item) => item.id === parseInt(tvId))) {
            setOption(listName.charAt(0).toUpperCase() + listName.slice(1)); // Capitalize
            return;
          }
        }
      }

      setOption('Click to Select an Option'); // Default
    } catch (error) {
      console.error('Error fetching TV status:', error);
    }
  };

  // Add TV show to the tvwatchlist
  const addToWatchlist = async (tvShow, targetList) => {
    const user = auth.currentUser;
    if (!user) {
      message.error('You must be logged in to add shows to your watchlist.');
      return;
    }
  
    const { id, name, poster_path, first_air_date, vote_average, overview } = tvShow;
  
    try {
      const watchlistRef = doc(db, 'tvwatchlist', user.uid);
      const watchlistSnapshot = await getDoc(watchlistRef);
  
      // Fetch total seasons and episodes
      const totalSeasons = tvShow.number_of_seasons;
      const totalEpisodes = tvShow.number_of_episodes;
  
      // Remove the TV show from other lists
      if (watchlistSnapshot.exists()) {
        const watchlistData = watchlistSnapshot.data();
        for (const [listName, listShows] of Object.entries(watchlistData)) {
          if (listShows.some((item) => item.id === id)) {
            await setDoc(
              watchlistRef,
              { [listName]: arrayRemove(listShows.find((item) => item.id === id)) },
              { merge: true }
            );
          }
        }
      }
  
      // Add to the target list with additional fields
      await setDoc(
        watchlistRef,
        {
          [targetList]: arrayUnion({
            id,
            name,
            poster_path,
            first_air_date,
            vote_average,
            overview,
            currEpisode: 1, // Default starting episode
            currSeason: 1,   // Default starting season
            totalSeasons,   // Total seasons of the show
            totalEpisodes,  // Total episodes of the show
          }),
        },
        { merge: true }
      );
  
      message.success(`Added to ${targetList} list.`,0.7);
    } catch (error) {
      message.error(`Error updating watchlist: ${error.message}`);
    }
  };
  
  

  // Handle Dropdown selection
  const onClick = ({ key }) => {
    const selectedItem = items.find((item) => item.key === key);
    if (selectedItem) {
      setOption(selectedItem.label); // Update button text
      addToWatchlist(tvShow, key); // Add to Firebase
    }
  };

  useEffect(() => {
    const fetchTVShow = async () => {
      try {
        const apiKey = process.env.REACT_APP_TMDB_API_KEY;
        const response = await axios.get(
          `https://api.themoviedb.org/3/tv/${tvId}?api_key=${apiKey}`
        );
        setTVShow(response.data);
        fetchTVStatus(tvId); // Fetch the status
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchTVShow();
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
              <Text type="secondary">First Air Date: {tvShow.first_air_date}</Text>
              <br />
              <Text strong>Rating: {tvShow.vote_average} / 10</Text>

              <div style={{ marginTop: '20px' }}>
                <Title level={3}>Overview</Title>
                <Text>{tvShow.overview}</Text>
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default TVDetail;
