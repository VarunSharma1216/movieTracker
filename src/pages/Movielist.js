import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, getDocs, query, collection, where } from 'firebase/firestore';
import { message, Spin, Table, Divider, Input } from 'antd';
import { MinusCircleOutlined } from '@ant-design/icons';
import { Link, useParams } from 'react-router-dom';

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

  // Check authentication status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Fetch profile user ID from username
  useEffect(() => {
    const fetchProfileUserId = async () => {
      if (!username) return;

      try {
        const usersQuery = query(
          collection(db, "users"),
          where("username", "==", username)
        );
        const querySnapshot = await getDocs(usersQuery);

        if (querySnapshot.empty) {
          message.error('User not found');
          return;
        }

        const profileDoc = querySnapshot.docs[0];
        setProfileUserId(profileDoc.id);

        // Check if this is the current user's profile
        if (currentUser && currentUser.uid === profileDoc.id) {
          setIsOwnProfile(true);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        message.error('Error loading profile');
      }
    };

    fetchProfileUserId();
  }, [username, currentUser]);

  const fetchWatchlist = async () => {
    if (!profileUserId) return;

    setLoading(true);
    try {
      const watchlistRef = doc(db, 'watchlists', profileUserId);
      const watchlistSnapshot = await getDoc(watchlistRef);

      if (watchlistSnapshot.exists()) {
        const { watching = [], completed = [], planned = [] } = watchlistSnapshot.data();
        setWatchingMovies(watching);
        setCompletedMovies(completed);
        setPlannedMovies(planned);
      } else {
        setWatchingMovies([]);
        setCompletedMovies([]);
        setPlannedMovies([]);
        if (isOwnProfile) {
          message.info('Your watchlist is empty.');
        }
      }
    } catch (error) {
      console.error('Error fetching watchlist:', error);
      message.error(`Error fetching watchlist: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profileUserId) {
      fetchWatchlist();
    }
  }, [profileUserId]);

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
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" tip="Loading watchlist..." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: 'auto', padding: 20 }}>
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