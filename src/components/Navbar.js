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
        const response = await axios.get(
          `https://api.themoviedb.org/3/search/movie`,
          {
            params: {
              api_key: "5b1e46f8671d3e0273ac66be030ba0de",
              query: value,
            },
          }
        );

        if (response?.data?.results) {
          const options = response.data.results.map((movie) => ({
            value: movie.id, // Use the movie ID for navigation
            label: (
              <div>
                <strong>{movie.title}</strong>
                {movie.release_date && (
                  <span style={{ float: "right", color: "#888" }}>
                    ({movie.release_date.split("-")[0]})
                  </span>
                )}
              </div>
            ),
          }));

          setSearchResults(options);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error("Error fetching search results:", error);
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleSelect = (value) => {
    navigate(`/movie/${value}`); // Navigate to the movie detail page using the movie ID
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
          <Link to="/">Home</Link>
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
            placeholder="Search for movies..."
          />
        </div>
      )}
    </div>
  );
};

export default Navbar;
