
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus, Home, UserCircle, LogIn, UserPlus, LogOut } from 'lucide-react';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

interface CurrentUser {
  userId: string;
  userName: string;
  avatarUrl?: string;
  bookmarkedQuestionIds?: string[];
  bio?: string; // Added bio field
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
  }, [pathname]); // Re-fetch on pathname change

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
      setCurrentUser(null); // Clear local user state immediately
      router.push('/login'); // Redirect to login
      // No need for router.refresh() typically if /api/auth/me is called on navigation
      // or if subsequent pages also check auth status.
      // However, if other parts of the layout depend on this state, a refresh might be wanted.
      // For now, direct navigation to /login and local state clearing is primary.
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

          {isLoadingUser ? (
            <>
              <Skeleton className="h-9 w-9 rounded-full sm:hidden" /> {/* Avatar placeholder for mobile */}
              <Skeleton className="h-9 w-[70px] rounded-md sm:w-[80px]" /> {/* Profile/Login placeholder */}
              <Skeleton className="h-9 w-[90px] rounded-md sm:w-[100px]" /> {/* Ask/Register placeholder */}
            </>
          ) : currentUser ? (
            // User is logged in
            <>
              <Button variant="outline" size="sm" asChild className="px-2 sm:px-3">
                <Link href={`/profile/${currentUser.userId}`} className="flex items-center space-x-1 sm:space-x-2">
                  <Avatar className="h-6 w-6">
                      <AvatarImage src={currentUser.avatarUrl} alt={currentUser.userName} data-ai-hint="user avatar"/>
                      <AvatarFallback>{userInitials.substring(0,1)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">Profile</span>
                </Link>
              </Button>

              <Button variant="default" size="sm" asChild className="px-2 sm:px-3">
                  <Link href="/ask" className="flex items-center space-x-1 sm:space-x-2">
                    <MessageSquarePlus size={16} />
                    <span className="hidden sm:inline">Ask Question</span>
                  </Link>
              </Button>

              <Button variant="default" size="sm" onClick={handleLogout} className="px-2 sm:px-3">
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </>
          ) : (
            // User is not logged in
            <>
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
            </>
          )}
          <ThemeToggleButton />
        </div>
      </div>
    </header>
  );
}
