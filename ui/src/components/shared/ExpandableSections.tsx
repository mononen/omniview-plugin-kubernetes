import { Chip, Collapsible, CollapsibleContent, CollapsibleTrigger, useCollapsible } from '@omniviewdev/base-ui';
import * as React from 'react';
import { LuChevronDown, LuChevronRight } from 'react-icons/lu';

import styles from './ExpandableSections.module.css';
import DynamicIcon from './Icon';

type Variant = 'bordered' | 'plain' | 'flush';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  sections: Array<ExpandableSection>;
  monospace?: boolean;
  variant?: Variant;
  size?: Size;
  exclusive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export interface ExpandableSection {
  icon?: string | React.ReactNode;
  title: string | React.ReactNode;
  count?: number;
  endDecorator?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const sizeConfig: Record<Size, { minHeight: number; py: number; px: number; fontSize: number; iconSize: number; chevronSize: number }> = {
  sm: { minHeight: 28, py: 4, px: 8, fontSize: 12, iconSize: 14, chevronSize: 14 },
  md: { minHeight: 32, py: 6, px: 10, fontSize: 13, iconSize: 16, chevronSize: 16 },
  lg: { minHeight: 38, py: 10, px: 12, fontSize: 14, iconSize: 18, chevronSize: 18 },
};

function Chevron({ size }: { size: number }) {
  const { open } = useCollapsible();
  return (
    <span className={styles.Chevron}>
      {open ? <LuChevronDown size={size} /> : <LuChevronRight size={size} />}
    </span>
  );
}

interface SectionProps {
  section: ExpandableSection;
  size: Size;
  monospace: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function Section({ section, size, monospace, open, onOpenChange }: SectionProps) {
  const cfg = sizeConfig[size];
  const headerStyle = {
    '--_es-min-height': `${cfg.minHeight}px`,
    '--_es-py': `${cfg.py}px`,
    '--_es-px': `${cfg.px}px`,
    '--_es-font-size': `${cfg.fontSize}px`,
  } as React.CSSProperties;

  return (
    <Collapsible
      open={open}
      defaultOpen={open === undefined ? section.defaultExpanded : undefined}
      onOpenChange={onOpenChange}
    >
      <div className={styles.Header} style={headerStyle}>
        <CollapsibleTrigger className={styles.Trigger}>
          <Chevron size={cfg.chevronSize} />
          {section.icon ? (
            <span className={styles.Icon}>
              {typeof section.icon === 'string' ? (
                <DynamicIcon name={section.icon} size={cfg.iconSize} />
              ) : (
                section.icon
              )}
            </span>
          ) : null}
          <span className={monospace ? `${styles.Title} ${styles.Mono}` : styles.Title}>
            {section.title}
          </span>
          {section.count !== undefined && (
            <span className={styles.Count}>
              <Chip size="xs" color="neutral" variant="soft">
                {section.count}
              </Chip>
            </span>
          )}
        </CollapsibleTrigger>
        {section.endDecorator && (
          <div className={styles.End}>
            {section.endDecorator}
          </div>
        )}
      </div>
      <CollapsibleContent>{section.children}</CollapsibleContent>
    </Collapsible>
  );
}

/**
 * A list of collapsible sections (port of the old `@omniviewdev/ui` ExpandableSections,
 * built on base-ui `Collapsible`).
 */
export default function ExpandableSections({
  sections,
  monospace = false,
  variant = 'bordered',
  size = 'sm',
  exclusive = false,
  className,
  style,
}: Props): React.ReactElement {
  const [expandedIndex, setExpandedIndex] = React.useState<number | null>(() => {
    if (!exclusive) return null;
    const idx = sections.findIndex((s) => s.defaultExpanded);
    return idx >= 0 ? idx : null;
  });

  if (sections.length === 0) return <></>;

  const rootClass = [styles.Root, variant === 'bordered' && styles.Bordered, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass} style={style}>
      {sections.map((section, index) => {
        const key = typeof section.title === 'string' ? section.title : String(index);
        return (
          <React.Fragment key={key}>
            {index > 0 && variant !== 'flush' && <div className={styles.Divider} />}
            <Section
              section={section}
              size={size}
              monospace={monospace}
              {...(exclusive
                ? {
                  open: expandedIndex === index,
                  onOpenChange: (o: boolean) => setExpandedIndex(o ? index : null),
                }
                : {})}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
}
