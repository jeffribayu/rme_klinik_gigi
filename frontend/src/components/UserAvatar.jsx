import { cn, publicAssetUrl } from '@/lib/utils';

/**
 * Avatar pengguna: foto dokter (dari profil dokter) jika ada, selain itu inisial nama.
 */
export function UserAvatar({ user, className }) {
  const src = user?.doctor_photo ? publicAssetUrl(user.doctor_photo) : null;
  const letter = (user?.name || '?').trim().slice(0, 1).toUpperCase() || '?';

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={cn('shrink-0 rounded-full object-cover ring-1 ring-border', className)}
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
