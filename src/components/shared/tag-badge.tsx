
import type { Tag } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import React from 'react';

interface TagBadgeProps {
  tag: Tag;
}

const TagBadge = React.memo(function TagBadge({ tag }: TagBadgeProps) {
  return (
    <Link href={`/tags/${encodeURIComponent(tag.name.toLowerCase())}`} legacyBehavior>
      <Badge variant="secondary" className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors">
        {tag.name}
      </Badge>
    </Link>
  );
});

export default TagBadge;
