
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus, Home, UserCircle, LogIn, UserPlus, LogOut } from 'lucide-react';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
// Logo import removed

interface CurrentUser {
  userId: string;
  userName: string;
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
        const response = await fetch('/api/auth/me');
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
        // Optionally, show a toast if session check fails critically
        // toast({ title: "Session Check Failed", description: "Could not verify your session.", variant: "destructive" });
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUserSession();
  }, [pathname]); // Re-check on path change, or consider removing pathname if not strictly needed for re-fetch

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
      setCurrentUser(null); // Optimistically update UI
      router.push('/login');
      // router.refresh(); // May not be needed if pathname dependency in useEffect handles it
    }
  };
  
  // Optional: Show a loading state for the header or buttons while fetching user
  // if (isLoadingUser) {
  //   return (
  //     <header className="bg-card border-b border-border shadow-sm sticky top-0 z-40">
  //       <div className="container mx-auto px-4 py-3 flex justify-between items-center">
  //         <Link href="/" className="text-2xl font-bold text-primary hover:text-accent transition-colors">
  //           Knowly
  //         </Link>
  //         <div className="flex items-center space-x-2">
  //           <span className="text-sm text-muted-foreground">Loading...</span>
  //           <ThemeToggleButton />
  //         </div>
  //       </div>
  //     </header>
  //   );
  // }

  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-primary hover:text-accent transition-colors" aria-label="Knowly Homepage">
          Knowly
        </Link>
        <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
          <Button variant="ghost" size="sm" asChild className="px-2 sm:px-3">
            <Link href="/" className="flex items-center space-x-1 sm:space-x-2 text-foreground hover:text-accent">
              <Home size={18} />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </Button>
          
          {(currentUser || !isLoadingUser) && ( // Show "Ask Question" if user is loaded (either logged in or not)
             <Button variant="default" size="sm" asChild className="px-2 sm:px-3">
                <Link href="/ask" className="flex items-center space-x-1 sm:space-x-2">
                  <MessageSquarePlus size={18} />
                  <span className="hidden sm:inline">Ask Question</span>
                </Link>
            </Button>
          )}
          
          {!isLoadingUser && currentUser ? (
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Button variant="ghost" size="sm" asChild className="px-2 sm:px-3">
                <Link href={`/profile/${currentUser.userId}`} className="flex items-center space-x-1 sm:space-x-2 text-foreground hover:text-accent">
                  <UserCircle size={18} />
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
          ) : null /* Or a loading spinner/placeholder for auth buttons */}
          <ThemeToggleButton />
        </div>
      </div>
    </header>
  );
}
