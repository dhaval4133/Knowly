
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus, Home, UserCircle, LogIn, UserPlus, LogOut } from 'lucide-react';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CurrentUser {
  userId: string;
  userName: string;
  avatarUrl?: string;
  bookmarkedQuestionIds?: string[];
}

export default function Header() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

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
        console.error("Error fetching user session:", error);
        setCurrentUser(null);
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUserSession();
  }, [pathname]);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Logged Out',
          description: data.message || 'You have been successfully logged out.',
        });
      } else {
        toast({
          title: 'Logout Failed',
          description: data.message || 'Could not log you out. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'Logout Error',
        description: 'An unexpected error occurred during logout.',
        variant: 'destructive',
      });
    } finally {
      setCurrentUser(null);
      router.push('/login');
      router.refresh();
    }
  };

  const userInitials = currentUser?.userName.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="flex flex-col group" aria-label="Knowly Homepage">
          <span className="text-2xl font-bold text-primary group-hover:text-accent transition-colors">
            Knowly
          </span>
          <span className="text-xs text-muted-foreground group-hover:text-accent transition-colors -mt-1">
            Ask. Answer. Achieve.
          </span>
        </Link>
        <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
          <Button variant="ghost" size="sm" asChild className="px-2 sm:px-3">
            <Link href="/" className="flex items-center space-x-1 sm:space-x-2 text-foreground hover:text-accent">
              <Home size={18} />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </Button>

          {!isLoadingUser && currentUser && (
             <Button variant="default" size="sm" asChild className="px-2 sm:px-3">
                <Link href="/ask" className="flex items-center space-x-1 sm:space-x-2">
                  <MessageSquarePlus size={18} />
                  <span className="hidden sm:inline">Ask Question</span>
                </Link>
            </Button>
          )}

          {!isLoadingUser && currentUser ? (
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Button variant="ghost" size="sm" asChild className="px-2 sm:px-3 h-auto py-1">
                <Link href={`/profile/${currentUser.userId}`} className="flex items-center space-x-1 sm:space-x-2 text-foreground hover:text-accent">
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                    <AvatarImage src={currentUser.avatarUrl} alt={currentUser.userName} data-ai-hint="user avatar" />
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{currentUser.userName}</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout} className="px-2 sm:px-3">
                <LogOut size={16} className="sm:mr-1" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          ) : !isLoadingUser && !currentUser ? (
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Button variant="outline" size="sm" asChild className="px-2 sm:px-3">
                <Link href="/login" className="flex items-center space-x-1 sm:space-x-2">
                  <LogIn size={16} />
                  <span className="hidden sm:inline">Login</span>
                </Link>
              </Button>
              <Button variant="default" size="sm" asChild className="px-2 sm:px-3">
                 <Link href="/register" className="flex items-center space-x-1 sm:space-x-2">
                  <UserPlus size={16} />
                  <span className="hidden sm:inline">Register</span>
                </Link>
              </Button>
            </div>
          ) : null }
          <ThemeToggleButton />
        </div>
      </div>
    </header>
  );
}
