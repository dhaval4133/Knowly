
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus, Home, UserCircle, LogIn, UserPlus, LogOut } from 'lucide-react';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface CurrentUser {
  userId: string;
  userName: string;
}

export default function Header() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // This effect runs on the client after hydration
    // and whenever the pathname changes.
    const storedUser = localStorage.getItem('knowlyUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.userId && parsedUser.userName) {
          setCurrentUser(parsedUser);
        } else {
          localStorage.removeItem('knowlyUser'); // Clear invalid item
          setCurrentUser(null);
        }
      } catch (error) {
        console.error("Error parsing user from localStorage", error);
        localStorage.removeItem('knowlyUser'); // Clear corrupted item
        setCurrentUser(null);
      }
    } else {
      setCurrentUser(null);
    }
  }, [pathname]); // Re-check on path change

  const handleLogout = () => {
    localStorage.removeItem('knowlyUser');
    setCurrentUser(null);
    router.push('/login');
    router.refresh(); // Helps ensure UI updates fully
  };

  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-primary hover:text-accent transition-colors">
          Knowly
        </Link>
        <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
          <Button variant="ghost" size="sm" asChild className="px-2 sm:px-3">
            <Link href="/" className="flex items-center space-x-1 sm:space-x-2 text-foreground hover:text-accent">
              <Home size={18} />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </Button>
          {currentUser && (
            <Button variant="default" size="sm" asChild className="px-2 sm:px-3">
              <Link href="/ask" className="flex items-center space-x-1 sm:space-x-2">
                <MessageSquarePlus size={18} />
                <span className="hidden sm:inline">Ask Question</span>
              </Link>
            </Button>
          )}
          
          {currentUser ? (
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
          ) : (
            <div className="flex items-center space-x-1 sm:space-x-2">
               <Button variant="default" size="sm" asChild className="px-2 sm:px-3">
                 <Link href="/ask" className="flex items-center space-x-1 sm:space-x-2">
                   <MessageSquarePlus size={18} />
                   <span className="hidden sm:inline">Ask Question</span>
                 </Link>
              </Button>
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
          )}
          <ThemeToggleButton />
        </div>
      </div>
    </header>
  );
}
