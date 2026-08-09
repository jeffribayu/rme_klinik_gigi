import { useState } from 'react';
import { cn, publicAssetUrl } from '@/lib/utils';

/**
 * Avatar pengguna: foto dokter (dari profil dokter) jika ada, selain itu inisial nama.
 */
export function UserAvatar({ user, className }) {
  const [failedSrc, setFailedSrc] = useState('');
  const photo = user?.doctor_photo || user?.photo;
  const src = photo ? publicAssetUrl(photo) : null;
  const letter = (user?.name || '?').trim().slice(0, 1).toUpperCase() || '?';

  if (src && src !== failedSrc) {
    return (
      <img
        src={src}
        alt={user?.name ? `Foto ${user.name}` : ''}
        className={cn('shrink-0 rounded-full object-cover ring-1 ring-border', className)}
        onError={() => setFailedSrc(src)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold uppercase text-muted-foreground ring-1 ring-border',
        className
      )}
      aria-hidden
    >
      {letter}
    </div>
  );
}
