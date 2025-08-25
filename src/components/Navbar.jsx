import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";
import { Typography, AutoComplete } from "antd";
import { SearchOutlined, MenuOutlined, CloseOutlined } from "@ant-design/icons";
import axios from "axios";
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { HoverLift, DropdownMenu, FadeIn } from './animations/AnimatedComponents';

const Navbar = () => {
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [username, setUsername] = useState("");
  const navigate = useNavigate();
  
  // Add loading state
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      try {
        console.log('[Navbar] Starting auth check...');
        
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[Navbar] Auth session:', session ? 'found' : 'not found');
        
        setCurrentUser(session?.user || null);
        
        if (session?.user) {
          try {
            const { data, error } = await supabase
              .from('users')
              .select('username')
              .eq('id', session.user.id)
              .single();
              
            if (error) {
              console.error("[Navbar] Error fetching username:", error);
              setUsername("");
            } else {
              console.log("[Navbar] Fetched username:", data?.username);
              setUsername(data?.username || '');
            }
          } catch (error) {
            console.error("[Navbar] Error fetching username:", error);
            setUsername("");
          }
        } else {
          setUsername("");
        }
        setLoading(false);
      } catch (error) {
        console.error('[Navbar] Auth check failed:', error);
        setCurrentUser(null);
        setUsername("");
        setLoading(false);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setCurrentUser(session?.user || null);
        
        if (session?.user) {
          try {
            const { data, error } = await supabase
              .from('users')
              .select('username')
              .eq('id', session.user.id)
              .single();
              
            if (error) {
              console.error("Error fetching username:", error);
            } else {
              console.log("Fetched username:", data?.username);
              setUsername(data?.username || '');
            }
          } catch (error) {
            console.error("Error fetching username:", error);
          }
        } else {
          setUsername("");
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const toggleSearch = () => {
    setShowSearch((prevState) => !prevState);
  };

  const toggleMobileMenu = () => {
    setShowMobileMenu((prevState) => !prevState);
  };

  const closeMobileMenu = () => {
    setShowMobileMenu(false);
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


  // Show basic navbar while loading to prevent Chrome rendering issues
  if (loading) {
    return (
      <motion.div 
        className="navbar navbar-loading"
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }}
      >
        <div className="navbar-logo">
          <Typography.Title level={2} className="logo">
            <Link to="/">MovieTracker</Link>
          </Typography.Title>
        </div>
        
        <ul className="navbar-links navbar-links-desktop">
          <li>
            <Link to="/login">Login</Link>
          </li>
          <li>
            <Link to="/">Browse</Link>
          </li>
          <li>
            <SearchOutlined
              onClick={toggleSearch}
              style={{ fontSize: "20px", cursor: "pointer" }}
            />
          </li>
        </ul>
        
        <div className="navbar-mobile-search">
          <SearchOutlined
            onClick={toggleSearch}
            style={{ fontSize: "20px", cursor: "pointer" }}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div 
        className="navbar"
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.4, 0.0, 0.2, 1] }}
      >
        {/* Mobile Menu Toggle - Left side */}
        <div className="navbar-mobile-toggle">
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {showMobileMenu ? (
              <CloseOutlined
                onClick={toggleMobileMenu}
                style={{ fontSize: "20px", cursor: "pointer" }}
              />
            ) : (
              <MenuOutlined
                onClick={toggleMobileMenu}
                style={{ fontSize: "20px", cursor: "pointer" }}
              />
            )}
          </motion.div>
        </div>

        <div className="navbar-logo">
          <HoverLift scale={1.02} shadow={false}>
            <Typography.Title level={2} className="logo">
              <Link to="/">MovieTracker</Link>
            </Typography.Title>
          </HoverLift>
        </div>

        {/* Desktop Navigation */}
        <ul className="navbar-links navbar-links-desktop">
          {currentUser ? (
            <>
              <li>
                <motion.div
                  whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link to={username ? `/${username}/profile` : '/login'}>Profile</Link>
                </motion.div>
              </li>
              <li>
                <motion.div
                  whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link to={username ? `/${username}/profile#movie-list` : '/login'}>Movie List</Link>
                </motion.div>
              </li>
              <li>
                <motion.div
                  whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link to={username ? `/${username}/profile#tv-list` : '/login'}>TV List</Link>
                </motion.div>
              </li>
            </>
          ) : (
            <li>
              <motion.div
                whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.95 }}
              >
                <Link to="/login">Login</Link>
              </motion.div>
            </li>
          )}
          <li>
            <motion.div
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.95 }}
            >
              <Link to="/">Browse</Link>
            </motion.div>
          </li>
          <li>
            <motion.div
              whileHover={{ 
                scale: 1.2, 
                rotate: 10,
                transition: { duration: 0.2 } 
              }}
              whileTap={{ scale: 0.9 }}
            >
              <SearchOutlined
                onClick={toggleSearch}
                style={{ fontSize: "20px", cursor: "pointer" }}
              />
            </motion.div>
          </li>
        </ul>

        {/* Mobile Search Icon - Right side */}
        <div className="navbar-mobile-search">
          <motion.div
            whileHover={{ 
              scale: 1.2, 
              rotate: 10,
              transition: { duration: 0.2 } 
            }}
            whileTap={{ scale: 0.9 }}
          >
            <SearchOutlined
              onClick={toggleSearch}
              style={{ fontSize: "20px", cursor: "pointer" }}
            />
          </motion.div>
        </div>
      </motion.div>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div 
            className="navbar-mobile-menu"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ul className="navbar-mobile-links">
              {currentUser ? (
                <>
                  <li>
                    <motion.div whileTap={{ scale: 0.95 }}>
                      <Link to={username ? `/${username}/profile` : '/login'} onClick={closeMobileMenu}>Profile</Link>
                    </motion.div>
                  </li>
                  <li>
                    <motion.div whileTap={{ scale: 0.95 }}>
                      <Link to={username ? `/${username}/profile#movie-list` : '/login'} onClick={closeMobileMenu}>Movie List</Link>
                    </motion.div>
                  </li>
                  <li>
                    <motion.div whileTap={{ scale: 0.95 }}>
                      <Link to={username ? `/${username}/profile#tv-list` : '/login'} onClick={closeMobileMenu}>TV List</Link>
                    </motion.div>
                  </li>
                </>
              ) : (
                <li>
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Link to="/login" onClick={closeMobileMenu}>Login</Link>
                  </motion.div>
                </li>
              )}
              <li>
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Link to="/" onClick={closeMobileMenu}>Browse</Link>
                </motion.div>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <DropdownMenu isOpen={showSearch}>
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
      </DropdownMenu>
    </>
  );
};

export default Navbar;