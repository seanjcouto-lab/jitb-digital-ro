
import React from 'react';

interface SectionHeaderProps {
  title: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => {
  return (
    <h4 className="text-xs font-black text-neon-steel uppercase tracking-widest border-b border-neon-steel/20 pb-2 mb-3">
      {title}
    </h4>
  );
};

export default SectionHeader;
