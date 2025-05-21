import React, { useEffect, useState } from 'react';
import * as apiService from '@/services/apiService';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle } from 'lucide-react';

interface CategoryUser {
  id: number;
  name: string | null;
  username?: string | null;
}

interface Category {
  id: number;
  name: string;
  description: string | null;
  user_id: number;
  created_at: string;
  updated_at: string;
  user: CategoryUser; // Информация о создателе
  // active_users_count?: number; // Для будущего расширения
}

const CategoriesPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        variant: "destructive",
        title: "Failed to load categories",
        description: "Could not fetch the list of categories. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Category name cannot be empty.",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await apiService.createCategory({
        name: newCategoryName,
        description: newCategoryDescription || undefined,
      });
      setCategories(prev => [response.data, ...prev]); // Add to the beginning of the list
      toast({
        title: "Category created",
        description: `Category "${response.data.name}" has been successfully created.`,
      });
      setNewCategoryName('');
      setNewCategoryDescription('');
      setIsAddDialogOpen(false);
    } catch (error: any) {
      console.error('Error creating category:', error);
      toast({
        variant: "destructive",
        title: "Failed to create category",
        description: error.response?.data?.message || "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="container mx-auto p-4 text-center text-white">
        <p>Please log in to view and create categories.</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Chat Rooms</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-rulet-purple hover:bg-rulet-purple-dark">
              <PlusCircle className="mr-2 h-5 w-5" /> Add New Room
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-rulet-dark text-white border-rulet-chat-outline">
            <DialogHeader>
              <DialogTitle>Create a new chat room</DialogTitle>
              <DialogDescription>
                Fill in the details for your new chat room. Make it interesting!
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddCategory}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="name" className="text-right">
                    Name
                  </label>
                  <Input
                    id="name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="col-span-3 bg-rulet-input border-rulet-chat-outline focus:ring-rulet-purple"
                    placeholder="e.g., Music Lovers, Flirting Fun"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="description" className="text-right">
                    Description
                  </label>
                  <Textarea
                    id="description"
                    value={newCategoryDescription}
                    onChange={(e) => setNewCategoryDescription(e.target.value)}
                    className="col-span-3 bg-rulet-input border-rulet-chat-outline focus:ring-rulet-purple"
                    placeholder="A short description of what this room is about (optional)"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-rulet-purple hover:bg-rulet-purple-dark" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Room"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, index) => (
                <Card key={index} className="bg-rulet-chat-bg border-rulet-chat-outline animate-pulse">
                    <CardHeader>
                        <div className="h-6 bg-gray-600 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-700 rounded w-1/2 mt-1"></div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                        <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                    </CardContent>
                    <CardFooter>
                        <div className="h-4 bg-gray-600 rounded w-1/3"></div>
                    </CardFooter>
                </Card>
            ))}
        </div>
      ) : categories.length === 0 ? (
        <p className="text-center text-gray-400">No chat rooms available yet. Why not create one?</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Card key={category.id} className="bg-rulet-chat-bg border-rulet-chat-outline text-white flex flex-col justify-between hover:shadow-lg hover:shadow-rulet-purple/30 transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl text-rulet-purple">{category.name}</CardTitle>
                <CardDescription className="text-gray-400">
                  Created by: {category.user.username || category.user.name || 'Unknown User'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300">
                  {category.description || 'No description provided.'}
                </p>
              </CardContent>
              <CardFooter className="flex justify-between items-center">
                {/* <p className="text-xs text-gray-500">0 people chatting</p>  Placeholder for active users */}
                <Button variant="outline" className="border-rulet-purple text-rulet-purple hover:bg-rulet-purple hover:text-white">
                  Join Room
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoriesPage; 