import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Browse.css';
import { Input, Select, Button, Row, Col } from 'antd';

const { Option } = Select;

const Browse = () => {
  const [movies, setMovies] = useState([]);
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('popular'); // default category
  const [currentPage, setCurrentPage] = useState(1); // New state for pagination
  const navigate = useNavigate();

  // To keep track of movie IDs to avoid duplicates
  const movieIds = new Set();
  const apiKey = process.env.REACT_APP_TMDB_API_KEY; // Access API key from environment variable

  // Fetch movies based on selected category and current page
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const category = selectedCategory; // either "popular", "top_rated", or "trending"
        const response = await axios.get(
          `https://api.themoviedb.org/3/movie/${category}?api_key=${apiKey}&page=${currentPage}`
        );

        const newMovies = response.data.results.filter(movie => {
          if (!movieIds.has(movie.id)) {
            movieIds.add(movie.id);
            return true;
          }
          return false;
        });

        setMovies(prevMovies => [...prevMovies, ...newMovies]);
        setFilteredMovies(prevMovies => [...prevMovies, ...newMovies]);
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, [selectedCategory, currentPage]); // Re-fetch when category or page changes

  // Handle search query change to fetch all movies
  const handleSearchChange = async (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.trim().length > 0) {
      try {
        const [movieResponse, tvResponse] = await Promise.all([
          axios.get(`https://api.themoviedb.org/3/search/movie`, {
            params: {
              api_key: apiKey,
              query: value,
            },
          }),
          axios.get(`https://api.themoviedb.org/3/search/tv`, {
            params: {
              api_key: apiKey,
              query: value,
            },
          }),
        ]);

        const movies = movieResponse?.data?.results || [];
        const tvShows = tvResponse?.data?.results || [];

        const formattedMovies = movies.map((movie) => ({
          id: movie.id,
          type: "movie",
          title: movie.title,
          date: movie.release_date,
          popularity: movie.popularity,
          poster_path: movie.poster_path, // Add poster_path
        }));

        const formattedTvShows = tvShows.map((tv) => ({
          id: tv.id,
          type: "tv",
          title: tv.name,
          date: tv.first_air_date,
          popularity: tv.popularity,
          poster_path: tv.poster_path, // Add poster_path
        }));

        const combinedResults = [...formattedMovies, ...formattedTvShows].sort(
          (a, b) => b.popularity - a.popularity
        );

        // Filter out duplicates based on IDs
        const uniqueResults = combinedResults.filter((movie) => {
          if (!movieIds.has(movie.id)) {
            movieIds.add(movie.id);
            return true;
          }
          return false;
        });

        setFilteredMovies(uniqueResults);
      } catch (error) {
        console.error("Error fetching search results:", error);
        setFilteredMovies([]);
      }
    } else {
      setFilteredMovies(movies); // If search is empty, show all movies
    }
  };

  // Handle genre filter change
  const handleGenreChange = (value) => {
    setSelectedGenre(value);
    filterMovies(searchQuery, value, selectedYear);
  };

  // Handle year filter change
  const handleYearChange = (value) => {
    setSelectedYear(value);
    filterMovies(searchQuery, selectedGenre, value);
  };

  // Handle category filter change
  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    setCurrentPage(1); // Reset to first page when category changes
    setMovies([]); // Clear previous movies
    setFilteredMovies([]); // Clear filtered movies
    movieIds.clear(); // Reset the Set to prevent duplicate movie IDs
  };

  // Load more movies for the next page
  const loadMoreMovies = () => {
    setCurrentPage((prevPage) => prevPage + 1);
  };

  // Filter movies based on search query, genre, and year
  const filterMovies = (search, genre, year) => {
    let filtered = movies.filter((movie) =>
      movie.title.toLowerCase().includes(search.toLowerCase())
    );

    if (genre) {
      filtered = filtered.filter((movie) => movie.genre_ids.includes(Number(genre)));
    }

    if (year) {
      filtered = filtered.filter(
        (movie) => new Date(movie.release_date).getFullYear().toString() === year
      );
    }

    setFilteredMovies(filtered);
  };

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
      <h1>Browse Movies</h1>

      {/* Search and Filters */}
      <Row gutter={16} style={{ marginBottom: '20px' }}>
        <Col span={8}>
          <Input
            placeholder="Search movies"
            value={searchQuery}
            onChange={handleSearchChange}
            allowClear
          />
        </Col>
        <Col span={8}>
          <Select
            placeholder="Filter by Genre"
            value={selectedGenre}
            onChange={handleGenreChange}
            style={{ width: '100%' }}
          >
            <Option value="">All Genres</Option>
            <Option value="28">Action</Option>
            <Option value="35">Comedy</Option>
            <Option value="18">Drama</Option>
            <Option value="27">Horror</Option>
            <Option value="10751">Family</Option>
            <Option value="12">Adventure</Option>
            {/* Add more genres here */}
          </Select>
        </Col>
        <Col span={8}>
          <Select
            placeholder="Filter by Year"
            value={selectedYear}
            onChange={handleYearChange}
            style={{ width: '100%' }}
          >
            <Option value="">All Years</Option>
            <Option value="2023">2023</Option>
            <Option value="2022">2022</Option>
            <Option value="2021">2021</Option>
            <Option value="2020">2020</Option>
            {/* Add more years here */}
          </Select>
        </Col>
      </Row>

      {/* Category Dropdown */}
      <Row gutter={16} style={{ marginBottom: '20px' }}>
        <Col span={8}>
          <Select
            placeholder="Select Movie Category"
            value={selectedCategory}
            onChange={handleCategoryChange}
            style={{ width: '100%' }}
          >
            <Option value="popular">Popular</Option>
            <Option value="top_rated">Top Rated</Option>
            <Option value="upcoming">Upcoming</Option>
            <Option value="now_playing">Now Playing</Option>
          </Select>
        </Col>
      </Row>

      <div className="movies-grid">
        {filteredMovies.map((movie) => (
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

      {/* Load More Button */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <Button onClick={loadMoreMovies} type="primary">
          Load More
        </Button>
      </div>
    </div>
  );
};

export default Browse;
