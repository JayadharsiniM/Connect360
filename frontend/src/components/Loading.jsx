export default function Loading({ message = 'Loading...' }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-stack-md">
      <div className="w-10 h-10 rounded-full border-3 border-outline-variant border-t-secondary animate-spin" />
      <p className="font-hanken text-body-md text-on-surface-variant">{message}</p>
    </div>
  );
}
