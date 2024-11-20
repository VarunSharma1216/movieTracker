// src/pages/Home.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Home.css';

const Home = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const response = await axios.get(
          'https://api.themoviedb.org/3/movie/popular?api_key=5b1e46f8671d3e0273ac66be030ba0de'
        );
        setMovies(response.data.results);
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error fetching movies: {error.message}</div>;
  }

  const handleMovieClick = (movieId) => {
    navigate(`/movie/${movieId}`);
  };

  return (
    <div className="home-container">
      <h1>Popular Movies</h1>
      <div className="movies-grid">
        {movies.map((movie) => (
          <div
            className="movie-card"
            key={movie.id}
            onClick={() => handleMovieClick(movie.id)}
            style={{ cursor: 'pointer' }}
          >
            
            {movie.poster_path && (
              <img
                src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                alt={movie.title}
                className="movie-poster"
              />
            )}
            <h2>{movie.title}</h2>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;
