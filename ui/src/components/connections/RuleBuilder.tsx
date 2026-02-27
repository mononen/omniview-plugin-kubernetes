import Box from '@mui/material/Box';
import { Button, IconButton } from '@omniviewdev/ui/buttons';
import { Select, TextField } from '@omniviewdev/ui/inputs';
import { Stack } from '@omniviewdev/ui/layout';
import { Text } from '@omniviewdev/ui/typography';
import React, { useCallback } from 'react';
import { LuPlus, LuX } from 'react-icons/lu';

import type { FolderRuleSet, FolderRule, RuleField, RuleOperator, RuleLogic } from '../../types/clusters';

// ── Props ─────────────────────────────────────────────────────────────────────

export type RuleBuilderProps = {
  ruleSet: FolderRuleSet;
  onChange: (ruleSet: FolderRuleSet) => void;
  matchCount: number;
  availableFields: { value: string; label: string }[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

const OPERATOR_OPTIONS: { value: RuleOperator; label: string }[] = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'not contains' },
  { value: 'matches_regex', label: 'matches regex' },
  { value: 'exists', label: 'exists' },
  { value: 'not_exists', label: 'not exists' },
];

const VALUELESS_OPERATORS = new Set<RuleOperator>(['exists', 'not_exists']);

// ── Static styles ─────────────────────────────────────────────────────────────

const sxContainer = { gap: 1 } as const;
const sxLogicRow = { gap: 0.25 } as const;
const sxRuleRow = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr auto',
  gap: 0.5,
  alignItems: 'center',
} as const;
const sxRuleRowNoValue = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr auto',
  gap: 0.5,
  alignItems: 'center',
} as const;
const sxFooter = { mt: 0.5 } as const;
const sxMatchText = { opacity: 0.7 } as const;
const sxSelectMin = { minWidth: 0 } as const;

// ── Component ─────────────────────────────────────────────────────────────────

const RuleBuilder: React.FC<RuleBuilderProps> = ({
  ruleSet,
  onChange,
  matchCount,
  availableFields,
}) => {
  const updateLogic = useCallback(
    (logic: RuleLogic) => {
      onChange({ ...ruleSet, logic });
    },
    [ruleSet, onChange],
  );

  const addRule = useCallback(() => {
    const newRule: FolderRule = {
      id: crypto.randomUUID(),
      field: (availableFields[0]?.value ?? 'name') as RuleField,
      operator: 'equals',
      value: '',
    };
    onChange({ ...ruleSet, rules: [...ruleSet.rules, newRule] });
  }, [ruleSet, onChange, availableFields]);

  const removeRule = useCallback(
    (ruleId: string) => {
      onChange({ ...ruleSet, rules: ruleSet.rules.filter((r) => r.id !== ruleId) });
    },
    [ruleSet, onChange],
  );

  const updateRule = useCallback(
    (ruleId: string, updates: Partial<FolderRule>) => {
      onChange({
        ...ruleSet,
        rules: ruleSet.rules.map((r) => (r.id === ruleId ? { ...r, ...updates } : r)),
      });
    },
    [ruleSet, onChange],
  );

  return (
    <Stack sx={sxContainer}>
      {/* AND / OR toggle */}
      {ruleSet.rules.length > 1 && (
        <Stack direction="row" alignItems="center" gap={0.75}>
          <Text size="xs" weight="semibold" sx={sxMatchText}>
            Match
          </Text>
          <Stack direction="row" sx={sxLogicRow}>
            <Button
              size="xs"
              emphasis={ruleSet.logic === 'and' ? 'soft' : 'ghost'}
              color={ruleSet.logic === 'and' ? 'primary' : 'neutral'}
              onClick={() => updateLogic('and')}
            >
              All
            </Button>
            <Button
              size="xs"
              emphasis={ruleSet.logic === 'or' ? 'soft' : 'ghost'}
              color={ruleSet.logic === 'or' ? 'primary' : 'neutral'}
              onClick={() => updateLogic('or')}
            >
              Any
            </Button>
          </Stack>
          <Text size="xs" sx={sxMatchText}>
            of the following rules
          </Text>
        </Stack>
      )}

      {/* Rule rows */}
      {ruleSet.rules.map((rule) => {
        const isValueless = VALUELESS_OPERATORS.has(rule.operator);
        return (
          <Box key={rule.id} sx={isValueless ? sxRuleRowNoValue : sxRuleRow}>
            <Select
              size="sm"
              value={rule.field}
              onChange={(val) => {
                if (val) updateRule(rule.id, { field: val as RuleField });
              }}
              options={availableFields}
              sx={sxSelectMin}
            />
            <Select
              size="sm"
              value={rule.operator}
              onChange={(val) => {
                if (val) updateRule(rule.id, { operator: val as RuleOperator });
              }}
              options={OPERATOR_OPTIONS}
              sx={sxSelectMin}
            />
            {!isValueless && (
              <TextField
                size="sm"
                placeholder="value"
                value={rule.value}
                onChange={(val) => updateRule(rule.id, { value: val })}
              />
            )}
            <IconButton
              size="sm"
              emphasis="ghost"
              color="neutral"
              onClick={() => removeRule(rule.id)}
              aria-label="Remove rule"
            >
              <LuX size={14} />
            </IconButton>
          </Box>
        );
      })}

      {/* Add rule + match count footer */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={sxFooter}>
        <Button size="xs" emphasis="ghost" color="neutral" onClick={addRule}>
          <LuPlus size={12} />
          Add Rule
        </Button>
        {ruleSet.rules.length > 0 && (
          <Text size="xs" sx={sxMatchText}>
            Matches{' '}<strong>{matchCount}</strong>{' '}cluster{matchCount !== 1 ? 's' : ''}
          </Text>
        )}
      </Stack>
    </Stack>
  );
};

export default RuleBuilder;
