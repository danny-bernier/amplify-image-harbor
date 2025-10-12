import { uploadData, getUrl } from 'aws-amplify/storage';


const uploadFile = async (path: string, file: File): Promise<string> => {
  try {
    const result = await uploadData({
      path: path,
      data: file,
      options: {
        contentType: file.type,
      }
    }).result;

    return result.path;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};

export const uploadProtectedOriginal = async (file: File, fileName: string): Promise<string> => {
  const s3Key = `protected/images/original/${fileName}`;
  return uploadFile(s3Key, file);
};

export const uploadProtectedThumbnail = async (file: File, fileName: string): Promise<string> => {
  const s3Key = `protected/images/thumbnail/${fileName}`;
  return uploadFile(s3Key, file);
};

export const uploadProtectedEdited = async (file: File, fileName: string): Promise<string> => {
  const s3Key = `protected/images/edited/${fileName}`;
  return uploadFile(s3Key, file);
};

export const uploadPrivateOriginal = async (file: File, fileName: string): Promise<string> => {
  const s3Key = `private/images/original/${fileName}`;
  return uploadFile(s3Key, file);
};

export const uploadPrivateThumbnail = async (file: File, fileName: string): Promise<string> => {
  const s3Key = `private/images/thumbnail/${fileName}`;
  return uploadFile(s3Key, file);
};

export const uploadPrivateEdited = async (file: File, fileName: string): Promise<string> => {
  const s3Key = `private/images/edited/${fileName}`;
  return uploadFile(s3Key, file);
};

export const getFileUrl = async (path: string): Promise<string> => {
  try {
    const result = await getUrl({
      path: path,
      options: {
        expiresIn: 3600, // 1 hour
      }
    });

    return result.url.toString();
  } catch (error) {
    console.error('Failed to get file URL:', error);
    throw error;
  }
};