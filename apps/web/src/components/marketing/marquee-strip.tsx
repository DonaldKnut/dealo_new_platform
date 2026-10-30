'use client';

const items = [
  'Direct Recruitment & Executive Search',
  'Managed Staffing Operations',
  'Top 2% Technical & Executive Screening',
  '48-Hour Curated Shortlists',
  'Structured Interview Coordination',
  'Payroll, Compliance & Contracts',
  'Lagos • Abuja • Remote Pan-Africa',
  '90-Day Placement Warranty',
];

export function MarqueeStrip() {
  const loop = [...items, ...items, ...items];

  return (
    <div className="relative overflow-hidden border-y border-border/80 bg-surface/80 py-3 backdrop-blur-sm min-[340px]:py-4">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background to-transparent min-[340px]:w-16 sm:w-24" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background to-transparent min-[340px]:w-16 sm:w-24" />
      <div className="marquee-track flex w-max gap-6 whitespace-nowrap min-[340px]:gap-12">
        {loop.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="flex items-center gap-2 text-[10px] font-semibold tracking-wider text-muted uppercase transition-colors hover:text-foreground min-[340px]:gap-4 min-[340px]:text-xs"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
