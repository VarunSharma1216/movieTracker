// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import Browse from './pages/Browse';
import Movielist from './pages/Movielist';
import Profile from './pages/Profile';
import MovieDetail from './pages/MovieDetail';
import SignIn from './components/auth/SignIn';
import SignUp from './components/auth/SignUp';
import AuthDetails from './components/AuthDetails';
import TVlist from './pages/TVlist';
import TVDetail from './pages/TVDetails';
import Home from './pages/Home';
import Friends from './pages/Friends';
import Settings from './pages/Settings';

// Component to handle animated routes
const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Browse />} />
        <Route path="/home" element={<Home />} />
        <Route path="/movielist" element={<Movielist />} />
        <Route path="/tvlist" element={<TVlist />} />
        <Route path="friends" element={<Friends />} />
        <Route path="settings" element={<Settings />} />
        <Route path="/:username/profile" element={<Profile />} />
        <Route path="/login" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/authdetails" element={<AuthDetails />} />
        <Route path="/movie/:movieId" element={<MovieDetail />} />
        <Route path="/tv/:tvId" element={<TVDetail />} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => {
  return (
    <Router>
      <Navbar />
      <AnimatedRoutes />
    </Router>
  );
};

export default App;
