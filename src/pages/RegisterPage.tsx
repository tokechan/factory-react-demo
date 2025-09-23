import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import type { RegisterFormData } from '../types';

const RegisterPage: React.FC = () => {
  const { register, isAuthenticated, isLoading } = useAuth();
  const { showError, showSuccess } = useNotifications();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Partial<RegisterFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const validateForm = (): boolean => {
    const newErrors: Partial<RegisterFormData> = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'メールアドレスを入力してください';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'パスワードを入力してください';
    } else if (formData.password.length < 8) {
      newErrors.password = 'パスワードは8文字以上で入力してください';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'パスワードは英大文字・英小文字・数字を含む必要があります';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'パスワード確認を入力してください';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'パスワードが一致しません';
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
      await register({
        email: formData.email,
        password: formData.password,
      });
      
      showSuccess(
        'アカウントを作成しました',
        'ようこそ！Photo Archiveをお楽しみください。'
      );
      
      // Navigation will be handled by useEffect after successful registration
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // APIエラーの詳細を解析
      let errorMessage = '登録中にエラーが発生しました';
      
      if (error.message) {
        if (error.message.includes('already exists')) {
          errorMessage = 'このメールアドレスは既に使用されています';
        } else if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
          errorMessage = '接続エラーが発生しました。ページを再読み込みして再度お試しください。';
        } else if (error.message.includes('password')) {
          errorMessage = 'パスワードの形式が正しくありません。8文字以上で英数字を含めてください。';
        } else if (error.message.includes('email')) {
          errorMessage = 'メールアドレスの形式が正しくありません。';
        } else {
          errorMessage = error.message;
        }
      }
      
      showError(
        '登録に失敗しました',
        errorMessage
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof RegisterFormData) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const getPasswordStrength = (password: string): { strength: number; text: string; color: string } => {
    if (!password) return { strength: 0, text: '', color: '' };
    
    let score = 0;
    if (password.length >= 8) score += 25;
    if (/[a-z]/.test(password)) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/\d/.test(password)) score += 25;
    
    if (score <= 25) return { strength: score, text: '弱い', color: 'bg-red-500' };
    if (score <= 50) return { strength: score, text: '普通', color: 'bg-yellow-500' };
    if (score <= 75) return { strength: score, text: '良い', color: 'bg-blue-500' };
    return { strength: score, text: '強い', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

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
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📸 Photo Archive
          </h1>
          <h2 className="text-xl text-gray-600">
            新規アカウント作成
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            既にアカウントをお持ちですか？{' '}
            <Link 
              to="/login" 
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              ログイン
            </Link>
          </p>
        </div>

        {/* Registration Form */}
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
                placeholder="8文字以上（英大文字・小文字・数字含む）"
                value={formData.password}
                onChange={handleInputChange('password')}
                error={errors.password}
                disabled={isSubmitting}
                required
              />
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${passwordStrength.strength}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600">
                      {passwordStrength.text}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード確認
              </label>
              <Input
                type="password"
                placeholder="上記と同じパスワードを入力"
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                error={errors.confirmPassword}
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Terms and Privacy */}
            <div className="text-sm text-gray-600">
              <p>
                アカウントを作成することで、
                <span className="text-blue-600 hover:text-blue-500 cursor-pointer"> 利用規約</span> と{' '}
                <span className="text-blue-600 hover:text-blue-500 cursor-pointer">プライバシーポリシー</span> に同意したものとみなされます。
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'アカウント作成中...' : 'アカウント作成'}
            </Button>
          </form>
        </Card>

        {/* Features Info */}
        <Card className="bg-blue-50 border-blue-200">
          <div className="text-center">
            <h3 className="text-sm font-medium text-blue-900 mb-2">
              Photo Archive の特徴
            </h3>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>📸 写真の自動サムネイル生成</li>
              <li>🗃️ 30日後の自動アーカイブ（コスト削減）</li>
              <li>📊 使用量・コスト監視ダッシュボード</li>
              <li>🔍 日付・メタデータ検索機能</li>
              <li>📱 モバイル対応・高速表示</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
