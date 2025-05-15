
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card'; // Removed CardHeader, CardTitle
import { Badge } from '@/components/ui/badge';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { suggestTags, type SuggestTagsInput } from '@/ai/flows/suggest-tags';
import { useToast } from '@/hooks/use-toast';

export default function QuestionForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleAddTag = (tagValue: string) => {
    const newTag = tagValue.trim().toLowerCase(); // Standardize tags to lowercase
    if (newTag && !tags.includes(newTag) && tags.length < 5) {
      setTags([...tags, newTag]);
    }
    setTagsInput('');
  };

  const handleTagsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.endsWith(',') || value.endsWith(' ')) {
      handleAddTag(value.slice(0, -1));
    } else {
      setTagsInput(value);
    }
  };
  
  const handleTagsInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagsInput.trim()) {
      e.preventDefault();
      handleAddTag(tagsInput);
    } else if (e.key === 'Backspace' && !tagsInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSuggestTags = async () => {
    if (!title.trim() || !description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a title and description before suggesting tags.",
        variant: "destructive",
      });
      return;
    }
    setIsSuggestingTags(true);
    try {
      const input: SuggestTagsInput = { title, description };
      const result = await suggestTags(input);
      if (result.tags && result.tags.length > 0) {
        const newSuggestedTags = result.tags
          .map(tag => tag.toLowerCase()) // Standardize suggested tags
          .filter(suggestedTag => !tags.includes(suggestedTag));
        setTags(prevTags => [...prevTags, ...newSuggestedTags].slice(0, 5));
        toast({
          title: "Tags Suggested!",
          description: "AI has suggested some tags for your question.",
        });
      } else {
        toast({
          title: "No New Tags Suggested",
          description: "AI couldn't find additional relevant tags.",
        });
      }
    } catch (error) {
      console.error("Error suggesting tags:", error);
      toast({
        title: "Error Suggesting Tags",
        description: "An error occurred while trying to suggest tags. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSuggestingTags(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || tags.length === 0) {
      toast({
        title: "Incomplete Form",
        description: "Please fill in the title, description, and add at least one tag.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/questions/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, description, tags }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.questionId) {
        toast({
          title: "Question Posted!",
          description: data.message || "Your question has been successfully posted.",
        });
        setTitle('');
        setDescription('');
        setTagsInput('');
        setTags([]);
        // Redirect to the new question page or homepage
        router.push(`/questions/${data.questionId}`); 
        router.refresh(); // To ensure homepage and profile update if navigated to next
      } else {
        toast({
          title: "Submission Failed",
          description: data.message || "Could not post your question. Please try again.",
          variant: "destructive",
        });
        if (response.status === 401) { // If unauthorized, redirect to login
            router.push('/login');
        }
      }
    } catch (error) {
      console.error("Error submitting question:", error);
      toast({
        title: "Submission Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6 pt-6">
          <div>
            <Label htmlFor="title" className="text-lg font-medium">Title</Label>
            <p className="text-sm text-muted-foreground mb-2">Be specific and imagine you’re asking a question to another person.</p>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. How do I center a div in CSS?"
              required
              className="text-base"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-lg font-medium">Description</Label>
            <p className="text-sm text-muted-foreground mb-2">Include all the information someone would need to answer your question. Use Markdown for formatting.</p>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your problem in detail..."
              required
              rows={8}
              className="text-base"
            />
          </div>

          <div>
            <Label htmlFor="tags" className="text-lg font-medium">Tags</Label>
            <p className="text-sm text-muted-foreground mb-2">Add up to 5 tags to describe what your question is about. Press Enter, space, or comma to add a tag.</p>
            <div className="flex flex-wrap items-center gap-2 p-2 border border-input rounded-md min-h-[40px]">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="py-1 px-2 text-sm">
                  {tag}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1 p-0"
                    onClick={() => handleRemoveTag(tag)}
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X size={12} />
                  </Button>
                </Badge>
              ))}
              <Input
                id="tags-input"
                value={tagsInput}
                onChange={handleTagsInputChange}
                onKeyDown={handleTagsInputKeyDown}
                placeholder={tags.length < 5 ? "Add a tag..." : "Max 5 tags reached"}
                disabled={tags.length >= 5}
                className="flex-grow border-none shadow-none focus-visible:ring-0 p-0 h-auto text-base"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSuggestTags}
              disabled={isSuggestingTags || !title || !description}
              className="mt-2"
            >
              {isSuggestingTags ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Suggest Tags with AI
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" size="lg" className="w-full md:w-auto" disabled={isSubmitting || !title || !description || tags.length === 0}>
            {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting...</>) : 'Post Your Question'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
