import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  doc,
  getDoc 
} from 'firebase/firestore';
import { Spin, Card } from 'antd';
import { Link } from 'react-router-dom';

const Home = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    watching: 0,
    completed: 0,
    planned: 0,
    hoursWatched: 0
  });
  const [activityHistory, setActivityHistory] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      if (user) {
        fetchUserData(user.uid);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchUserData = async (userId) => {
    try {
      // Fetch watchlist stats
      const watchlistRef = doc(db, 'watchlists', userId);
      const watchlistDoc = await getDoc(watchlistRef);
      
      if (watchlistDoc.exists()) {
        const data = watchlistDoc.data();
        setStats({
          total: (data.watching?.length || 0) + (data.completed?.length || 0) + (data.planned?.length || 0),
          watching: data.watching?.length || 0,
          completed: data.completed?.length || 0,
          planned: data.planned?.length || 0,
          hoursWatched: calculateWatchTime(data.completed || [])
        });
      }

      // Fetch recent activities
      const activitiesRef = collection(db, 'activities');
      const q = query(
        activitiesRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      
      const querySnapshot = await getDocs(q);
      const activities = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));
      
      setRecentActivities(activities);

      // Create activity history data (last 365 days)
      const activityCounts = new Array(365).fill(0);
      activities.forEach(activity => {
        if (activity.timestamp) {
          const daysAgo = Math.floor((Date.now() - activity.timestamp) / (1000 * 60 * 60 * 24));
          if (daysAgo < 365) {
            activityCounts[daysAgo]++;
          }
        }
      });
      setActivityHistory(activityCounts);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const calculateWatchTime = (completedItems) => {
    return completedItems.reduce((total, item) => total + (item.runtime || 120), 0) / 60;
  };

  const formatTimeAgo = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return <Spin size="large" />;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Activity History Calendar */}
      <Card title="Activity History" className="mb-6">
        <div className="grid grid-cols-52 gap-1">
          {activityHistory.map((count, idx) => (
            <div
              key={idx}
              className={`w-3 h-3 rounded ${
                count === 0 ? 'bg-gray-100' :
                count === 1 ? 'bg-blue-200' :
                count === 2 ? 'bg-blue-300' :
                'bg-blue-400'
              }`}
              title={`${count} activities`}
            />
          ))}
        </div>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-gray-500">Total Entries</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold">{stats.watching}</div>
          <div className="text-gray-500">Watching</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold">{stats.completed}</div>
          <div className="text-gray-500">Completed</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold">{Math.round(stats.hoursWatched)}</div>
          <div className="text-gray-500">Hours Watched</div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card title="Recent Activity">
        {recentActivities.map(activity => (
          <div key={activity.id} className="flex items-center p-3 border-b">
            {activity.poster_path && (
              <img
                src={`https://image.tmdb.org/t/p/w92${activity.poster_path}`}
                alt={activity.title}
                className="w-12 h-16 object-cover rounded mr-4"
              />
            )}
            <div className="flex-1">
              <div className="flex justify-between">
                <Link 
                  to={`/${activity.type}/${activity.mediaId}`}
                  className="font-medium hover:text-blue-500"
                >
                  {activity.title}
                </Link>
                <span className="text-gray-500 text-sm">
                  {formatTimeAgo(activity.timestamp)}
                </span>
              </div>
              <div className="text-gray-600">{activity.action}</div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
};

export default Home;