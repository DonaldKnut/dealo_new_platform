export function HeroOrbs({
  size = 'default',
}: {
  size?: 'default' | 'compact';
}) {
  const large = size === 'default';

  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className={
          large
            ? 'hero-orb absolute -left-24 top-10 h-56 w-56 rounded-full bg-brand/20 blur-3xl min-[340px]:h-80 min-[340px]:w-80'
            : 'hero-orb absolute -left-20 top-8 h-56 w-56 rounded-full bg-brand/15 blur-3xl'
        }
      />
      <div
        className={
          large
            ? 'hero-orb-delayed absolute -right-20 top-20 h-64 w-64 rounded-full bg-accent/20 blur-3xl min-[340px]:h-96 min-[340px]:w-96'
            : 'hero-orb-delayed absolute -right-16 top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl'
        }
      />
    </div>
  );
}
