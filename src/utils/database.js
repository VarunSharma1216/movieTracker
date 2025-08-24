// Database utility functions for Supabase
import { supabase } from '../supabase';

// User operations
export const getUserByUsername = async (username) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username.toLowerCase())
    .single();
  
  return { data, error };
};

// Movie watchlist operations
export const getMovieWatchlist = async (userId) => {
  const { data, error } = await supabase
    .from('movie_watchlists')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });
    
  if (error) return { data: null, error };
  
  // Group by list type
  const watchlist = {
    watching: [],
    planned: [],
    completed: []
  };
  
  data.forEach(item => {
    if (watchlist[item.list_type]) {
      watchlist[item.list_type].push({
        id: item.movie_id,
        title: item.movie_title,
        poster_path: item.movie_poster,
        release_date: item.movie_release_date,
        added_at: item.added_at
      });
    }
  });
  
  return { data: watchlist, error: null };
};

export const addToMovieWatchlist = async (userId, movie, listType) => {
  const { data, error } = await supabase
    .from('movie_watchlists')
    .insert({
      user_id: userId,
      movie_id: movie.id,
      movie_title: movie.title,
      movie_poster: movie.poster_path,
      movie_release_date: movie.release_date,
      list_type: listType
    });
    
  return { data, error };
};

export const removeFromMovieWatchlist = async (userId, movieId) => {
  const { data, error } = await supabase
    .from('movie_watchlists')
    .delete()
    .eq('user_id', userId)
    .eq('movie_id', movieId);
    
  return { data, error };
};

export const moveMovieInWatchlist = async (userId, movieId, newListType) => {
  const { data, error } = await supabase
    .from('movie_watchlists')
    .update({ list_type: newListType })
    .eq('user_id', userId)
    .eq('movie_id', movieId);
    
  return { data, error };
};

// TV watchlist operations
export const getTVWatchlist = async (userId) => {
  const { data, error } = await supabase
    .from('tv_watchlists')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });
    
  if (error) return { data: null, error };
  
  // Group by list type
  const watchlist = {
    watching: [],
    planned: [],
    completed: []
  };
  
  data.forEach(item => {
    if (watchlist[item.list_type]) {
      watchlist[item.list_type].push({
        id: item.show_id,
        name: item.show_title,
        poster_path: item.show_poster,
        first_air_date: item.show_first_air_date,
        added_at: item.added_at
      });
    }
  });
  
  return { data: watchlist, error: null };
};

export const addToTVWatchlist = async (userId, show, listType) => {
  const { data, error } = await supabase
    .from('tv_watchlists')
    .insert({
      user_id: userId,
      show_id: show.id,
      show_title: show.name,
      show_poster: show.poster_path,
      show_first_air_date: show.first_air_date,
      list_type: listType
    });
    
  return { data, error };
};

export const removeFromTVWatchlist = async (userId, showId) => {
  const { data, error } = await supabase
    .from('tv_watchlists')
    .delete()
    .eq('user_id', userId)
    .eq('show_id', showId);
    
  return { data, error };
};

export const moveTVInWatchlist = async (userId, showId, newListType) => {
  const { data, error } = await supabase
    .from('tv_watchlists')
    .update({ list_type: newListType })
    .eq('user_id', userId)
    .eq('show_id', showId);
    
  return { data, error };
};

// Activity operations
export const addActivity = async (userId, activity) => {
  const { data, error } = await supabase
    .from('activities')
    .insert({
      user_id: userId,
      content_type: activity.content_type,
      content_id: activity.content_id,
      content_title: activity.content_title,
      content_poster: activity.content_poster,
      action: activity.action,
      list_type: activity.list_type
    });
    
  return { data, error };
};

export const getActivities = async (userId, limit = 10) => {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
    
  return { data, error };
};