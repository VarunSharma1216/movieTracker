import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { message, Button, Dropdown, Card, Typography, Image, Spin, Alert, Row, Col } from 'antd';
import { auth, db } from '../firebase'; // Make sure to import auth and db from your Firebase setup
import { doc, getDoc, setDoc, arrayUnion } from 'firebase/firestore';

const { Title, Text } = Typography;
const items = [
  { label: 'Watching', key: 'item-1' },
  { label: 'Planned', key: 'item-2' },
  { label: 'Completed', key: 'item-3' },
];

const TVDetail = () => {
  const { tvId } = useParams();
  const [tvShow, setTVShow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [option, setOption] = useState('Click to Select an Option');

  // Function to fetch the TV show's current status in Firebase
  const fetchTVStatus = async (tvId) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const watchlistRef = doc(db, 'watchlists', user.uid);
      const watchlistSnapshot = await getDoc(watchlistRef);

      if (watchlistSnapshot.exists()) {
        const watchlistData = watchlistSnapshot.data();

        // Check each list to see where the TV show exists
        for (const [listName, listShows] of Object.entries(watchlistData)) {
          const showExists = listShows.some((item) => item.id === parseInt(tvId));
          if (showExists) {
            setOption(listName.charAt(0).toUpperCase() + listName.slice(1)); // Capitalize the list name
            return;
          }
        }
      }
      setOption('Click to Select an Option'); // Default if the TV show isn't in any list
    } catch (error) {
      console.error('Error fetching TV status:', error);
    }
  };

  // Function to add TV show to the watchlist
  const addToWatchlist = async (tvShow, targetList) => {
    const user = auth.currentUser;
    if (!user) {
      message.error('You must be logged in to add shows to your watchlist.');
      return;
    }

    const { id, name, poster_path, first_air_date, vote_average, overview } = tvShow;

    try {
      const watchlistRef = doc(db, 'watchlists', user.uid);
      const watchlistSnapshot = await getDoc(watchlistRef);

      if (watchlistSnapshot.exists()) {
        const watchlistData = watchlistSnapshot.data();

        // Check for the TV show in all lists
        for (const [listName, listShows] of Object.entries(watchlistData)) {
          const showIndex = listShows.findIndex((item) => item.id === id);

          if (showIndex !== -1) {
            // TV show found in another list, remove it
            const updatedList = listShows.filter((item) => item.id !== id);
            await setDoc(
              watchlistRef,
              { [listName]: updatedList },
              { merge: true }
            );

            break;
          }
        }
      }

      // Add the TV show to the target list
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
          }),
        },
        { merge: true }
      );
    } catch (error) {
      message.error(`Error updating watchlist: ${error.message}`);
    }
  };

  // onClick handler that updates the option state with the selected label and adds to the watchlist
  const onClick = ({ key }) => {
    const selectedItem = items.find((item) => item.key === key);
    if (selectedItem) {
      setOption(selectedItem.label); // Update the button text to the label
      message.info(`Added to ${selectedItem.label} list`, 0.7); // Show the selected label in the message

      // Add the TV show to the corresponding watchlist
      addToWatchlist(tvShow, selectedItem.label.toLowerCase()); // Use the label as the list name
    }
  };

  useEffect(() => {
    const fetchTVShow = async () => {
      try {
        const apiKey = process.env.REACT_APP_TMDB_API_KEY; // Access the API key from the environment variables
        const response = await axios.get(
          `https://api.themoviedb.org/3/tv/${tvId}?api_key=${apiKey}`
        );
        setTVShow(response.data);

        // Fetch the TV show's status in the watchlist
        fetchTVStatus(tvId);
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
