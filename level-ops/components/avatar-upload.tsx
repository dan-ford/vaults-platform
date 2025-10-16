"use client";

import { useState, useRef } from "react";
import { Upload, X, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactAvatar } from "@/components/contact-avatar";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  contactId?: string;
  firstName: string;
  lastName: string;
  currentAvatarUrl?: string | null;
  orgId: string;
  onAvatarChange?: (url: string | null) => void;
  size?: "sm" | "md" | "lg" | "xl";
  editable?: boolean;
}

export function AvatarUpload({
  contactId,
  firstName,
  lastName,
  currentAvatarUrl,
  orgId,
  onAvatarChange,
  size = "lg",
  editable = true,
}: AvatarUploadProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be less than 2MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      console.log('Starting avatar upload...', { contactId, orgId, fileName: file.name });

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${contactId || 'temp'}-${Date.now()}.${fileExt}`;
      const filePath = `${orgId}/${fileName}`;

      console.log('Upload path:', filePath);

      // Delete old avatar if exists
      if (avatarUrl && contactId) {
        const oldPath = avatarUrl.split('/').slice(-2).join('/');
        console.log('Deleting old avatar:', oldPath);
        const { error: deleteError } = await supabase.storage.from('contacts-avatars').remove([oldPath]);
        if (deleteError) console.warn('Error deleting old avatar:', deleteError);
      }

      // Upload new avatar
      console.log('Uploading to storage...');
      const { data, error } = await supabase.storage
        .from('contacts-avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        console.error('Storage upload error:', error);
        throw error;
      }

      console.log('Upload successful:', data);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('contacts-avatars')
        .getPublicUrl(filePath);

      console.log('Public URL:', publicUrl);

      setAvatarUrl(publicUrl);
      setUploadProgress(100);

      // Update contact record if contactId exists
      if (contactId) {
        console.log('Updating contact record...');
        const { error: updateError } = await supabase
          .from('contacts')
          .update({ avatar_url: publicUrl })
          .eq('id', contactId);

        if (updateError) {
          console.error('Error updating contact record:', updateError);
          throw updateError;
        }
        console.log('Contact record updated successfully');
      }

      // Callback
      onAvatarChange?.(publicUrl);
      console.log('Avatar upload complete!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert(`Failed to upload avatar: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!contactId || !avatarUrl) return;

    try {
      // Delete from storage
      const path = avatarUrl.split('/').slice(-2).join('/');
      await supabase.storage.from('contacts-avatars').remove([path]);

      // Update contact record
      await supabase
        .from('contacts')
        .update({ avatar_url: null })
        .eq('id', contactId);

      setAvatarUrl(null);
      onAvatarChange?.(null);
    } catch (error) {
      console.error('Error removing avatar:', error);
      alert('Failed to remove avatar');
    }
  };

  return (
    <div className="relative group">
      <ContactAvatar
        firstName={firstName}
        lastName={lastName}
        avatarUrl={avatarUrl}
        size={size}
      />

      {editable && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Upload avatar"
          />

          {/* Hover overlay with upload button */}
          <div className={cn(
            "absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer",
            isUploading && "opacity-100"
          )}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            {isUploading ? (
              <div className="text-white text-xs">{uploadProgress}%</div>
            ) : (
              <Camera className="h-4 w-4 text-white" />
            )}
          </div>

          {/* Remove button when avatar exists */}
          {avatarUrl && !isUploading && (
            <Button
              size="icon"
              variant="destructive"
              className="absolute -top-1 -right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveAvatar();
              }}
              aria-label="Remove avatar"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
