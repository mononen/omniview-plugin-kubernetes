import { Button, IconButton, Input, Stack, Text } from '@omniviewdev/base-ui';
import React, { useCallback } from 'react';
import { LuPlus, LuX } from 'react-icons/lu';

import type { FolderRuleSet, FolderRule, RuleField, RuleOperator, RuleLogic } from '../../types/clusters';

import SimpleSelect from './SimpleSelect';

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

const containerStyle: React.CSSProperties = { gap: 8 };
const logicRowStyle: React.CSSProperties = { gap: 2 };
const ruleRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr auto',
  gap: 4,
  alignItems: 'center',
};
const ruleRowNoValueStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr auto',
  gap: 4,
  alignItems: 'center',
};
const footerStyle: React.CSSProperties = { marginTop: 4 };
const matchTextStyle: React.CSSProperties = { opacity: 0.7 };
const selectMinStyle: React.CSSProperties = { minWidth: 0, width: '100%' };

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
    <Stack direction="column" style={containerStyle}>
      {/* AND / OR toggle */}
      {ruleSet.rules.length > 1 && (
        <Stack direction="row" align="center" style={{ gap: 6 }}>
          <Text size="xs" weight="semibold" style={matchTextStyle}>
            Match
          </Text>
          <Stack direction="row" style={logicRowStyle}>
            <Button
              size="xs"
              variant={ruleSet.logic === 'and' ? 'soft' : 'ghost'}
              color={ruleSet.logic === 'and' ? 'brand' : 'neutral'}
              onClick={() => updateLogic('and')}
            >
              All
            </Button>
            <Button
              size="xs"
              variant={ruleSet.logic === 'or' ? 'soft' : 'ghost'}
              color={ruleSet.logic === 'or' ? 'brand' : 'neutral'}
              onClick={() => updateLogic('or')}
            >
              Any
            </Button>
          </Stack>
          <Text size="xs" style={matchTextStyle}>
            of the following rules
          </Text>
        </Stack>
      )}

      {/* Rule rows */}
      {ruleSet.rules.map((rule) => {
        const isValueless = VALUELESS_OPERATORS.has(rule.operator);
        return (
          <div key={rule.id} style={isValueless ? ruleRowNoValueStyle : ruleRowStyle}>
            <SimpleSelect
              size="sm"
              aria-label="Field"
              value={rule.field}
              onChange={(val) => {
                if (val) updateRule(rule.id, { field: val as RuleField });
              }}
              options={availableFields}
              style={selectMinStyle}
            />
            <SimpleSelect
              size="sm"
              aria-label="Operator"
              value={rule.operator}
              onChange={(val) => {
                if (val) updateRule(rule.id, { operator: val as RuleOperator });
              }}
              options={OPERATOR_OPTIONS}
              style={selectMinStyle}
            />
            {!isValueless && (
              <Input.Control
                size="sm"
                placeholder="value"
                aria-label="Value"
                value={rule.value}
                onChange={(e) => updateRule(rule.id, { value: e.target.value })}
              />
            )}
            <IconButton
              size="sm"
              variant="ghost"
              color="neutral"
              onClick={() => removeRule(rule.id)}
              aria-label="Remove rule"
            >
              <LuX size={14} />
            </IconButton>
          </div>
        );
      })}

      {/* Add rule + match count footer */}
      <Stack direction="row" align="center" justify="between" style={footerStyle}>
        <Button
          size="xs"
          variant="ghost"
          color="neutral"
          startDecorator={<LuPlus size={12} />}
          onClick={addRule}
        >
          Add Rule
        </Button>
        {ruleSet.rules.length > 0 && (
          <Text size="xs" style={matchTextStyle}>
            Matches{' '}<strong>{matchCount}</strong>{' '}cluster{matchCount !== 1 ? 's' : ''}
          </Text>
        )}
      </Stack>
    </Stack>
  );
};

export default RuleBuilder;
