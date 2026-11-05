import { Fragment, type ReactNode } from 'react';

/**
 * Job descriptions are plain text written by any company, so they are never
 * rendered as HTML. Supported formatting: blank line = new paragraph,
 * lines starting with "- " or "* " = bullet list, **text** = bold.
 */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={index} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

export function JobDescription({ text, className = '' }: { text: string; className?: string }) {
  const plain = text.replace(/<\/(p|li|h\d)>/gi, '\n\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
  const blocks = plain.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  return (
    <div className={`space-y-3 text-sm leading-relaxed text-muted sm:text-base ${className}`}>
      {blocks.map((block, index) => {
        const lines = block.split('\n');
        if (lines.every((line) => /^\s*[-*•]\s+/.test(line))) {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5">
              {lines.map((line, i) => (
                <li key={i}>{inline(line.replace(/^\s*[-*•]\s+/, ''))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index} className="break-words">
            {lines.map((line, i) => (
              <Fragment key={i}>
                {i > 0 ? <br /> : null}
                {inline(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export function plainSummary(text: string, max = 200) {
  const plain = text.replace(/<[^>]+>/g, ' ').replace(/\*\*/g, '').replace(/^\s*[-*•]\s+/gm, '').replace(/\s+/g, ' ').trim();
  return plain.length > max ? `${plain.slice(0, max - 1)}…` : plain;
}
