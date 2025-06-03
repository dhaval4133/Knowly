
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bookmark } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation'; // Import useRouter
import { cn } from '@/lib/utils';

interface CurrentUser {
  userId: string;
  userName: string;
}

interface BookmarkButtonProps {
  questionId: string;
  isInitiallyBookmarked: boolean;
}

export default function BookmarkButton({ questionId, isInitiallyBookmarked }: BookmarkButtonProps) {
  const [localIsBookmarked, setLocalIsBookmarked] = useState(isInitiallyBookmarked);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setLocalIsBookmarked(isInitiallyBookmarked);
  }, [isInitiallyBookmarked]);

  useEffect(() => {
    const fetchUserSession = async () => {
      setIsLoadingUser(true);
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setCurrentUser(data.user);
          } else {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error("Error fetching user session for BookmarkButton:", error);
        setCurrentUser(null);
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchUserSession();
  }, []);


  const handleBookmarkToggle = async () => {
    if (isLoadingUser || !currentUser) {
      toast({
        title: "Please Log In",
        description: "You need to be logged in to bookmark questions.",
        variant: "destructive",
      });
      router.push('/login');
      return;
    }

    setIsLoading(true);
    const endpoint = localIsBookmarked ? '/api/questions/unbookmark' : '/api/questions/bookmark';
    const actionText = localIsBookmarked ? 'Unbookmarking' : 'Bookmarking';
    const successText = localIsBookmarked ? 'Question unbookmarked' : 'Question bookmarked';
    const failureText = localIsBookmarked ? 'Failed to unbookmark' : 'Failed to bookmark';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setLocalIsBookmarked(!localIsBookmarked); // Update local state on successful API call
        toast({
          title: successText,
          description: data.message,
        });
        router.refresh(); // Refresh to update data across the app (e.g., profile page)
      } else {
        toast({
          title: failureText,
          description: data.message || "An error occurred.",
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error(`${actionText} error:`, error);
      toast({
        title: "Error",
        description: `An unexpected error occurred while ${actionText.toLowerCase()}.`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingUser) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
        <Bookmark className="h-5 w-5" />
      </Button>
    );
  }
  
  // Do not render if user is not logged in, after loading check
  if (!currentUser) {
    return null; 
  }


  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleBookmarkToggle}
      disabled={isLoading}
      className={cn("h-8 w-8", localIsBookmarked ? "text-primary hover:text-primary/80" : "text-muted-foreground hover:text-primary/70")}
      aria-pressed={localIsBookmarked}
      aria-label={localIsBookmarked ? "Unbookmark question" : "Bookmark question"}
    >
      <Bookmark className="h-5 w-5" fill={localIsBookmarked ? 'currentColor' : 'none'} />
    </Button>
  );
}
