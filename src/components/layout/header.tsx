import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus, Home, UserCircle } from 'lucide-react';

export default function Header() {
  // Mock authentication state
  const isLoggedIn = false; 
  const userName = "MockUser"; // Replace with actual user data

  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-primary hover:text-accent transition-colors">
          Knowly
        </Link>
        <nav className="flex items-center space-x-4">
          <Button variant="ghost" asChild>
            <Link href="/" className="flex items-center space-x-2 text-foreground hover:text-accent">
              <Home size={20} />
              <span>Home</span>
            </Link>
          </Button>
          <Button variant="default" asChild>
            <Link href="/ask" className="flex items-center space-x-2">
              <MessageSquarePlus size={20} />
              <span>Ask Question</span>
            </Link>
          </Button>
          {isLoggedIn ? (
            <div className="flex items-center space-x-4">
              <Button variant="ghost" asChild>
                <Link href="/profile/mock-user-id" className="flex items-center space-x-2 text-foreground hover:text-accent">
                  <UserCircle size={20} />
                  <span>{userName}</span>
                </Link>
              </Button>
              {/* Add Logout Button Here */}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="outline" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button variant="default" asChild>
                <Link href="/register">Register</Link>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
