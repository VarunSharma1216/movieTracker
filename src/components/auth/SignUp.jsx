import React, { useState } from 'react';
import { auth } from "../../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Form, Input, Button, Typography, message } from 'antd';

const { Title } = Typography;
const db = getFirestore();

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm();

  // Function to check if username already exists
  const checkUsernameExists = async (username) => {
    if (!username) {
      console.log('No username provided');
      return false;
    }
  
    try {
      console.log('Creating reference to users collection');
      const usersRef = collection(db, "users");
  
      console.log('Building query with username:', username.toLowerCase());
      const q = query(usersRef, where("username", "==", username.toLowerCase()));
  
      console.log('Executing query');
      const querySnapshot = await getDocs(q);
  
      console.log('Query executed. Number of documents found:', querySnapshot.size);
      return querySnapshot.size > 0;
    } catch (error) {
      console.error('Error checking username:', error);
      return false;
    }
  };
  

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      message.error("Passwords do not match!");
      return;
    }

    try {
      setIsSubmitting(true);

      // Check username availability one last time before creating account
      const usernameExists = await checkUsernameExists(username);
      if (usernameExists) {
        message.error("Username already taken. Please choose another one.");
        return;
      }

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Store user data in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        username: username.toLowerCase()
      });

      message.success('Account created successfully!');
      form.resetFields();
    } catch (error) {
      message.error(`Error signing up: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUsernameChange = (e) => {
    const newUsername = e.target.value;
    setUsername(newUsername);
    
    // Clear the error for the username field when user starts typing
    if (form.getFieldError('username').length > 0) {
      form.setFields([
        {
          name: 'username',
          errors: [],
        },
      ]);
    }
  };

  const validateUsername = async (_, value) => {
    if (!value) {
      return Promise.reject(new Error('Please enter your username!'));
    }

    if (value.length < 3) {
      return Promise.reject(new Error('Username must be at least 3 characters long'));
    }

    if (value.length > 20) {
      return Promise.reject(new Error('Username cannot exceed 20 characters'));
    }

    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      return Promise.reject(new Error('Username can only contain letters, numbers and underscores'));
    }

    const exists = await checkUsernameExists(value);
    if (exists) {
      return Promise.reject(new Error('Username already taken'));
    }

    return Promise.resolve();
  };

  return (
    <div className="sign-up-container">
      <Form
        form={form}
        name="sign_up"
        onFinish={handleSignUp}
        layout="vertical"
        style={{
          maxWidth: 400,
          margin: '0 auto',
          padding: 24,
          backgroundColor: '#fff',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Title level={2} style={{ textAlign: 'center' }}>Create an Account</Title>

        <Form.Item
          label="Username"
          name="username"
          validateTrigger="onBlur"
          rules={[
            {
              validator: validateUsername,
            }
          ]}
        >
          <Input
            value={username}
            onChange={handleUsernameChange}
            placeholder="Enter your username"
          />
        </Form.Item>

        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: 'Please enter your email!' },
            { type: 'email', message: 'Please enter a valid email!' }
          ]}
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
          rules={[
            { required: true, message: 'Please enter your password!' },
            { min: 6, message: 'Password must be at least 6 characters long' }
          ]}
        >
          <Input.Password
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
        </Form.Item>

        <Form.Item
          label="Re-enter Password"
          name="confirmPassword"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Please re-enter your password!' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("Passwords do not match!"));
              },
            }),
          ]}
        >
          <Input.Password
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={isSubmitting}>
            Sign Up
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default SignUp;