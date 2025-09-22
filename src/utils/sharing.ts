// Sharing utilities for secure URL generation and access control
import * as CryptoJS from 'crypto-js';
import { nanoid } from 'nanoid';
import QRCode from 'qrcode';

export interface ShareOptions {
  password?: string;
  expiresAt?: Date;
  maxViews?: number;
  allowDownload?: boolean;
  allowZoom?: boolean;
  watermark?: boolean;
}

export interface ShareLink {
  id: string;
  photoId: string;
  shareToken: string;
  encryptedUrl: string;
  publicUrl: string;
  qrCodeUrl?: string;
  options: ShareOptions;
  createdAt: Date;
  createdBy: string;
  viewCount: number;
  isActive: boolean;
}

export interface ShareAccess {
  success: boolean;
  photoData?: any;
  error?: string;
  requiresPassword?: boolean;
  viewsRemaining?: number;
  expiresAt?: Date;
}

// Encryption key - in production, this should come from environment variables
const ENCRYPTION_KEY = process.env.REACT_APP_SHARE_ENCRYPTION_KEY || 'default-key-change-in-production';

/**
 * Generate a secure share token
 */
export const generateShareToken = (): string => {
  return nanoid(32); // 32-character URL-safe unique ID
};

/**
 * Generate a shorter share ID for URLs
 */
export const generateShareId = (): string => {
  return nanoid(12); // 12-character shorter ID for URLs
};

/**
 * Encrypt photo data for secure sharing
 */
export const encryptPhotoData = (photoData: any, password?: string): string => {
  const dataString = JSON.stringify(photoData);
  const key = password ? CryptoJS.SHA256(password).toString() : ENCRYPTION_KEY;
  return CryptoJS.AES.encrypt(dataString, key).toString();
};

/**
 * Decrypt photo data for access
 */
export const decryptPhotoData = (encryptedData: string, password?: string): any => {
  try {
    const key = password ? CryptoJS.SHA256(password).toString() : ENCRYPTION_KEY;
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedString);
  } catch (error) {
    throw new Error('Failed to decrypt photo data. Invalid password or corrupted data.');
  }
};

/**
 * Create a secure share link for a photo
 */
export const createShareLink = async (
  photoId: string,
  photoData: any,
  options: ShareOptions = {},
  createdBy: string
): Promise<ShareLink> => {
  const shareId = generateShareId();
  const shareToken = generateShareToken();
  
  // Encrypt photo data
  const encryptedUrl = encryptPhotoData(photoData, options.password);
  
  // Generate public URL
  const baseUrl = window.location.origin;
  const publicUrl = `${baseUrl}/share/${shareId}`;
  
  // Generate QR code
  let qrCodeUrl: string | undefined;
  try {
    qrCodeUrl = await QRCode.toDataURL(publicUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  } catch (error) {
    console.warn('Failed to generate QR code:', error);
  }
  
  const shareLink: ShareLink = {
    id: shareId,
    photoId,
    shareToken,
    encryptedUrl,
    publicUrl,
    qrCodeUrl,
    options: {
      expiresAt: options.expiresAt,
      maxViews: options.maxViews,
      allowDownload: options.allowDownload ?? true,
      allowZoom: options.allowZoom ?? true,
      watermark: options.watermark ?? false,
      password: options.password,
    },
    createdAt: new Date(),
    createdBy,
    viewCount: 0,
    isActive: true,
  };
  
  return shareLink;
};

/**
 * Validate share link access
 */
export const validateShareAccess = (
  shareLink: ShareLink,
  password?: string
): ShareAccess => {
  // Check if link is active
  if (!shareLink.isActive) {
    return {
      success: false,
      error: 'このリンクは無効化されています。',
    };
  }
  
  // Check expiration
  if (shareLink.options.expiresAt && new Date() > shareLink.options.expiresAt) {
    return {
      success: false,
      error: 'このリンクは期限切れです。',
    };
  }
  
  // Check view limit
  if (shareLink.options.maxViews && shareLink.viewCount >= shareLink.options.maxViews) {
    return {
      success: false,
      error: '閲覧回数の上限に達しました。',
    };
  }
  
  // Check password if required
  if (shareLink.options.password && !password) {
    return {
      success: false,
      requiresPassword: true,
      error: 'パスワードが必要です。',
    };
  }
  
  if (shareLink.options.password && password !== shareLink.options.password) {
    return {
      success: false,
      requiresPassword: true,
      error: 'パスワードが間違っています。',
    };
  }
  
  // Decrypt photo data
  try {
    const photoData = decryptPhotoData(shareLink.encryptedUrl, shareLink.options.password);
    
    return {
      success: true,
      photoData,
      viewsRemaining: shareLink.options.maxViews 
        ? shareLink.options.maxViews - shareLink.viewCount - 1 
        : undefined,
      expiresAt: shareLink.options.expiresAt,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'データの復号化に失敗しました。',
    };
  }
};

/**
 * Increment view count for a share link
 */
export const incrementViewCount = (shareLink: ShareLink): ShareLink => {
  return {
    ...shareLink,
    viewCount: shareLink.viewCount + 1,
  };
};

/**
 * Deactivate a share link
 */
export const deactivateShareLink = (shareLink: ShareLink): ShareLink => {
  return {
    ...shareLink,
    isActive: false,
  };
};

/**
 * Generate share link with default options
 */
export const generateQuickShare = async (
  photoId: string,
  photoData: any,
  createdBy: string
): Promise<ShareLink> => {
  const defaultOptions: ShareOptions = {
    allowDownload: true,
    allowZoom: true,
    watermark: false,
    // Expires in 7 days by default
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
  
  return createShareLink(photoId, photoData, defaultOptions, createdBy);
};

/**
 * Generate secure share link with password and limited views
 */
export const generateSecureShare = async (
  photoId: string,
  photoData: any,
  password: string,
  maxViews: number,
  expiresInHours: number,
  createdBy: string
): Promise<ShareLink> => {
  const secureOptions: ShareOptions = {
    password,
    maxViews,
    allowDownload: false,
    allowZoom: true,
    watermark: true,
    expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
  };
  
  return createShareLink(photoId, photoData, secureOptions, createdBy);
};

/**
 * Parse share URL to extract share ID
 */
export const parseShareUrl = (url: string): string | null => {
  const match = url.match(/\/share\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

/**
 * Format share link info for display
 */
export const formatShareInfo = (shareLink: ShareLink): string => {
  const parts: string[] = [];
  
  if (shareLink.options.password) {
    parts.push('🔒 パスワード保護');
  }
  
  if (shareLink.options.expiresAt) {
    const now = new Date();
    const expires = shareLink.options.expiresAt;
    const diffHours = Math.round((expires.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      parts.push('⏰ まもなく期限切れ');
    } else if (diffHours < 24) {
      parts.push(`⏰ ${diffHours}時間後に期限切れ`);
    } else {
      const diffDays = Math.round(diffHours / 24);
      parts.push(`⏰ ${diffDays}日後に期限切れ`);
    }
  }
  
  if (shareLink.options.maxViews) {
    const remaining = shareLink.options.maxViews - shareLink.viewCount;
    parts.push(`👁️ 残り${remaining}回閲覧可能`);
  }
  
  if (!shareLink.options.allowDownload) {
    parts.push('🚫 ダウンロード不可');
  }
  
  if (shareLink.options.watermark) {
    parts.push('🏷️ 透かし入り');
  }
  
  return parts.length > 0 ? parts.join(' • ') : '🔗 制限なし';
};

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Share via Web Share API if available
 */
export const shareViaWebShareAPI = async (
  title: string,
  text: string,
  url: string
): Promise<boolean> => {
  try {
    if (navigator.share) {
      await navigator.share({
        title,
        text,
        url,
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Web Share API failed:', error);
    return false;
  }
};

/**
 * Generate social media share URLs
 */
export const generateSocialShareUrls = (url: string, text: string) => {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  
  return {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    email: `mailto:?subject=${encodedText}&body=${encodedUrl}`,
    line: `https://social-plugins.line.me/lineit/share?url=${encodedUrl}`,
  };
};
