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

const MovieDetail = () => {
  const { movieId } = useParams();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [option, setOption] = useState('Click to Select an Option');

  // Function to fetch the movie's current status in Firebase
  const fetchMovieStatus = async (movieId) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const watchlistRef = doc(db, 'watchlists', user.uid);
      const watchlistSnapshot = await getDoc(watchlistRef);

      if (watchlistSnapshot.exists()) {
        const watchlistData = watchlistSnapshot.data();

        // Check each list to see where the movie exists
        for (const [listName, listMovies] of Object.entries(watchlistData)) {
          const movieExists = listMovies.some((item) => item.id === parseInt(movieId));
          if (movieExists) {
            setOption(listName.charAt(0).toUpperCase() + listName.slice(1)); // Capitalize the list name
            return;
          }
        }
      }
      setOption('Click to Select an Option'); // Default if the movie isn't in any list
    } catch (error) {
      console.error('Error fetching movie status:', error);
    }
  };

  // Function to add movie to the watchlist
  const addToWatchlist = async (movie, targetList) => {
    const user = auth.currentUser;
    if (!user) {
      message.error('You must be logged in to add movies to your watchlist.');
      return;
    }

    const { id, title, poster_path, release_date, vote_average, overview } = movie;

    try {
      const watchlistRef = doc(db, 'watchlists', user.uid);
      const watchlistSnapshot = await getDoc(watchlistRef);

      if (watchlistSnapshot.exists()) {
        const watchlistData = watchlistSnapshot.data();

        // Check for the movie in all lists
        for (const [listName, listMovies] of Object.entries(watchlistData)) {
          const movieIndex = listMovies.findIndex((item) => item.id === id);

          if (movieIndex !== -1) {
            // Movie found in another list, remove it
            const updatedList = listMovies.filter((item) => item.id !== id);
            await setDoc(
              watchlistRef,
              { [listName]: updatedList },
              { merge: true }
            );

            break;
          }
        }
      }

      // Add the movie to the target list
      await setDoc(
        watchlistRef,
        {
          [targetList]: arrayUnion({
            id,
            title,
            poster_path,
            release_date,
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

      // Add the movie to the corresponding watchlist
      addToWatchlist(movie, selectedItem.label.toLowerCase()); // Use the label as the list name
    }
  };

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        const response = await axios.get(
          `https://api.themoviedb.org/3/movie/${movieId}?api_key=5b1e46f8671d3e0273ac66be030ba0de`
        );
        setMovie(response.data);

        // Fetch the movie's status in the watchlist
        fetchMovieStatus(movieId);
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovie();
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

  return (
    <div style={{ maxWidth: '900px', margin: '20px auto', padding: '20px' }}>
      <Card>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={10} md={8} lg={6}>
            <Row style={{ marginBottom: '20px' }}>
              {movie.poster_path && (
                <Image
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  alt={movie.title}
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
              <Title level={2}>{movie.title}</Title>
              <Text type="secondary">Release Date: {movie.release_date}</Text>
              <br />
              <Text strong>Rating: {movie.vote_average} / 10</Text>

              <div style={{ marginTop: '20px' }}>
                <Title level={3}>Overview</Title>
                <Text>{movie.overview}</Text>
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default MovieDetail;
