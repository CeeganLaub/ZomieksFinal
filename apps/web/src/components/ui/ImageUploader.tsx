import { useState, useRef, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { CloudArrowUpIcon, XMarkIcon, PhotoIcon, VideoCameraIcon } from '@heroicons/react/24/outline';

function getAuthToken(): string | null {
  try {
    const storage = localStorage.getItem('auth-storage');
    if (storage) {
      const parsed = JSON.parse(storage);
      return parsed.state?.token || null;
    }
  } catch { /* ignore */ }
  return null;
}

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  variant?: 'thumbnail' | 'video' | 'avatar';
  label?: string;
  className?: string;
  accept?: string;
  maxSizeMB?: number;
}

interface GalleryUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  label?: string;
  className?: string;
}

async function uploadFile(file: File, type: 'image' | 'video' | 'avatar'): Promise<string> {
  const formData = new FormData();
  const fieldName = type === 'video' ? 'video' : type === 'avatar' ? 'avatar' : 'image';
  formData.append(fieldName, file);

  const token = getAuthToken();
  const endpoint = type === 'video' ? '/api/v1/uploads/video' : type === 'avatar' ? '/api/v1/uploads/avatar' : '/api/v1/uploads/image';

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message || 'Upload failed');
  return data.data.url;
}

export function ImageUploader({
  value,
  onChange,
  variant = 'thumbnail',
  label,
  className,
  accept,
  maxSizeMB = 10,
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isVideo = variant === 'video';
  const effectiveAccept = accept || (isVideo ? 'video/mp4,video/webm,video/quicktime' : 'image/jpeg,image/png,image/gif,image/webp');
  const effectiveMaxSize = isVideo ? 500 : maxSizeMB;

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (file.size > effectiveMaxSize * 1024 * 1024) {
      setError(`File must be less than ${effectiveMaxSize}MB`);
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadFile(file, isVideo ? 'video' : variant === 'avatar' ? 'avatar' : 'image');
      onChange(url);
    } catch (err: any) {
      setError(err?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [onChange, isVideo, variant, effectiveMaxSize]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }, [handleFile]);

  const Icon = isVideo ? VideoCameraIcon : PhotoIcon;

  if (variant === 'avatar') {
    return (
      <div className={cn('flex flex-col items-center gap-3', className)}>
        {label && <label className="text-sm font-medium text-foreground">{label}</label>}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="relative group"
          disabled={isUploading}
        >
          <div className={cn(
            'w-24 h-24 rounded-full border-2 border-dashed border-border overflow-hidden transition-all',
            'hover:border-primary/50 hover:shadow-lg',
            isDragging && 'border-primary bg-primary/5',
          )}>
            {value ? (
              <img src={value} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <PhotoIcon className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            {isUploading && (
              <div className="absolute inset-0 bg-background/70 flex items-center justify-center rounded-full">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
            <CloudArrowUpIcon className="w-4 h-4" />
          </div>
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      {label && <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>}

      {value ? (
        <div className="relative group rounded-xl overflow-hidden border border-border bg-muted">
          {isVideo ? (
            <video src={value} controls className="w-full aspect-video object-cover" />
          ) : (
            <img src={value} alt="Uploaded" className="w-full aspect-video object-cover" />
          )}
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive/90 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-destructive"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 px-3 py-1.5 rounded-lg bg-background/90 text-foreground text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-background border border-border"
          >
            Replace
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => !isUploading && inputRef.current?.click()}
          className={cn(
            'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200',
            'aspect-video',
            isDragging
              ? 'border-primary bg-primary/5 scale-[1.01]'
              : 'border-border hover:border-primary/50 hover:bg-muted/50',
            isUploading && 'pointer-events-none opacity-70',
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 p-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Icon className="w-7 h-7 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {isDragging ? 'Drop to upload' : 'Click or drag to upload'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isVideo ? 'MP4, WebM, MOV up to 500MB' : 'JPG, PNG, GIF, WebP up to 10MB'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <input ref={inputRef} type="file" accept={effectiveAccept} className="hidden" onChange={onFileChange} />
      {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function GalleryUploader({ value, onChange, max = 5, label, className }: GalleryUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList) => {
    setError(null);
    const remaining = max - value.length;
    if (remaining <= 0) {
      setError(`Maximum ${max} images allowed`);
      return;
    }

    const toUpload = Array.from(files).slice(0, remaining);
    const oversized = toUpload.find(f => f.size > 10 * 1024 * 1024);
    if (oversized) {
      setError('Each file must be less than 10MB');
      return;
    }

    setIsUploading(true);
    try {
      const urls = await Promise.all(toUpload.map(f => uploadFile(f, 'image')));
      onChange([...value, ...urls]);
    } catch (err: any) {
      setError(err?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [value, onChange, max]);

  const removeImage = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {label} ({value.length}/{max})
        </label>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {value.map((url, i) => (
          <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-border bg-muted">
            <img src={url} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute top-1.5 right-1.5 p-1 rounded-full bg-destructive/90 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-destructive"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
            </button>
            {i === 0 && (
              <span className="absolute bottom-1.5 left-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                Cover
              </span>
            )}
          </div>
        ))}

        {value.length < max && (
          <button
            type="button"
            onClick={() => !isUploading && inputRef.current?.click()}
            disabled={isUploading}
            className={cn(
              'aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 transition-all',
              'hover:border-primary/50 hover:bg-muted/50',
              isUploading && 'pointer-events-none opacity-70',
            )}
          >
            {isUploading ? (
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CloudArrowUpIcon className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Add Image</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ''; }}
      />
      {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
    </div>
  );
}
