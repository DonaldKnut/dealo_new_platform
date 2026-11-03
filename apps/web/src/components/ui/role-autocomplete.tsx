'use client';

import { suggestRoleTitles } from '@dealo/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

type RoleAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  family?: 'OFFICE_PROFESSIONAL' | 'SKILLED_TRADE' | string;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  onBlur?: () => void;
};

export function RoleAutocomplete({
  value,
  onChange,
  family,
  placeholder,
  className,
  id,
  name,
  disabled,
  onBlur,
}: RoleAutocompleteProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const suggestions = useMemo(
    () => suggestRoleTitles(value, family, 8),
    [value, family],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [suggestions]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const pick = (title: string) => {
    onChange(title);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <input
        id={id}
        name={name}
        className={cn('input-field', className)}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        onFocus={() => setOpen(true)}
        onBlur={onBlur}
        onChange={(event) => {
          const cleaned = event.target.value.replace(/\d/g, '');
          onChange(cleaned);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (!open || suggestions.length === 0) return;
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
          } else if (event.key === 'Enter') {
            event.preventDefault();
            pick(suggestions[activeIndex] ?? value);
          } else if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      <AnimatePresence>
        {open && suggestions.length > 0 ? (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            className="absolute z-40 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-border bg-surface-elevated p-1 shadow-[0_16px_40px_rgba(4,47,46,0.16)]"
          >
            {suggestions.map((title, index) => (
              <li key={title} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  className={cn(
                    'w-full rounded-lg px-3 py-2 text-left text-sm transition',
                    index === activeIndex
                      ? 'bg-brand-soft text-foreground'
                      : 'text-muted hover:bg-surface hover:text-foreground',
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(title)}
                >
                  {title}
                </button>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
