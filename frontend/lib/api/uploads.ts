import apiClient from '@/lib/api/client';

export type PresignedUploadResponse = {
  uploadUrl: string;
  fileUrl?: string;
  method?: 'PUT' | 'POST';
  headers?: Record<string, string>;
};

export async function requestPresignedUpload(payload: {
  fileName: string;
  contentType: string;
  size: number;
}) {
  const response = await apiClient.post('/uploads/presign/', payload);

  const data = response.data?.data ?? response.data;

  return {
    uploadUrl: data.upload_url,
    fileUrl: data.file_url,
    method: (data.method as 'PUT' | 'POST' | undefined) ?? 'PUT',
    headers: data.headers ?? {},
  } as PresignedUploadResponse;
}

export async function uploadFileToSignedUrl(options: {
  uploadUrl: string;
  file: File;
  method?: 'PUT' | 'POST';
  headers?: Record<string, string>;
  onProgress?: (percentage: number) => void;
}) {
  const { uploadUrl, file, method = 'PUT', headers = {}, onProgress } = options;

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, uploadUrl);

    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    if (!headers['Content-Type']) {
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      const percentage = Math.round((event.loaded / event.total) * 100);
      onProgress(percentage);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Echec upload (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error('Erreur reseau pendant l\'upload.'));
    xhr.send(file);
  });
}
