'use client';

import { FileImage, Loader2, UploadCloud, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  requestPresignedUpload,
  type PresignedUploadResponse,
  uploadFileToSignedUrl,
} from '@/lib/api/uploads';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type FileUploaderProps = {
  accept?: string;
  maxSize?: number;
  onUploadComplete?: (payload: { file: File; fileUrl?: string }) => void;
  className?: string;
  getSignedUrl?: (file: File) => Promise<PresignedUploadResponse>;
};

function bytesToReadable(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function fileAccepted(file: File, accept: string) {
  if (!accept.trim()) return true;

  const rules = accept
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  return rules.some((rule) => {
    if (rule.startsWith('.')) return name.endsWith(rule);
    if (rule.endsWith('/*')) return mime.startsWith(rule.replace('*', ''));
    return mime === rule;
  });
}

export function FileUploader({
  accept = 'image/png,image/jpeg,image/webp',
  maxSize = 2 * 1024 * 1024,
  onUploadComplete,
  className,
  getSignedUrl,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const previewUrl = useMemo(() => {
    if (!selectedFile) return null;
    if (!selectedFile.type.startsWith('image/')) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const reset = () => {
    setError(null);
    setSelectedFile(null);
    setProgress(0);
    setUploadedUrl(undefined);
    if (inputRef.current) inputRef.current.value = '';
  };

  const validateFile = (file: File) => {
    if (!fileAccepted(file, accept)) {
      return `Type non autorise. Formats acceptes: ${accept}`;
    }

    if (file.size > maxSize) {
      return `Fichier trop volumineux (max ${bytesToReadable(maxSize)}).`;
    }

    return null;
  };

  const handleUpload = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSelectedFile(file);
    setIsUploading(true);
    setProgress(0);

    try {
      const signed = getSignedUrl
        ? await getSignedUrl(file)
        : await requestPresignedUpload({
            fileName: file.name,
            contentType: file.type || 'application/octet-stream',
            size: file.size,
          });

      await uploadFileToSignedUrl({
        uploadUrl: signed.uploadUrl,
        file,
        method: signed.method,
        headers: signed.headers,
        onProgress: setProgress,
      });

      setProgress(100);
      setUploadedUrl(signed.fileUrl);
      onUploadComplete?.({ file, fileUrl: signed.fileUrl });
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'Erreur inconnue';
      setError(`Echec upload: ${message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const onFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleUpload(file);
  };

  const onDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await handleUpload(file);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onFileInputChange}
      />

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          'rounded-xl border border-dashed p-6 text-center transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-border',
          isUploading && 'pointer-events-none opacity-80'
        )}
      >
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <UploadCloud className="h-5 w-5" />
        </div>

        <p className="text-sm font-medium">Glissez-deposez votre fichier ici</p>
        <p className="mt-1 text-xs text-muted-foreground">
          ou selectionnez un fichier ({accept}) - max {bytesToReadable(maxSize)}
        </p>

        <Button type="button" variant="outline" className="mt-4" onClick={() => inputRef.current?.click()}>
          Choisir un fichier
        </Button>
      </div>

      {selectedFile ? (
        <div className="rounded-xl border p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <FileImage className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">{bytesToReadable(selectedFile.size)}</p>
              </div>
            </div>

            <Button type="button" variant="ghost" size="icon" onClick={reset} aria-label="Supprimer le fichier">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Apercu"
              className="mt-3 h-40 w-full rounded-lg border object-cover"
            />
          ) : null}

          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{isUploading ? 'Upload en cours...' : uploadedUrl ? 'Upload termine' : 'Pret'}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>

          {uploadedUrl ? (
            <p className="mt-2 truncate text-xs text-muted-foreground">URL: {uploadedUrl}</p>
          ) : null}
        </div>
      ) : null}

      {isUploading ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Transfert du fichier en cours...
        </p>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
