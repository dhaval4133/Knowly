
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CurrentUser {
  userId: string;
  userName: string;
}

interface QuestionActionsProps {
  questionAuthorId: string;
  questionId: string;
}

export default function QuestionActions({ questionAuthorId, questionId }: QuestionActionsProps) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

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
        console.error("Error fetching user session for QuestionActions:", error);
        setCurrentUser(null);
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchUserSession();
  }, []);

  const handleEdit = () => {
    router.push(`/questions/${questionId}/edit`);
  };

  const handleDeleteQuestion = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/questions/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Question Deleted",
          description: data.message || "The question has been successfully deleted.",
        });
        router.push('/'); 
        router.refresh(); 
      } else {
        toast({
          title: "Error Deleting Question",
          description: data.message || "Could not delete the question. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting question:", error);
      toast({
        title: "Deletion Error",
        description: "An unexpected error occurred while deleting the question.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoadingUser) {
    return null; 
  }

  if (currentUser && currentUser.userId === questionAuthorId) {
    return (
      <div className="flex items-center space-x-2 ml-auto">
        <Button variant="outline" size="sm" onClick={handleEdit} aria-label="Edit question">
          <Pencil className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Edit</span>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" aria-label="Delete question">
              <Trash2 className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this question and all its answers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteQuestion} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                {isDeleting ? "Deleting..." : "Yes, delete question"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return null;
}
