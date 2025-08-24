import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  message, 
  Divider, 
  Space, 
  Typography,
  Switch,
  Tabs,
  Modal,
  Select,
  Alert,
  Popconfirm
} from 'antd';
import { 
  LockOutlined, 
  LogoutOutlined, 
  UserOutlined, 
  DeleteOutlined,
  BellOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const Settings = () => {
  const [form] = Form.useForm();
  const [emailForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [userPreferences, setUserPreferences] = useState({
    emailNotifications: true,
    activityPrivacy: 'public',
    theme: 'light',
    language: 'en',
    defaultList: 'all'
  });
  const [deleteAccountModal, setDeleteAccountModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserPreferences();
  }, []);

  const fetchUserPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('preferences')
        .eq('id', user.id)
        .single();

      if (data && data.preferences) {
        setUserPreferences({
          ...userPreferences,
          ...data.preferences,
          currentEmail: user.email
        });
      } else {
        setUserPreferences({
          ...userPreferences,
          currentEmail: user.email
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const handlePasswordChange = async (values) => {
    setLoading(true);

    try {
      if (values.newPassword !== values.confirmPassword) {
        throw new Error("New passwords don't match");
      }

      // First verify current password by signing in
      const { data: { user } } = await supabase.auth.getUser();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: values.currentPassword
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: values.newPassword
      });

      if (error) {
        throw error;
      }

      message.success('Password updated successfully');
      form.resetFields();
    } catch (error) {
      let errorMessage = 'Failed to update password';
      
      if (error.message.includes('Password should be at least')) {
        errorMessage = 'New password is too weak';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = async (values) => {
    setLoading(true);

    try {
      // Verify current password by signing in
      const { data: { user } } = await supabase.auth.getUser();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: values.password
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      // Update email
      const { error } = await supabase.auth.updateUser({
        email: values.newEmail
      });

      if (error) {
        throw error;
      }
      
      message.success('Email updated successfully. Please check your new email for verification.');
      emailForm.resetFields();
    } catch (error) {
      message.error('Failed to update email: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesChange = async (key, value) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updatedPreferences = {
        ...userPreferences,
        [key]: value
      };

      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          preferences: updatedPreferences
        });

      if (error) {
        throw error;
      }

      setUserPreferences(updatedPreferences);
      message.success('Preferences updated');
    } catch (error) {
      message.error('Failed to update preferences');
    }
  };

  const handleDeleteAccount = async (password) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }
      
      // Delete user data from Supabase
      await supabase.from('users').delete().eq('id', user.id);
      await supabase.from('tvwatchlist').delete().eq('user_id', user.id);
      await supabase.from('moviewatchlist').delete().eq('user_id', user.id);
      
      // Delete user account
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      
      if (error) {
        throw error;
      }
      
      message.success('Account deleted successfully');
      navigate('/login');
    } catch (error) {
      message.error('Failed to delete account: ' + error.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      message.success('Signed out successfully');
      navigate('/login');
    } catch (error) {
      message.error('Failed to sign out');
    }
  };

  return (
    <div style={{
      padding: 24,
      background: '#f0f2f5',
      minHeight: '100vh'
    }}>
      <Card style={{ maxWidth: 800, margin: '0 auto' }}>
        <Title level={2}>Settings</Title>
        
        <Tabs defaultActiveKey="account">
          <TabPane tab="Account Settings" key="account">
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <Title level={4}>Email Address</Title>
                <Form
                  form={emailForm}
                  layout="vertical"
                  onFinish={handleEmailChange}
                >
                  <Text type="secondary">
                    Current email: {userPreferences.currentEmail || 'Loading...'}
                  </Text>
                  <Form.Item
                    name="newEmail"
                    label="New Email"
                    rules={[
                      { required: true, message: 'Please input your new email!' },
                      { type: 'email', message: 'Please enter a valid email!' }
                    ]}
                  >
                    <Input prefix={<UserOutlined />} />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    label="Current Password"
                    rules={[
                      { required: true, message: 'Please input your password!' }
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined />} />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading}>
                      Update Email
                    </Button>
                  </Form.Item>
                </Form>
              </div>

              <Divider />

              <div>
                <Title level={4}>Change Password</Title>
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handlePasswordChange}
                >
                  <Form.Item
                    name="currentPassword"
                    label="Current Password"
                    rules={[
                      { required: true, message: 'Please input your current password!' },
                      { min: 6, message: 'Password must be at least 6 characters' }
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined />} />
                  </Form.Item>

                  <Form.Item
                    name="newPassword"
                    label="New Password"
                    rules={[
                      { required: true, message: 'Please input your new password!' },
                      { min: 6, message: 'Password must be at least 6 characters' }
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined />} />
                  </Form.Item>

                  <Form.Item
                    name="confirmPassword"
                    label="Confirm New Password"
                    dependencies={['newPassword']}
                    rules={[
                      { required: true, message: 'Please confirm your new password!' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('newPassword') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('Passwords do not match!'));
                        },
                      }),
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined />} />
                  </Form.Item>

                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading}>
                      Update Password
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            </Space>
          </TabPane>

          <TabPane tab="Preferences" key="preferences">
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <Title level={4}>Notifications</Title>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text>Email Notifications</Text>
                    <Switch
                      checked={userPreferences.emailNotifications}
                      onChange={(checked) => handlePreferencesChange('emailNotifications', checked)}
                    />
                  </div>
                </Space>
              </div>

              <Divider />

              <div>
                <Title level={4}>Privacy</Title>
                <Form.Item label="Activity Privacy">
                  <Select
                    value={userPreferences.activityPrivacy}
                    onChange={(value) => handlePreferencesChange('activityPrivacy', value)}
                    style={{ width: 200 }}
                  >
                    <Select.Option value="public">Public</Select.Option>
                    <Select.Option value="friends">Friends Only</Select.Option>
                    <Select.Option value="private">Private</Select.Option>
                  </Select>
                </Form.Item>
              </div>

              <Divider />

              <div>
                <Title level={4}>Display</Title>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Form.Item label="Theme">
                    <Select
                      value={userPreferences.theme}
                      onChange={(value) => handlePreferencesChange('theme', value)}
                      style={{ width: 200 }}
                    >
                      <Select.Option value="light">Light</Select.Option>
                      <Select.Option value="dark">Dark</Select.Option>
                    </Select>
                  </Form.Item>

                  <Form.Item label="Language">
                    <Select
                      value={userPreferences.language}
                      onChange={(value) => handlePreferencesChange('language', value)}
                      style={{ width: 200 }}
                    >
                      <Select.Option value="en">English</Select.Option>
                      <Select.Option value="es">Spanish</Select.Option>
                      <Select.Option value="fr">French</Select.Option>
                    </Select>
                  </Form.Item>

                  <Form.Item label="Default List View">
                    <Select
                      value={userPreferences.defaultList}
                      onChange={(value) => handlePreferencesChange('defaultList', value)}
                      style={{ width: 200 }}
                    >
                      <Select.Option value="all">All</Select.Option>
                      <Select.Option value="watching">Watching</Select.Option>
                      <Select.Option value="completed">Completed</Select.Option>
                      <Select.Option value="planned">Plan to Watch</Select.Option>
                    </Select>
                  </Form.Item>
                </Space>
              </div>
            </Space>
          </TabPane>

          <TabPane tab="Security" key="security">
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Alert
                message="Account Security"
                description="Protect your account by regularly updating your password and reviewing your account activity."
                type="info"
                showIcon
              />

              <div>
                <Title level={4}>Account Management</Title>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    danger 
                    icon={<DeleteOutlined />}
                    onClick={() => setDeleteAccountModal(true)}
                  >
                    Delete Account
                  </Button>

                  <Button 
                    type="primary" 
                    danger 
                    icon={<LogoutOutlined />}
                    onClick={handleSignOut}
                  >
                    Sign Out
                  </Button>
                </Space>
              </div>
            </Space>
          </TabPane>
        </Tabs>

        <Modal
          title="Delete Account"
          open={deleteAccountModal}
          onCancel={() => setDeleteAccountModal(false)}
          footer={null}
        >
          <Alert
            message="Warning"
            description="This action cannot be undone. All your data will be permanently deleted."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Form
            onFinish={handleDeleteAccount}
            layout="vertical"
          >
            <Form.Item
              name="password"
              label="Enter your password to confirm"
              rules={[{ required: true, message: 'Please enter your password!' }]}
            >
              <Input.Password />
            </Form.Item>
            <Form.Item>
              <Button type="primary" danger htmlType="submit">
                Confirm Delete
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    </div>
  );
};

export default Settings;