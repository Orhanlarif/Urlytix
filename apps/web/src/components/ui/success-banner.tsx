type SuccessBannerProps = {
  message: string;
};

export function SuccessBanner({ message }: SuccessBannerProps) {
  if (!message) {
    return null;
  }

  return (
    <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
      {message}
    </div>
  );
}