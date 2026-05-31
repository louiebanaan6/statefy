export default function VerifiedBadge({ size = 'sm' }) {
  const sizes = { sm: 'w-4 h-4 text-xs', md: 'w-5 h-5 text-sm' };
  return (
    <span
      className={`${sizes[size] || sizes.sm} inline-flex items-center justify-center bg-primary text-white rounded-full flex-shrink-0`}
      title="Verified"
    >
      <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5">
        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
