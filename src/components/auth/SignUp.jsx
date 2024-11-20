import React, { useState } from 'react';
import { auth } from "../../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { Form, Input, Button, Typography, message } from 'antd';

const { Title } = Typography;

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      message.error("Passwords do not match!");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      message.success('Account created successfully!');
      console.log('User created:', userCredential);
    } catch (error) {
      message.error(`Error signing up: ${error.message}`);
    }
  };

  return (
    <div className="sign-up-container">
      <Form
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
          <Button type="primary" htmlType="submit" block>
            Sign Up
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default SignUp;
