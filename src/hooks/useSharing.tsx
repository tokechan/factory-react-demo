import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useNotifications } from './useNotifications';
import {
  ShareLink,
  ShareOptions,
  ShareAccess,
  createShareLink,
  generateQuickShare,
  generateSecureShare,
  validateShareAccess,
  incrementViewCount,
  deactivateShareLink,
  copyToClipboard,
  shareViaWebShareAPI,
} from '../utils/sharing';

interface SharingContextType {
  shareLinks: ShareLink[];
  isLoading: boolean;
  createShare: (photoId: string, photoData: any, options?: ShareOptions) => Promise<ShareLink | null>;
  createQuickShare: (photoId: string, photoData: any) => Promise<ShareLink | null>;
  createSecureShare: (
    photoId: string, 
    photoData: any, 
    password: string, 
    maxViews: number, 
    expiresInHours: number
  ) => Promise<ShareLink | null>;
  accessShare: (shareId: string, password?: string) => Promise<ShareAccess>;
  deactivateShare: (shareId: string) => Promise<boolean>;
  copyShareLink: (shareLink: ShareLink) => Promise<boolean>;
  shareToSocial: (shareLink: ShareLink, title: string) => Promise<boolean>;
  getSharesByPhoto: (photoId: string) => ShareLink[];
  getActiveShares: () => ShareLink[];
  removeExpiredShares: () => void;
}

const SharingContext = createContext<SharingContextType | null>(null);

interface SharingProviderProps {
  children: ReactNode;
}

export const SharingProvider: React.FC<SharingProviderProps> = ({ children }) => {
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError, showWarning } = useNotifications();

  // Load share links from localStorage on init
  React.useEffect(() => {
    const savedShares = localStorage.getItem('shareLinks');
    if (savedShares) {
      try {
        const parsed = JSON.parse(savedShares);
        // Convert date strings back to Date objects
        const converted = parsed.map((link: any) => ({
          ...link,
          createdAt: new Date(link.createdAt),
          options: {
            ...link.options,
            expiresAt: link.options.expiresAt ? new Date(link.options.expiresAt) : undefined,
          },
        }));
        setShareLinks(converted);
      } catch (error) {
        console.error('Failed to load share links from localStorage:', error);
      }
    }
  }, []);

  // Save share links to localStorage whenever they change
  React.useEffect(() => {
    localStorage.setItem('shareLinks', JSON.stringify(shareLinks));
  }, [shareLinks]);

  const createShare = useCallback(async (
    photoId: string,
    photoData: any,
    options: ShareOptions = {}
  ): Promise<ShareLink | null> => {
    setIsLoading(true);
    try {
      // Mock current user - in real app, get from auth context
      const currentUser = 'demo@example.com';
      
      const shareLink = await createShareLink(photoId, photoData, options, currentUser);
      
      setShareLinks(prev => [...prev, shareLink]);
      showSuccess('共有リンクを作成しました');
      
      return shareLink;
    } catch (error: any) {
      showError('共有リンクの作成に失敗しました', error.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [showSuccess, showError]);

  const createQuickShare = useCallback(async (
    photoId: string,
    photoData: any
  ): Promise<ShareLink | null> => {
    setIsLoading(true);
    try {
      const currentUser = 'demo@example.com';
      const shareLink = await generateQuickShare(photoId, photoData, currentUser);
      
      setShareLinks(prev => [...prev, shareLink]);
      showSuccess('クイック共有リンクを作成しました');
      
      return shareLink;
    } catch (error: any) {
      showError('クイック共有の作成に失敗しました', error.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [showSuccess, showError]);

  const createSecureShare = useCallback(async (
    photoId: string,
    photoData: any,
    password: string,
    maxViews: number,
    expiresInHours: number
  ): Promise<ShareLink | null> => {
    setIsLoading(true);
    try {
      const currentUser = 'demo@example.com';
      const shareLink = await generateSecureShare(
        photoId, 
        photoData, 
        password, 
        maxViews, 
        expiresInHours, 
        currentUser
      );
      
      setShareLinks(prev => [...prev, shareLink]);
      showSuccess('セキュア共有リンクを作成しました');
      
      return shareLink;
    } catch (error: any) {
      showError('セキュア共有の作成に失敗しました', error.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [showSuccess, showError]);

  const accessShare = useCallback(async (
    shareId: string,
    password?: string
  ): Promise<ShareAccess> => {
    const shareLink = shareLinks.find(link => link.id === shareId);
    
    if (!shareLink) {
      return {
        success: false,
        error: '共有リンクが見つかりません。',
      };
    }

    const access = await validateShareAccess(shareLink, password);
    
    if (access.success) {
      // Increment view count
      const updatedLink = incrementViewCount(shareLink);
      setShareLinks(prev => 
        prev.map(link => link.id === shareId ? updatedLink : link)
      );
    }

    return access;
  }, [shareLinks]);

  const deactivateShare = useCallback(async (shareId: string): Promise<boolean> => {
    try {
      setShareLinks(prev => 
        prev.map(link => 
          link.id === shareId ? deactivateShareLink(link) : link
        )
      );
      
      showSuccess('共有リンクを無効化しました');
      return true;
    } catch (error: any) {
      showError('共有リンクの無効化に失敗しました', error.message);
      return false;
    }
  }, [showSuccess, showError]);

  const copyShareLink = useCallback(async (shareLink: ShareLink): Promise<boolean> => {
    const success = await copyToClipboard(shareLink.publicUrl);
    
    if (success) {
      showSuccess('リンクをコピーしました');
    } else {
      showError('リンクのコピーに失敗しました');
    }
    
    return success;
  }, [showSuccess, showError]);

  const shareToSocial = useCallback(async (
    shareLink: ShareLink,
    title: string
  ): Promise<boolean> => {
    const text = `${title} - 写真を共有`;
    const success = await shareViaWebShareAPI(title, text, shareLink.publicUrl);
    
    if (success) {
      showSuccess('共有しました');
    } else {
      showWarning('ブラウザの共有機能が利用できません。リンクをコピーしてください。');
    }
    
    return success;
  }, [showSuccess, showWarning]);

  const getSharesByPhoto = useCallback((photoId: string): ShareLink[] => {
    return shareLinks.filter(link => link.photoId === photoId && link.isActive);
  }, [shareLinks]);

  const getActiveShares = useCallback((): ShareLink[] => {
    const now = new Date();
    return shareLinks.filter(link => {
      if (!link.isActive) return false;
      if (link.options.expiresAt && now > link.options.expiresAt) return false;
      if (link.options.maxViews && link.viewCount >= link.options.maxViews) return false;
      return true;
    });
  }, [shareLinks]);

  const removeExpiredShares = useCallback(() => {
    const now = new Date();
    const validShares = shareLinks.filter(link => {
      // Keep if no expiration
      if (!link.options.expiresAt) return true;
      // Keep if not expired
      return now <= link.options.expiresAt;
    });

    if (validShares.length !== shareLinks.length) {
      setShareLinks(validShares);
      const removedCount = shareLinks.length - validShares.length;
      showSuccess(`${removedCount}個の期限切れ共有リンクを削除しました`);
    }
  }, [shareLinks, showSuccess]);

  // Auto-cleanup expired shares every hour
  React.useEffect(() => {
    const interval = setInterval(removeExpiredShares, 60 * 60 * 1000); // 1 hour
    return () => clearInterval(interval);
  }, [removeExpiredShares]);

  const contextValue: SharingContextType = {
    shareLinks,
    isLoading,
    createShare,
    createQuickShare,
    createSecureShare,
    accessShare,
    deactivateShare,
    copyShareLink,
    shareToSocial,
    getSharesByPhoto,
    getActiveShares,
    removeExpiredShares,
  };

  return (
    <SharingContext.Provider value={contextValue}>
      {children}
    </SharingContext.Provider>
  );
};

export const useSharing = (): SharingContextType => {
  const context = useContext(SharingContext);
  if (!context) {
    throw new Error('useSharing must be used within a SharingProvider');
  }
  return context;
};
