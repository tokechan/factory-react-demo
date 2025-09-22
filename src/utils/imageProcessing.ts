// Image processing utilities for thumbnail generation and optimization
import * as EXIF from 'exif-js';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ProcessedImage {
  blob: Blob;
  dimensions: ImageDimensions;
  size: number;
  quality: number;
}

export interface ImageMetadata {
  dimensions: ImageDimensions;
  fileSize: number;
  mimeType: string;
  exifData?: any;
  colorProfile?: string;
  compression?: string;
}

// Supported image formats for processing
export const SUPPORTED_FORMATS = [
  'image/jpeg',
  'image/png', 
  'image/webp',
  'image/heic',
  'image/heif'
];

// Thumbnail and medium image configurations
export const IMAGE_CONFIGS = {
  thumbnail: {
    width: 200,
    height: 200,
    quality: 0.8,
    format: 'webp' as const,
  },
  medium: {
    width: 800,
    height: 600,
    quality: 0.9,
    format: 'webp' as const,
  },
  large: {
    width: 1920,
    height: 1080,
    quality: 0.95,
    format: 'webp' as const,
  }
};

/**
 * Load image from file and return HTML Image element
 */
export const loadImageFromFile = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
};

/**
 * Extract EXIF data from image file
 */
export const extractExifData = (file: File): Promise<any> => {
  return new Promise((resolve) => {
    EXIF.getData(file as any, function(this: any) {
      const exifData = EXIF.getAllTags(this);
      resolve(exifData);
    });
  });
};

/**
 * Get image metadata including dimensions and EXIF
 */
export const getImageMetadata = async (file: File): Promise<ImageMetadata> => {
  const [img, exifData] = await Promise.all([
    loadImageFromFile(file),
    extractExifData(file)
  ]);

  return {
    dimensions: {
      width: img.naturalWidth,
      height: img.naturalHeight,
    },
    fileSize: file.size,
    mimeType: file.type,
    exifData,
    colorProfile: 'sRGB', // Default assumption
    compression: file.type === 'image/jpeg' ? 'JPEG' : 'Lossless',
  };
};

/**
 * Resize image to specified dimensions while maintaining aspect ratio
 */
export const resizeImage = (
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  maintainAspectRatio: boolean = true
): { canvas: HTMLCanvasElement; dimensions: ImageDimensions } => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  let { width, height } = img;
  
  if (maintainAspectRatio) {
    // Calculate dimensions maintaining aspect ratio
    const aspectRatio = width / height;
    
    if (width > height) {
      // Landscape
      width = Math.min(targetWidth, width);
      height = width / aspectRatio;
      
      if (height > targetHeight) {
        height = targetHeight;
        width = height * aspectRatio;
      }
    } else {
      // Portrait or square
      height = Math.min(targetHeight, height);
      width = height * aspectRatio;
      
      if (width > targetWidth) {
        width = targetWidth;
        height = width / aspectRatio;
      }
    }
  } else {
    width = targetWidth;
    height = targetHeight;
  }

  canvas.width = width;
  canvas.height = height;

  // Use high-quality scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Draw resized image
  ctx.drawImage(img, 0, 0, width, height);
  
  return {
    canvas,
    dimensions: { width, height }
  };
};

/**
 * Convert canvas to blob with specified format and quality
 */
export const canvasToBlob = (
  canvas: HTMLCanvasElement,
  format: string = 'webp',
  quality: number = 0.9
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      `image/${format}`,
      quality
    );
  });
};

/**
 * Generate thumbnail from image file
 */
export const generateThumbnail = async (file: File): Promise<ProcessedImage> => {
  const img = await loadImageFromFile(file);
  const config = IMAGE_CONFIGS.thumbnail;
  
  const { canvas, dimensions } = resizeImage(
    img,
    config.width,
    config.height,
    true
  );
  
  const blob = await canvasToBlob(canvas, config.format, config.quality);
  
  return {
    blob,
    dimensions,
    size: blob.size,
    quality: config.quality,
  };
};

/**
 * Generate medium-sized image from file
 */
export const generateMediumImage = async (file: File): Promise<ProcessedImage> => {
  const img = await loadImageFromFile(file);
  const config = IMAGE_CONFIGS.medium;
  
  const { canvas, dimensions } = resizeImage(
    img,
    config.width,
    config.height,
    true
  );
  
  const blob = await canvasToBlob(canvas, config.format, config.quality);
  
  return {
    blob,
    dimensions,
    size: blob.size,
    quality: config.quality,
  };
};

/**
 * Process image for upload - generate all variants
 */
export const processImageForUpload = async (file: File) => {
  const metadata = await getImageMetadata(file);
  
  // Only generate variants if image is large enough
  const needsThumbnail = metadata.dimensions.width > 200 || metadata.dimensions.height > 200;
  const needsMedium = metadata.dimensions.width > 800 || metadata.dimensions.height > 600;
  
  const results = {
    original: {
      blob: file,
      dimensions: metadata.dimensions,
      size: file.size,
      quality: 1,
    },
    metadata,
    thumbnail: null as ProcessedImage | null,
    medium: null as ProcessedImage | null,
  };
  
  if (needsThumbnail) {
    results.thumbnail = await generateThumbnail(file);
  }
  
  if (needsMedium) {
    results.medium = await generateMediumImage(file);
  }
  
  return results;
};

/**
 * Validate image file before processing
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  // Check file type
  if (!SUPPORTED_FORMATS.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file format: ${file.type}. Supported formats: ${SUPPORTED_FORMATS.join(', ')}`
    };
  }
  
  // Check file size (500MB limit)
  const maxSize = 500 * 1024 * 1024; // 500MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum size: 500MB`
    };
  }
  
  // Check if file is actually an image
  if (!file.type.startsWith('image/')) {
    return {
      valid: false,
      error: 'File is not a valid image'
    };
  }
  
  return { valid: true };
};

/**
 * Get compression ratio achieved by processing
 */
export const getCompressionRatio = (originalSize: number, compressedSize: number): number => {
  return (1 - compressedSize / originalSize) * 100;
};

/**
 * Estimate processing time based on file size and dimensions
 */
export const estimateProcessingTime = (file: File, dimensions?: ImageDimensions): number => {
  const baseSizeMs = (file.size / (1024 * 1024)) * 100; // ~100ms per MB
  const pixelCount = dimensions ? dimensions.width * dimensions.height : 2073600; // Assume 1920x1080
  const complexityMs = (pixelCount / 1000000) * 200; // ~200ms per megapixel
  
  return Math.round(baseSizeMs + complexityMs);
};

/**
 * Create a data URL from processed image for preview
 */
export const createPreviewUrl = async (file: File): Promise<string> => {
  const img = await loadImageFromFile(file);
  const { canvas } = resizeImage(img, 400, 300, true);
  return canvas.toDataURL('image/webp', 0.8);
};

/**
 * Download processed image
 */
export const downloadProcessedImage = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
