
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
// import { useRouter } from 'next/navigation'; // For future delete/edit navigation

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
  const { toast } = useToast();
  // const router = useRouter(); // For future delete/edit navigation

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
    // Placeholder for edit functionality
    // router.push(`/questions/${questionId}/edit`);
    toast({ title: "Edit Clicked (Not Implemented)", description: "Editing this question is not yet implemented." });
  };

  const handleDelete = async () => {
    // Placeholder for delete functionality
    // Add confirmation dialog here
    // const confirmed = confirm("Are you sure you want to delete this question?");
    // if (confirmed) {
    //   try {
    //     // Call delete API
    //     toast({ title: "Question Deleted (Not Implemented)", description: "This question would be deleted." });
    //     // router.push('/'); // Or to another appropriate page
    //     // router.refresh();
    //   } catch (error) {
    //     toast({ title: "Error Deleting Question", variant: "destructive" });
    //   }
    // }
    toast({ title: "Delete Clicked (Not Implemented)", description: "Deleting this question is not yet implemented." });
  };

  if (isLoadingUser) {
    return null; // Or a small loader
  }

  if (currentUser && currentUser.userId === questionAuthorId) {
    return (
      <div className="flex items-center space-x-2 ml-auto">
        <Button variant="outline" size="sm" onClick={handleEdit} aria-label="Edit question">
          <Pencil className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Edit</span>
        </Button>
        <Button variant="destructive" size="sm" onClick={handleDelete} aria-label="Delete question">
          <Trash2 className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Delete</span>
        </Button>
      </div>
    );
  }

  return null;
}
