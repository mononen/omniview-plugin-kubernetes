import { TagInput as BaseTagInput } from '@omniviewdev/base-ui';
import React, { useId } from 'react';

type Props = {
  tags: string[];
  availableTags: string[];
  onChange: (tags: string[]) => void;
};

const TagInput: React.FC<Props> = ({ tags, availableTags, onChange }) => {
  const listId = useId();
  // Suggest known tags that aren't applied yet (native datalist autocomplete)
  const suggestions = [...new Set(availableTags)].filter((t) => !tags.includes(t)).sort();

  return (
    <>
      <BaseTagInput
        size="sm"
        value={tags}
        placeholder="Add tags..."
        onChange={(newValue) => {
          onChange(newValue.map((v) => v.trim()).filter(Boolean));
        }}
        inputProps={{ list: listId, 'aria-label': 'Tags' }}
      />
      <datalist id={listId}>
        {suggestions.map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>
    </>
  );
};

export default TagInput;
