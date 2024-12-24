import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase'; // Import Firebase functions
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Button, message, Spin, Table, Divider, Input } from 'antd';
import { MinusCircleOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';


const Movielist = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [watchingMovies, setWatchingMovies] = useState([]);
  const [completedMovies, setCompletedMovies] = useState([]);
  const [plannedMovies, setPlannedMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingMovie, setEditingMovie] = useState(null); // Tracks the movie being edited

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
      const userWatchlistRef = doc(db, 'watchlists', currentUser.uid);
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
    if (currentUser) {
      fetchWatchlist();
    }
  }, [currentUser]);


  const handleRemoveMovie = async (movieId, listName) => {
    if (!currentUser) {
      message.error('You must be logged in to remove a movie.');
      return;
    }
  
    try {
      const userWatchlistRef = doc(db, 'watchlists', currentUser.uid);
      const updatedList = {
        watching: watchingMovies,
        completed: completedMovies,
        planned: plannedMovies,
      };
  
      // Filter out the movie to be removed
      updatedList[listName] = updatedList[listName].filter((movie) => movie.id !== movieId);
  
      // Save the updated list to Firebase
      await updateDoc(userWatchlistRef, {
        [listName]: updatedList[listName],
      });
  
      // Update the state locally
      if (listName === 'watching') setWatchingMovies(updatedList[listName]);
      if (listName === 'completed') setCompletedMovies(updatedList[listName]);
      if (listName === 'planned') setPlannedMovies(updatedList[listName]);
  
      message.success('Movie removed successfully!', 0.7);
    } catch (error) {
      message.error(`Error removing movie: ${error.message}`);
    }
  };
  

  const updateRating = async (movieId, newRating, listName) => {
    if (!currentUser) {
      message.error('You must be logged in to update the rating.');
      return;
    }

    try {
      const userWatchlistRef = doc(db, 'watchlists', currentUser.uid);
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
              src={`https://image.tmdb.org/t/p/w500${record.poster_path}`} // Assuming using TMDb image API
              alt={text}
              style={{
                width: 40, // Smaller width
                height: 40, // Smaller height
                marginRight: 10,
                objectFit: 'cover', // Ensures the image is cropped to fit the dimensions
                borderRadius: '4px', // Optional: adds rounded corners
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
      {/*<h2 style={{ textAlign: 'Left' }}>Your Watchlist</h2> */}
      <Divider>Watching</Divider>
      <Table
        dataSource={watchingMovies.map((movie) => ({ ...movie, key: movie.id }))}
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
    </div>
  );
};

export default Movielist;
