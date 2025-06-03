
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowBigUp, ArrowBigDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoteButtonsProps {
  initialUpvotes: number;
  initialDownvotes: number;
  itemId: string; // To uniquely identify the item being voted on
  itemType: 'question' | 'answer'; // To distinguish between questions and answers
}

const VoteButtons = React.memo(function VoteButtons({ initialUpvotes, initialDownvotes, itemId, itemType }: VoteButtonsProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [voteStatus, setVoteStatus] = useState<'upvoted' | 'downvoted' | null>(null); // 'upvoted', 'downvoted', or null

  // Persist vote status in localStorage (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedVote = localStorage.getItem(`vote-${itemType}-${itemId}`);
      if (storedVote === 'upvoted' || storedVote === 'downvoted') {
        setVoteStatus(storedVote);
      }
    }
  }, [itemId, itemType]);

  const handleVote = (type: 'upvote' | 'downvote') => {
    let newUpvotes = upvotes;
    let newDownvotes = downvotes;
    let newVoteStatus: typeof voteStatus = null;

    if (type === 'upvote') {
      if (voteStatus === 'upvoted') { // Undo upvote
        newUpvotes--;
        newVoteStatus = null;
      } else {
        newUpvotes++;
        if (voteStatus === 'downvoted') newDownvotes--; // Remove downvote if exists
        newVoteStatus = 'upvoted';
      }
    } else { // downvote
      if (voteStatus === 'downvoted') { // Undo downvote
        newDownvotes--;
        newVoteStatus = null;
      } else {
        newDownvotes++;
        if (voteStatus === 'upvoted') newUpvotes--; // Remove upvote if exists
        newVoteStatus = 'downvoted';
      }
    }

    setUpvotes(newUpvotes);
    setDownvotes(newDownvotes);
    setVoteStatus(newVoteStatus);

    if (typeof window !== 'undefined') {
      if (newVoteStatus) {
        localStorage.setItem(`vote-${itemType}-${itemId}`, newVoteStatus);
      } else {
        localStorage.removeItem(`vote-${itemType}-${itemId}`);
      }
    }

    // Here you would typically send the vote to your backend
    // console.log(`Voted ${type} for ${itemType} ${itemId}. New status: ${newVoteStatus}`);
  };

  const voteCount = upvotes - downvotes;

  return (
    <div className="flex flex-col items-center space-y-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote('upvote')}
        aria-pressed={voteStatus === 'upvoted'}
        className={cn("p-1 h-auto", voteStatus === 'upvoted' ? 'text-primary' : 'text-muted-foreground hover:text-primary/80')}
      >
        <ArrowBigUp size={20} fill={voteStatus === 'upvoted' ? 'currentColor' : 'none'} />
      </Button>
      <span className="font-semibold text-md text-foreground" aria-live="polite">
        {voteCount}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote('downvote')}
        aria-pressed={voteStatus === 'downvoted'}
        className={cn("p-1 h-auto", voteStatus === 'downvoted' ? 'text-destructive' : 'text-muted-foreground hover:text-destructive/80')}
      >
        <ArrowBigDown size={20} fill={voteStatus === 'downvoted' ? 'currentColor' : 'none'} />
      </Button>
    </div>
  );
});

export default VoteButtons;
