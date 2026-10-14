import { SearchInput } from '@omniviewdev/base-ui';
import { useState, useEffect } from 'react';
import { LuSearch } from 'react-icons/lu';

const inputStyle = { flex: 1, maxWidth: 360 } as const;

export type DebounceProps = {
  value: string;
  onChange: (value: string) => void;
  debounce?: number;
  placeholder?: string;
  autoFocus?: boolean;
};

/**
 * A compact debounced search input matching IDETable style.
 */
export function DebouncedInput({
  value: initialValue,
  onChange,
  debounce = 500,
  placeholder = 'Search',
  autoFocus = true,
}: DebounceProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value);
    }, debounce);

    return () => {
      clearTimeout(timeout);
    };
  }, [value, debounce, onChange]);

  return (
    <SearchInput
      size="sm"
      variant="outline"
      value={value}
      onValueChange={setValue}
      onClear={() => {
        setValue('');
        onChange('');
      }}
      placeholder={placeholder}
      startDecorator={<LuSearch size={14} />}
      // eslint-disable-next-line jsx-a11y/no-autofocus
      autoFocus={autoFocus}
      autoComplete="off"
      aria-label={placeholder}
      style={inputStyle}
    />
  );
}
