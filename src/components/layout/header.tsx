
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus, Home, UserCircle, LogIn, UserPlus } from 'lucide-react';
import { ThemeToggleButton } from '@/components/theme-toggle-button';

export default function Header() {
  // Mock authentication state
  const isLoggedIn = false; 
  const userName = "MockUser"; // Replace with actual user data

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
          <Button variant="default" size="sm" asChild className="px-2 sm:px-3">
            <Link href="/ask" className="flex items-center space-x-1 sm:space-x-2">
              <MessageSquarePlus size={18} />
              <span className="hidden sm:inline">Ask Question</span>
            </Link>
          </Button>
          
          {isLoggedIn ? (
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Button variant="ghost" size="sm" asChild className="px-2 sm:px-3">
                <Link href="/profile/mock-user-id" className="flex items-center space-x-1 sm:space-x-2 text-foreground hover:text-accent">
                  <UserCircle size={18} />
                  <span className="hidden sm:inline">{userName}</span>
                </Link>
              </Button>
              {/* Add Logout Button Here, e.g., <Button variant="outline" size="sm">Logout</Button> */}
            </div>
          ) : (
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Button variant="outline" size="sm" asChild className="px-2 sm:px-3">
                <Link href="/login" className="flex items-center space-x-1 sm:space-x-2">
                  <LogIn size={16} className="sm:hidden" />
                  <span className="hidden sm:inline">Login</span>
                </Link>
              </Button>
              <Button variant="default" size="sm" asChild className="px-2 sm:px-3">
                 <Link href="/register" className="flex items-center space-x-1 sm:space-x-2">
                  <UserPlus size={16} className="sm:hidden" />
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
