import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";
import { Typography, AutoComplete } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import axios from "axios";

const Navbar = () => {
  const [showSearch, setShowSearch] = useState(false); // State to control search bar visibility
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const navigate = useNavigate(); // React Router's navigation hook

  // Toggle search visibility
  const toggleSearch = () => {
    setShowSearch((prevState) => !prevState);
  };

  const handleSearchChange = async (value) => {
    setSearchQuery(value);
  
    if (value.trim().length > 0) {
      try {
        const [movieResponse, tvResponse] = await Promise.all([
          axios.get(`https://api.themoviedb.org/3/search/movie`, {
            params: {
              api_key: "5b1e46f8671d3e0273ac66be030ba0de",
              query: value,
            },
          }),
          axios.get(`https://api.themoviedb.org/3/search/tv`, {
            params: {
              api_key: "5b1e46f8671d3e0273ac66be030ba0de",
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
  
        const options = combinedResults.map((item) => ({
          value: `${item.type}-${item.id}`,
          label: (
            <div style={{ display: "flex", alignItems: "center" }}>
              {item.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                  alt={item.title}
                  style={{
                    marginRight: 10,
                    height: "40px",
                    width: "30px",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "30px",
                    height: "40px",
                    marginRight: 10,
                    backgroundColor: "#ddd",
                  }}
                />
              )}
              <div>
                <strong>{item.title}</strong>
                <div style={{ fontSize: "12px", color: "#888" }}>
                  {item.date && `(${item.date.split("-")[0]})`}
                </div>
              </div>
            </div>
          ),
        }));
  
        setSearchResults(options);
      } catch (error) {
        console.error("Error fetching search results:", error);
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
    }
  };
  
  
  

  const handleSelect = (value) => {
    const [type, id] = value.split("-"); // Split the prefix and ID
    if (type === "movie") {
      navigate(`/movie/${id}`); // Navigate to the movie detail page
    } else if (type === "tv") {
      navigate(`/tv/${id}`); // Navigate to the TV show detail page
    }
  };
  

  return (
    <div className="navbar">
      <div className="navbar-logo">
        <Typography.Title level={2} className="logo">
          <Link to="/">MovieTracker</Link>
        </Typography.Title>
      </div>

      <ul className="navbar-links">
        <li>
          <Link to="/">Browse</Link>
        </li>
        <li>
          <Link to="/watchlist">Watchlist</Link>
        </li>
        <li>
          <Link to="/profile">Profile</Link>
        </li>
        <li>
          <Link to="/login">Login</Link>
        </li>
        <li>
          <SearchOutlined
            onClick={toggleSearch}
            style={{ fontSize: "20px", cursor: "pointer" }}
          />
        </li>
      </ul>

      {showSearch && (
        <div className="search-bar">
          <AutoComplete
  style={{ width: 300, margin: "10px auto", display: "block" }}
  options={searchResults} // Dropdown options
  onSearch={handleSearchChange} // Called on input change
  onSelect={handleSelect} // Called when an option is selected
  placeholder="Search for movies and TV shows..."
/>

        </div>
      )}
    </div>
  );
};

export default Navbar;
