import React, { useState } from 'react';
import { auth } from "../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Link } from 'react-router-dom';
import { Form, Input, Button, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const[loggedIn, setLoggedIn] = useState(false);
  const navigate = useNavigate();

  const handleSignIn = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      message.success('Successfully signed in!');
      setLoggedIn(true);
      console.log('Signed in:', userCredential);
      navigate('/');
    } catch (error) {
      message.error(`Error signing in: ${error.message}`);
    }
  };

  return (
    <div className="sign-in-container">
      <Form
        name="sign_in"
        onFinish={handleSignIn}
        layout="vertical"
        style={{
          maxWidth: 400,
          margin: '0 auto',
          padding: 24,
          backgroundColor: '#fff',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Title level={2} style={{ textAlign: 'center' }}>Login</Title>
        
        <Form.Item
          label="Email"
          name="email"
          rules={[{ required: true, message: 'Please enter your email!' }]}
        >
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
          />
        </Form.Item>
        
        <Form.Item
          label="Password"
          name="password"
          rules={[{ required: true, message: 'Please enter your password!' }]}
        >
          <Input.Password
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
        </Form.Item>
        
        <Form.Item>
          <Button type="primary" htmlType="submit" block>
            Log In
          </Button>
        </Form.Item>
        
        <Text style={{ display: 'block', textAlign: 'center' }}>
          Don’t have an account? <Link to="/signup">Create one</Link>
        </Text>
        
        <Text style={{ display: 'block', textAlign: 'center', marginTop: '1em' }}>
          <Link to="/authdetails">Check Status</Link>
        </Text>
      </Form>
    </div>
  );
};

export default SignIn;
