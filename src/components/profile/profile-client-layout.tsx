
'use client';

import type { User as UserType } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import QuestionCard from '@/components/question/question-card';
import AnswerCard from '@/components/question/answer-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ArrowRight, Edit, Camera } from 'lucide-react';
import { useEffect, useState, useRef, type ChangeEvent } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProfileData, UserAnswerEntry } from '@/app/profile/[userId]/page';
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';


interface ProfileClientLayoutProps {
  profileData: ProfileData;
}

interface CurrentUser {
  userId: string;
  userName: string;
}

export default function ProfileClientLayout({ profileData }: ProfileClientLayoutProps) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [newAvatarDataUri, setNewAvatarDataUri] = useState<string | null>(null);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserSession = async () => {
      setIsLoadingSession(true);
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const sessionData = await response.json();
          if (sessionData.success && sessionData.user) {
            setCurrentUser(sessionData.user);
          }
        }
      } catch (error) {
        console.error("Error fetching current user session:", error);
      } finally {
        setIsLoadingSession(false);
      }
    };
    fetchUserSession();
  }, []);
  
  const { fetchedUser, userQuestions, userAnswers } = profileData;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setNewAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        setNewAvatarDataUri(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setNewAvatarFile(null);
      setAvatarPreview(null);
      setNewAvatarDataUri(null);
    }
  };

  const handleAvatarUpdate = async () => {
    if (!newAvatarDataUri) {
      toast({ title: "No Image Selected", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    setIsUpdatingAvatar(true);
    try {
      const response = await fetch('/api/users/update-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: newAvatarDataUri }), // Send Data URI
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({ title: "Avatar Updated", description: data.message || "Your profile picture has been updated." });
        setIsAvatarDialogOpen(false);
        setNewAvatarFile(null);
        setAvatarPreview(null);
        setNewAvatarDataUri(null);
        router.refresh(); 
      } else {
        toast({ title: "Update Failed", description: data.message || "Could not update your avatar. The image might be too large or in an unsupported format.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error updating avatar:", error);
      toast({ title: "Update Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const resetDialog = () => {
    setNewAvatarFile(null);
    setAvatarPreview(null);
    setNewAvatarDataUri(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset file input
    }
  };


  if (isLoadingSession) {
     return (
      <div className="space-y-8">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-12 w-1/2 mx-auto" />
        <div className="mt-6 space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.userId === fetchedUser._id;

  const displayUser: UserType = {
    id: fetchedUser._id,
    name: fetchedUser.name,
    avatarUrl: fetchedUser.avatarUrl || `https://placehold.co/128x128.png?text=${fetchedUser.name[0]?.toUpperCase() || 'U'}&data-ai-hint=placeholder+avatar`,
  };

  const initials = displayUser.name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  const memberSince = fetchedUser.createdAt ? new Date(fetchedUser.createdAt).toLocaleDateString() : 'N/A';

  return (
    <div className="space-y-8">
      <Card className="shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-accent h-32 md:h-40" data-ai-hint="abstract banner mountains"></div>
        <CardHeader className="flex flex-col items-center text-center -mt-16 md:-mt-20 relative p-6">
          <AlertDialog open={isAvatarDialogOpen} onOpenChange={(open) => { setIsAvatarDialogOpen(open); if(!open) resetDialog();}}>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                className={`relative rounded-full p-0 h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-lg group ${isOwnProfile ? 'cursor-pointer' : ''}`}
                onClick={() => isOwnProfile && setIsAvatarDialogOpen(true)}
                disabled={!isOwnProfile}
                aria-label={isOwnProfile ? "Change profile picture" : `${displayUser.name}'s profile picture`}
              >
                <Avatar className="h-full w-full">
                  <AvatarImage src={displayUser.avatarUrl} alt={displayUser.name} data-ai-hint="user avatar" />
                  <AvatarFallback className="text-4xl">{initials}</AvatarFallback>
                </Avatar>
                {isOwnProfile && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <Camera size={32} className="text-white" />
                  </div>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Change Profile Picture</AlertDialogTitle>
                <AlertDialogDescription>
                  Select an image file from your device (e.g., .jpg, .png, .gif). Recommended size: 200x200px.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-4 py-4">
                <Label htmlFor="avatar-file">Choose Image</Label>
                <Input 
                  id="avatar-file" 
                  type="file"
                  accept="image/png, image/jpeg, image/gif"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="text-sm"
                />
                {avatarPreview && (
                  <div className="mt-4 border rounded-md p-2 flex justify-center items-center">
                    <Image 
                        src={avatarPreview} 
                        alt="Avatar preview" 
                        width={128} 
                        height={128} 
                        className="rounded-md object-cover" 
                    />
                  </div>
                )}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={resetDialog}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleAvatarUpdate} disabled={isUpdatingAvatar || !newAvatarDataUri}>
                  {isUpdatingAvatar ? "Saving..." : "Save"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <CardTitle className="text-3xl font-bold mt-4">{displayUser.name}</CardTitle>
          <p className="text-muted-foreground">Member since {memberSince}</p>
          <p className="mt-2 max-w-md text-foreground/80">
            Passionate learner and contributor at Knowly. Always eager to help and explore new ideas.
          </p>
        </CardHeader>
      </Card>

      <Tabs defaultValue="questions" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-1/2 mx-auto">
          <TabsTrigger value="questions">My Questions ({userQuestions.length})</TabsTrigger>
          <TabsTrigger value="answers">My Answers ({userAnswers.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="questions" className="mt-6 space-y-6">
          {userQuestions.length > 0 ? (
            userQuestions.map(question => (
              <QuestionCard 
                key={question.id} 
                question={question} 
                showAuthorActions={isOwnProfile}
              />
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {isOwnProfile ? "You haven't asked any questions yet." : `${displayUser.name} hasn't asked any questions yet.`}
            </p>
          )}
        </TabsContent>
        <TabsContent value="answers" className="mt-6 space-y-4">
            {userAnswers.length > 0 ? (
                userAnswers.map((entry: UserAnswerEntry) => (
                    <Card key={entry.answer.id} className="shadow-md">
                        <CardHeader className="pb-2">
                            <p className="text-sm text-muted-foreground">
                                Answered on: <Link href={`/questions/${entry.question.id}`} className="text-primary hover:underline font-medium">{entry.question.title}</Link>
                                <span className="mx-1">&bull;</span>
                                {formatDistanceToNow(new Date(entry.answer.createdAt), { addSuffix: true })}
                            </p>
                        </CardHeader>
                        <CardContent>
                            <AnswerCard answer={entry.answer} questionId={entry.question.id} />
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-end">
                            <Button asChild variant="outline" size="sm">
                                <Link href={`/questions/${entry.question.id}#answer-${entry.answer.id}`}>
                                    View Full Question
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))
            ) : (
                 <p className="text-center text-muted-foreground py-8">
                    {isOwnProfile ? "You haven't answered any questions yet." : `${displayUser.name} hasn't answered any questions yet.`}
                 </p>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

