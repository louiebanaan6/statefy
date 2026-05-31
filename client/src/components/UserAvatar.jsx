export default function UserAvatar({ user, size = 'md', className = '' }) {
  const sizes = {
    xs: 'w-7 h-7 text-xs',
    sm: 'w-9 h-9 text-sm',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-xl',
    xl: 'w-20 h-20 text-3xl',
  };

  const sizeClass = sizes[size] || sizes.md;
  const letter = (user?.display_name || user?.username || '?')[0].toUpperCase();

  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.display_name}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div className={`${sizeClass} rounded-full bg-primary flex items-center justify-center flex-shrink-0 ${className}`}>
      <span className="font-bold text-white leading-none">{letter}</span>
    </div>
  );
}
