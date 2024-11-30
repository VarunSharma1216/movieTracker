// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
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

const App = () => {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Browse />} />
        <Route path="/movielist" element={<Movielist />} />
        <Route path="/tvlist" element={<TVlist />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/login" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/authdetails" element={<AuthDetails />} />
        
        
        <Route path="/movie/:movieId" element={<MovieDetail />} /> {/* New route for movie detail page */}
        <Route path="/tv/:tvId" element={<TVDetail />} /> {/* New route for movie detail page */}
      </Routes>
    </Router>
  );
};

export default App;
