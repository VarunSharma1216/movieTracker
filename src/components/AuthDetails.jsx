import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';

const AuthDetails = () => {
  const [authUser, setAuthUser] = useState(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user || null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuthUser(session?.user || null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const userSignOut = async () => {
    try {
      await supabase.auth.signOut();
      console.log('sign out successful');
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <div>
      {authUser ? <><p>{`Signed In as ${authUser.email}`}</p><button onClick={userSignOut}>Sign Out</button></> : <p>Signed Out</p>}
    </div>
  );
};

export default AuthDetails;
