
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { PopulatedQuestion } from '@/lib/types';
import QuestionCard from '@/components/question/question-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, AlertTriangle, ArrowUp, Loader2, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { fetchPaginatedQuestions, type FetchQuestionsResult } from '@/app/actions/questionActions';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const QUESTIONS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_DELAY = 500; // 500ms

export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialSearchTerm = searchParams.get('search') || '';
  const [searchTermInput, setSearchTermInput] = useState(initialSearchTerm); // For immediate input display
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialSearchTerm); // For triggering search
  const [currentSearch, setCurrentSearch] = useState(initialSearchTerm); // Actual term used for fetching

  const [questions, setQuestions] = useState<PopulatedQuestion[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [dbConfigured, setDbConfigured] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGoToTop, setShowGoToTop] = useState(false);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastQuestionElementRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && currentPage < totalPages && !isLoading) {
        setCurrentPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, currentPage, totalPages]);

  const loadQuestions = useCallback(async (page: number, search: string, isNewSearch: boolean = false) => {
    if (isNewSearch) {
      setIsInitialLoading(true);
      setQuestions([]); // Clear questions for a new search
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const result: FetchQuestionsResult = await fetchPaginatedQuestions(page, search);
      setDbConfigured(result.dbConfigured);
      if (!result.dbConfigured) {
        console.warn("Database not configured. Please check environment variables MONGODB_URI and MONGODB_DB_NAME.");
      } else if (result.error) {
        setError(result.error);
        console.error("Error fetching questions:", result.error);
      } else {
        setQuestions(prevQuestions => isNewSearch ? result.questions : [...prevQuestions, ...result.questions]);
        setTotalPages(result.totalPages);
      }
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
        setError(errorMessage);
        console.error("Failed to load questions:", e);
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  }, []);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTermInput);
    }, SEARCH_DEBOUNCE_DELAY);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTermInput]);

  // Effect to trigger search when debouncedSearchTerm changes
  useEffect(() => {
    const newSearchTerm = debouncedSearchTerm.trim();
    const params = new URLSearchParams(window.location.search);
    if (newSearchTerm) {
      params.set('search', newSearchTerm);
    } else {
      params.delete('search');
    }
    // Only push to router and update currentSearch if the debounced term actually changes the active search
    if (newSearchTerm !== currentSearch) {
      router.replace(`/?${params.toString()}`, { scroll: false });
      setCurrentSearch(newSearchTerm);
    } else if (!newSearchTerm && currentSearch) { // Handle clearing search
      router.replace(`/?${params.toString()}`, { scroll: false });
      setCurrentSearch('');
    }
  }, [debouncedSearchTerm, router, currentSearch]);


  // Effect to load questions when currentSearch changes (actual search term)
  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 for new search
    loadQuestions(1, currentSearch, true); // isNewSearch = true
  }, [currentSearch, loadQuestions]);

  // Effect to load more questions when currentPage changes (for infinite scroll)
  useEffect(() => {
    // Only load if it's not the initial load for page 1 and not a new search that resets questions
    if (currentPage > 1 && !isInitialLoading) {
      loadQuestions(currentPage, currentSearch, false); // isNewSearch = false
    }
  }, [currentPage, loadQuestions, currentSearch, isInitialLoading]);


  useEffect(() => {
    const handleGoToTopVisibility = () => {
      window.pageYOffset > 300 ? setShowGoToTop(true) : setShowGoToTop(false);
    };
    window.addEventListener('scroll', handleGoToTopVisibility);
    handleGoToTopVisibility();
    return () => {
      window.removeEventListener('scroll', handleGoToTopVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTermInput(e.target.value);
  };

  // Manual search submission (e.g., pressing Enter or search button)
  // This bypasses debounce for immediate action if desired, or can align with debounce
  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newSearchTerm = searchTermInput.trim();
    // Update debounced term immediately to trigger search effect, or directly set currentSearch
    if (newSearchTerm !== currentSearch) {
      setDebouncedSearchTerm(newSearchTerm); // This will trigger the search via useEffect
    } else if (!newSearchTerm && currentSearch) {
      setDebouncedSearchTerm('');
    }
  };


  if (!dbConfigured && isInitialLoading) {
    return (
        <div className="space-y-8 relative">
            <Skeleton className="h-20 w-1/2 mx-auto" />
            <Skeleton className="h-12 w-3/4 mx-auto" />
            <div className="space-y-6 mt-8">
            {[...Array(3)].map((_, i) => (
                <Card key={i} className="shadow-lg">
                <CardHeader>
                    <Skeleton className="h-8 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-2/3" />
                    <div className="mt-3 flex gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-9 w-32 rounded-md" />
                </CardFooter>
                </Card>
            ))}
            </div>
      </div>
    );
  }


  if (!dbConfigured && !isInitialLoading) {
    return (
      <div className="text-center py-12 bg-destructive/10 p-6 rounded-lg max-w-2xl mx-auto">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-destructive">Database Not Configured</h2>
        <p className="text-muted-foreground mt-2">
          The application requires MongoDB connection details (MONGODB_URI and MONGODB_DB_NAME) to be set in environment variables.
          Please configure them to see and post questions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-2">Welcome to Knowly</h1>
        <p className="text-lg text-muted-foreground">
          Your community for sharing knowledge and finding answers.
        </p>
      </div>

      <form onSubmit={handleSearchSubmit} className="flex w-full max-w-2xl mx-auto items-center space-x-2">
        <Input
          type="search"
          name="search"
          placeholder="Search questions by keyword or tag..."
          className="flex-grow"
          value={searchTermInput}
          onChange={handleSearchInputChange}
        />
        <Button type="submit" variant="default">
          <Search className="mr-2 h-4 w-4" /> Search
        </Button>
      </form>

      {currentSearch && !isInitialLoading && (
        <div className="text-center">
          <p className="text-lg text-muted-foreground">
            Showing results for: <span className="font-semibold text-primary">{currentSearch}</span>
          </p>
        </div>
      )}

      {error && (
         <div className="text-center py-12 bg-destructive/10 p-6 rounded-lg">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h2 className="text-2xl font-semibold text-destructive">Error Loading Questions</h2>
          <p className="text-muted-foreground mt-2">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {questions.map((question, index) => {
          if (questions.length === index + 1 && currentPage < totalPages && !isLoading) { // Check all conditions for ref
            return <div ref={lastQuestionElementRef} key={question.id}><QuestionCard question={question} /></div>;
          }
          return <QuestionCard key={question.id} question={question} />;
        })}
      </div>

      {isInitialLoading && dbConfigured && (
        <div className="space-y-6 mt-8">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="shadow-lg">
              <CardHeader>
                <Skeleton className="h-8 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-2/3" />
                <div className="mt-3 flex gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between items-center">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-9 w-32 rounded-md" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {isLoading && !isInitialLoading && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading more questions...</p>
        </div>
      )}

      {!isInitialLoading && !isLoading && questions.length === 0 && dbConfigured && !error && (
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-muted-foreground">
            {currentSearch ? 'No questions found matching your search.' : 'No questions yet!'}
          </h2>
          <p className="text-muted-foreground">
            {currentSearch ? 'Try a different search term or ' : 'Be the first to '}
            <Link href="/ask" className="text-primary hover:underline">ask a question</Link>
            {currentSearch ? '.' : ' and spark a discussion.'}
          </p>
        </div>
      )}

      {showGoToTop && (
        <Button
          onClick={scrollToTop}
          variant="default"
          size="icon"
          className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-50"
          aria-label="Go to top"
        >
          <ArrowUp className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}

// Dummy Card components for Skeleton structure
const Card = ({ className, children }: { className?: string, children: React.ReactNode }) => <div className={cn("rounded-lg border bg-card text-card-foreground", className)}>{children}</div>;
const CardHeader = ({ className, children }: { className?: string, children: React.ReactNode }) => <div className={cn("flex flex-col space-y-1.5 p-6", className)}>{children}</div>;
const CardContent = ({ className, children }: { className?: string, children: React.ReactNode }) => <div className={cn("p-6 pt-0", className)}>{children}</div>;
const CardFooter = ({ className, children }: { className?: string, children: React.ReactNode }) => <div className={cn("flex items-center p-6 pt-0", className)}>{children}</div>;
