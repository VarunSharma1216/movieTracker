import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase'; // Import Firebase functions
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { Button, message, Spin, Table, Divider, Input } from 'antd';
import { Link } from "react-router-dom";

const Watchlist = () => {
  const [watchingMovies, setWatchingMovies] = useState([]);
  const [completedMovies, setCompletedMovies] = useState([]);
  const [plannedMovies, setPlannedMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingMovie, setEditingMovie] = useState(null); // Tracks the movie being edited

  const fetchWatchlist = async () => {
    const user = auth.currentUser;
    if (!user) {
      message.error('You must be logged in to view your watchlist.');
      return;
    }

    setLoading(true);
    try {
      const userWatchlistRef = doc(db, 'watchlists', user.uid);
      const userWatchlistDoc = await getDoc(userWatchlistRef);

      if (userWatchlistDoc.exists()) {
        const { watching = [], completed = [], planned = [] } = userWatchlistDoc.data();
        setWatchingMovies(watching);
        setCompletedMovies(completed);
        setPlannedMovies(planned);
      } else {
        setWatchingMovies([]);
        setCompletedMovies([]);
        setPlannedMovies([]);
        message.info('Your watchlist is empty.');
      }
    } catch (error) {
      message.error(`Error fetching watchlist: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const updateRating = async (movieId, newRating, listName) => {
    const user = auth.currentUser;
    if (!user) {
      message.error('You must be logged in to update the rating.');
      return;
    }

    try {
      const userWatchlistRef = doc(db, 'watchlists', user.uid);
      const updatedList = {
        watching: watchingMovies,
        completed: completedMovies,
        planned: plannedMovies,
      };

      // Update the rating for the specific movie in the relevant list
      updatedList[listName] = updatedList[listName].map((movie) =>
        movie.id === movieId ? { ...movie, rating: newRating } : movie
      );

      // Save the updated list to Firebase
      await updateDoc(userWatchlistRef, {
        [listName]: updatedList[listName],
      });

      // Update the state locally
      if (listName === 'watching') setWatchingMovies(updatedList[listName]);
      if (listName === 'completed') setCompletedMovies(updatedList[listName]);
      if (listName === 'planned') setPlannedMovies(updatedList[listName]);

      setEditingMovie(null); // Exit editing mode
      message.success('Rating updated!');
    } catch (error) {
      message.error(`Error updating rating: ${error.message}`);
    }
  };

  const columns = (listName) => [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      align: 'center',
      render: (text, record) => (
        <Link to={`/movie/${record.id}`} style={{ textDecoration: 'none', color: '#1890ff' }}>
          {text}
        </Link>
      ), // Renders the title as a clickable link
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      align: 'center',
      render: (rating, record) =>
        editingMovie === record.id ? (
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
            onClick={() => setEditingMovie(record.id)}
          >
            {rating ? `${rating}/10` : 'N/A'}
          </span>
        ),
    },
  ];

  return (
    <div style={{ maxWidth: 800, margin: 'auto', padding: 20 }}>
      <h2 style={{ textAlign: 'center' }}>Your Watchlist</h2>

      {loading ? (
        <Spin size="large" tip="Loading watchlist..." style={{ display: 'block', marginTop: 20 }} />
      ) : (
        <>
          <Divider>Watching</Divider>
          <Table
            dataSource={watchingMovies.map((movie) => ({...movie, key: movie.id }))}
            columns={columns('watching')}
            pagination={false}
          />

          <Divider>Completed</Divider>
          <Table
            dataSource={completedMovies.map((movie) => ({ ...movie, key: movie.id }))}
            columns={columns('completed')}
            pagination={false}
          />

          <Divider>Planned</Divider>
          <Table
            dataSource={plannedMovies.map((movie) => ({ ...movie, key: movie.id }))}
            columns={columns('planned')}
            pagination={false}
          />
        </>
      )}
    </div>
  );
};

export default Watchlist;
