"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import imageCompression from "browser-image-compression";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  currentUrl: string | null;
  shape: "circle" | "square";
  /** px — default 96 */
  size?: number;
  /** Accessible name for the upload button, e.g. "Upload profile photo" */
  ariaLabel?: string;
  getPresignedUrl: () => Promise<{ presignedUrl: string }>;
  /** Server action — persists key to DB + calls revalidatePath */
  onSaveKey: () => Promise<void>;
}

export function ImageUpload({
  currentUrl,
  shape,
  size = 96,
  ariaLabel,
  getPresignedUrl,
  onSaveKey,
}: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Revoke the blob URL when the component unmounts
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  // Sync previewUrl when the parent passes a new currentUrl (e.g. after successful upload)
  useEffect(() => {
    if (!blobUrlRef.current) {
      setPreviewUrl(currentUrl);
    }
  }, [currentUrl]);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const urlBeforeUpload = currentUrl; // capture before first await

    // Reset input so the same file can be re-selected after an error
    e.target.value = "";

    setUploading(true);

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 800,
        fileType: "image/webp",
        useWebWorker: true,
      });

      // Clean up the previous blob URL, then create one from the compressed blob
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const compressedUrl = URL.createObjectURL(compressed);
      blobUrlRef.current = compressedUrl;
      setPreviewUrl(compressedUrl);

      const { presignedUrl } = await getPresignedUrl();

      const res = await fetch(presignedUrl, {
        method: "PUT",
        body: compressed,
        headers: { "Content-Type": "image/webp" },
      });

      if (!res.ok) {
        throw new Error(`PUT failed: ${res.status}`);
      }

      await onSaveKey();
      blobUrlRef.current = null; // allow useEffect to sync CDN URL when parent re-renders
      toast.success("Photo updated!");
    } catch {
      toast.error("Upload failed. Try again.");
      // On error: revoke the blob URL and revert the preview
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      setPreviewUrl(urlBeforeUpload);
    } finally {
      setUploading(false);
    }
  }

  const sizeStyle = { width: size, height: size } as const;

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {shape === "circle" ? (
        <CircleUpload
          previewUrl={previewUrl}
          uploading={uploading}
          size={size}
          sizeStyle={sizeStyle}
          ariaLabel={ariaLabel}
          onTrigger={() => !uploading && inputRef.current?.click()}
        />
      ) : (
        <SquareUpload
          previewUrl={previewUrl}
          uploading={uploading}
          size={size}
          sizeStyle={sizeStyle}
          ariaLabel={ariaLabel}
          onTrigger={() => !uploading && inputRef.current?.click()}
        />
      )}
    </>
  );
}

// ─── Internal sub-components ────────────────────────────────────────────────

interface InnerProps {
  previewUrl: string | null;
  uploading: boolean;
  size: number;
  sizeStyle: { width: number; height: number };
  ariaLabel?: string | undefined;
  onTrigger: () => void;
}

function CircleUpload({ previewUrl, uploading, size, sizeStyle, ariaLabel, onTrigger }: InnerProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? "Upload image"}
      disabled={uploading}
      onClick={onTrigger}
      className={cn(
        "relative cursor-pointer rounded-full",
        "border-2 border-border shadow-brutalist-sm",
        "transition-shadow hover:shadow-brutalist",
        "disabled:cursor-not-allowed disabled:opacity-70",
        "group",
      )}
      style={sizeStyle}
    >
      <Avatar className={cn("h-full w-full")}>
        <AvatarImage src={previewUrl ?? undefined} alt="Profile photo" className="object-cover" />
        <AvatarFallback className="bg-muted">
          <Camera size={Math.round(size * 0.35)} className="text-muted-foreground" />
        </AvatarFallback>
      </Avatar>

      {/* Hover overlay */}
      <span
        className={cn(
          "absolute inset-0 rounded-full",
          "bg-black/0 group-hover:bg-black/20",
          "transition-colors",
          "flex items-center justify-center",
        )}
      >
        {!uploading && (
          <Camera
            size={Math.round(size * 0.3)}
            className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
          />
        )}
      </span>

      {/* Upload spinner overlay */}
      {uploading && (
        <span className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
          <Loader2 size={Math.round(size * 0.35)} className="text-white animate-spin" />
        </span>
      )}
    </button>
  );
}

function SquareUpload({ previewUrl, uploading, size, sizeStyle, ariaLabel, onTrigger }: InnerProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? "Upload image"}
      disabled={uploading}
      onClick={onTrigger}
      className={cn(
        "relative cursor-pointer rounded-md overflow-hidden",
        "border-2 border-border shadow-brutalist-sm bg-card",
        "transition-shadow hover:shadow-brutalist",
        "disabled:cursor-not-allowed disabled:opacity-70",
        "group",
      )}
      style={sizeStyle}
    >
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Upload preview"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted">
          <Camera size={Math.round(size * 0.35)} className="text-muted-foreground" />
        </div>
      )}

      {/* Hover overlay */}
      <span
        className={cn(
          "absolute inset-0",
          "bg-black/0 group-hover:bg-black/20",
          "transition-colors",
          "flex items-center justify-center",
        )}
      >
        {!uploading && (
          <Camera
            size={Math.round(size * 0.3)}
            className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
          />
        )}
      </span>

      {/* Upload spinner overlay */}
      {uploading && (
        <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <Loader2 size={Math.round(size * 0.35)} className="text-white animate-spin" />
        </span>
      )}
    </button>
  );
}
