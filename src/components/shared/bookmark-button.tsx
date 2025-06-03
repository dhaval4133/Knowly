
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bookmark } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
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

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLocalIsBookmarked(!localIsBookmarked);
          toast({
            title: successText,
            description: data.message,
          });
          router.refresh();
        } else {
          // API returned success status but operation failed (e.g., already bookmarked when trying to bookmark again)
          toast({
            title: failureText,
            description: data.message || "An error occurred with the bookmark operation.",
            variant: 'destructive',
          });
          // Optionally, re-sync localIsBookmarked if data.isBookmarked is provided
          if (typeof data.isBookmarked === 'boolean') {
            setLocalIsBookmarked(data.isBookmarked);
          }
        }
      } else {
        // Handle non-ok responses (e.g., 400, 401, 404, 500)
        let errorMessage = `API request failed with status ${response.status}.`;
        try {
            // Try to get a more specific error message if the server sent one (even if not JSON)
            const errorData = await response.text();
            // If errorData is short and not HTML, it might be a useful message
            if (errorData && errorData.length < 200 && !errorData.trim().startsWith("<!DOCTYPE")) {
                errorMessage = errorData;
            } else if (response.status === 401) {
                errorMessage = "Unauthorized. Please log in again.";
                router.push('/login');
            }
        } catch (e) {
            // Ignore if parsing error text fails
        }
        toast({
          title: failureText,
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error(`${actionText} error:`, error);
      toast({
        title: "Error",
        description: `An unexpected error occurred while ${actionText.toLowerCase()}. Check console for details.`,
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
