import { NextRequest, NextResponse } from 'next/server';
import { uploadService, FileMetadata } from '@/services/uploadService';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Parse files and metadata from form data
    const { files, fileMetadata, batchMetadata } = parseFormData(formData);

    if (files.length === 0) {
      return NextResponse.json({ 
        error: 'No files provided. Use "file" for single upload or "files[0]", "files[1]", etc. for batch upload' 
      }, { status: 400 });
    }

    // Delegate to service layer
    const result = await uploadService.processImageUploads(files, fileMetadata, batchMetadata);

    // For single file uploads, maintain backward compatibility
    if (files.length === 1 && result.results.length === 1) {
      return NextResponse.json({
        ...result.results[0],
        message: 'File uploaded successfully'
      });
    }

    // For batch uploads or if there were any errors
    const status = result.errors && result.errors.length > 0 ? 
      (result.results.length > 0 ? 207 : 500) : 200; // 207 = Multi-Status
    
    return NextResponse.json(result, { status });

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

/**
 * Parse form data to extract files and metadata
 */
function parseFormData(formData: FormData) {
  const files: File[] = [];
  const fileMetadata: FileMetadata[] = [];
  let batchMetadata: Record<string, any> = {};

  // Handle single file upload
  const singleFile = formData.get('file') as File;
  if (singleFile) {
    files.push(singleFile);
    fileMetadata.push({
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      tags: formData.get('tags') as string
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
    let metadata: FileMetadata = {};
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
  if (batchMetadataStr) {
    try {
      batchMetadata = JSON.parse(batchMetadataStr);
    } catch (e) {
      console.warn('Failed to parse batch metadata:', e);
    }
  }

  return { files, fileMetadata, batchMetadata };
}