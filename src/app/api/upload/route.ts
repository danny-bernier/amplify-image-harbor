import { NextRequest, NextResponse } from 'next/server';
import { uploadProtectedOriginal } from '@/services/s3Service';
import { createImage, CreateImageInput } from '@/services/dbService';

// Helper function to get image dimensions
async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image for dimension calculation'));
    };
    img.src = URL.createObjectURL(file);
  });
}

// Helper function to process a single file
async function processSingleFile(file: File, metadata: any = {}) {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error(`File ${file.name}: Only image files are allowed`);
  }

  // Generate unique filename
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `${timestamp}_${sanitizedName}`;
  
  // Upload to S3 using service
  const s3Key = await uploadProtectedOriginal(file, fileName);

  // Get image dimensions
  const dimensions = await getImageDimensions(file);

  // Parse metadata
  const title = metadata.title || file.name.replace(/\.[^/.]+$/, '');
  const description = metadata.description || '';
  let tags: string[] = [];
  
  if (metadata.tags) {
    if (Array.isArray(metadata.tags)) {
      tags = metadata.tags;
    } else if (typeof metadata.tags === 'string') {
      try {
        tags = JSON.parse(metadata.tags);
      } catch {
        // If JSON parsing fails, treat as comma-separated string
        tags = metadata.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
      }
    }
  }

  // Save to database using service
  const imageData: CreateImageInput = {
    title,
    description,
    s3Key,
    tags: tags.length > 0 ? tags : undefined,
    width: dimensions.width,
    height: dimensions.height,
  };

  const dbResult = await createImage(imageData);

  return {
    success: true,
    fileName: file.name,
    s3Key,
    imageId: dbResult?.id,
    title,
    tags,
    dimensions
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const results = [];
    const errors = [];

    // Get all files from the form data
    const files: File[] = [];
    const fileMetadata: any[] = [];

    // Handle single file upload
    const singleFile = formData.get('file') as File;
    if (singleFile) {
      files.push(singleFile);
      fileMetadata.push({
        title: formData.get('title'),
        description: formData.get('description'),
        tags: formData.get('tags')
      });
    }

    // Handle multiple file upload (files[0], files[1], etc.)
    let fileIndex = 0;
    while (true) {
      const file = formData.get(`files[${fileIndex}]`) as File;
      if (!file) break;
      
      files.push(file);
      
      // Look for corresponding metadata
      const metadataStr = formData.get(`metadata[${fileIndex}]`) as string;
      let metadata = {};
      if (metadataStr) {
        try {
          metadata = JSON.parse(metadataStr);
        } catch (e) {
          console.warn(`Failed to parse metadata for file ${fileIndex}:`, e);
        }
      }
      fileMetadata.push(metadata);
      fileIndex++;
    }

    // Handle batch metadata (single JSON object for all files)
    const batchMetadataStr = formData.get('metadata') as string;
    let batchMetadata: any = {};
    if (batchMetadataStr) {
      try {
        batchMetadata = JSON.parse(batchMetadataStr);
      } catch (e) {
        console.warn('Failed to parse batch metadata:', e);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ 
        error: 'No files provided. Use "file" for single upload or "files[0]", "files[1]", etc. for batch upload' 
      }, { status: 400 });
    }

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let metadata = fileMetadata[i] || {};
      
      // If batch metadata includes per-file data, merge it
      if (batchMetadata[file.name]) {
        metadata = { ...metadata, ...batchMetadata[file.name] };
      }

      try {
        const result = await processSingleFile(file, metadata);
        results.push(result);
      } catch (error) {
        const errorInfo = {
          fileName: file.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        errors.push(errorInfo);
        console.error(`Upload failed for ${file.name}:`, error);
      }
    }

    // Return response based on results
    const response: any = {
      totalFiles: files.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    };

    // For single file uploads, maintain backward compatibility
    if (files.length === 1 && results.length === 1) {
      return NextResponse.json({
        ...results[0],
        message: 'File uploaded successfully'
      });
    }

    // For batch uploads or if there were any errors
    const status = errors.length > 0 ? (results.length > 0 ? 207 : 500) : 200; // 207 = Multi-Status
    return NextResponse.json(response, { status });

  } catch (error) {
    console.error('Upload endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Upload failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}