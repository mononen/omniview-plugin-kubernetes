import TagInput from '../../components/connections/TagInput';

import { tagsContainerStyle } from './constants';
import SectionWrapper from './SectionWrapper';

function TagsSection({
  tags,
  availableTags,
  onChange,
}: {
  tags: string[];
  availableTags: string[];
  onChange: (tags: string[]) => void;
}) {
  return (
    <SectionWrapper
      title="Tags"
      description="Organize clusters by environment, team, or any custom category."
    >
      <div style={tagsContainerStyle}>
        <TagInput tags={tags} availableTags={availableTags} onChange={onChange} />
      </div>
    </SectionWrapper>
  );
}

export default TagsSection;
