import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";
import { Typography, AutoComplete } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import axios from "axios";
import { auth, db } from '../firebase';

const Navbar = () => {
  const [showSearch, setShowSearch] = useState(false); // State to control search bar visibility
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [currentUser, setCurrentUser] = useState(null); // Track the current user
  const navigate = useNavigate(); // React Router's navigation hook
  
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user); // Set the user in state
    });
    return () => unsubscribe(); // Cleanup the listener on component unmount
  }, []);

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
              api_key: process.env.REACT_APP_TMDB_API_KEY,
              query: value,
            },
          }),
          axios.get(`https://api.themoviedb.org/3/search/tv`, {
            params: {
              api_key: process.env.REACT_APP_TMDB_API_KEY,
              query: value,
            },
          }),
        ]);

        const movies = movieResponse?.data?.results || [];
        const tvShows = tvResponse?.data?.results || [];

        const formattedResults = [...movies, ...tvShows].map((item) => ({
          id: item.id,
          type: item.title ? "movie" : "tv",
          title: item.title || item.name,
          date: item.release_date || item.first_air_date,
          poster_path: item.poster_path,
        })).sort((a, b) => b.popularity - a.popularity);

        setSearchResults(formattedResults.map((item) => ({
          value: `${item.type}-${item.id}`,
          label: (
            <div style={{ display: "flex", alignItems: "center" }}>
              {item.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                  alt={item.title}
                  style={{ marginRight: 10, height: "40px", width: "30px", objectFit: "cover" }}
                />
              ) : (
                <div style={{ width: "30px", height: "40px", marginRight: 10, backgroundColor: "#ddd" }} />
              )}
              <div>
                <strong>{item.title}</strong>
                <div style={{ fontSize: "12px", color: "#888" }}>
                  {item.date && `(${item.date.split("-")[0]})`}
                </div>
              </div>
            </div>
          ),
        })));
      } catch (error) {
        console.error("Error fetching search results:", error);
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleSelect = (value) => {
    const [type, id] = value.split("-");
    navigate(`/${type}/${id}`);
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
          <Link to="/profile#home-section">Profile</Link>
        </li>
        <li>
          <Link to="/profile#movielist-section">Movie List</Link>
        </li>
        <li>
          <Link to="/profile#tvlist-section">TV List</Link>
        </li>
        <li>
          <Link to="/">Browse</Link>
        </li>
        {!currentUser && ( // Conditionally render "Login" link
          <li>
            <Link to="/login">Login</Link>
          </li>
        )}
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
            options={searchResults}
            onSearch={handleSearchChange}
            onSelect={handleSelect}
            placeholder="Search for movies and TV shows..."
          />
        </div>
      )}
    </div>
  );
};

export default Navbar;
