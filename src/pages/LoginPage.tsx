import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import DevModeInfo from '../components/DevModeInfo';
import type { LoginFormData } from '../types';

const LoginPage: React.FC = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const { showError } = useNotifications();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    remember: false,
  });
  const [errors, setErrors] = useState<Partial<LoginFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginFormData> = {};

    if (!formData.email) {
      newErrors.email = 'メールアドレスを入力してください';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    }

    if (!formData.password) {
      newErrors.password = 'パスワードを入力してください';
    } else if (formData.password.length < 8) {
      newErrors.password = 'パスワードは8文字以上で入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await login({
        email: formData.email,
        password: formData.password,
      });
      
      // Navigation will be handled by useEffect after successful login
    } catch (error: any) {
      console.error('Login error:', error);
      
      // APIエラーの詳細を解析
      let errorMessage = 'メールアドレスまたはパスワードが正しくありません';
      
      if (error.message) {
        if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
          errorMessage = '接続エラーが発生しました。ページを再読み込みして再度お試しください。';
        } else if (error.message.includes('Invalid email') || error.message.includes('Invalid password')) {
          errorMessage = 'メールアドレスまたはパスワードの形式が正しくありません。';
        } else if (error.message.includes('User not found') || error.message.includes('Invalid credentials')) {
          errorMessage = 'メールアドレスまたはパスワードが正しくありません。';
        } else {
          errorMessage = error.message;
        }
      }
      
      showError(
        'ログインに失敗しました',
        errorMessage
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof LoginFormData) => (value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Show loading if still checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Development Mode Info */}
        <DevModeInfo />
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📸 Photo Archive
          </h1>
          <h2 className="text-xl text-gray-600">
            アカウントにログイン
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            まだアカウントをお持ちでないですか？{' '}
            <Link 
              to="/register" 
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              新規登録
            </Link>
          </p>
        </div>

        {/* Login Form */}
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <Input
                type="email"
                placeholder="example@example.com"
                value={formData.email}
                onChange={handleInputChange('email')}
                error={errors.email}
                disabled={isSubmitting}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <Input
                type="password"
                placeholder="8文字以上のパスワード"
                value={formData.password}
                onChange={handleInputChange('password')}
                error={errors.password}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                checked={formData.remember}
                onChange={(e) => handleInputChange('remember')(e.target.checked)}
                disabled={isSubmitting}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
                ログイン状態を保持する
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'ログイン中...' : 'ログイン'}
            </Button>
          </form>
        </Card>

        {/* Demo credentials */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            デモ用: demo@example.com / password123
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
