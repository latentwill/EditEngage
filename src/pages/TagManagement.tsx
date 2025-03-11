
import React, { useState } from "react";
import Header from "@/components/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui-extensions/Button";
import { Tag } from "@/types/post";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit2, Trash2, Check, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const mockTags: Tag[] = [
  { id: "1", name: "marketing", color: "#ADD8E6" },
  { id: "2", name: "product-launch", color: "#FFD700" },
  { id: "3", name: "hiring", color: "#98FB98" },
  { id: "4", name: "careers", color: "#FFA07A" },
  { id: "5", name: "events", color: "#DDA0DD" },
  { id: "6", name: "company-news", color: "#87CEFA" },
];

const TagManagement = () => {
  const [tags, setTags] = useState<Tag[]>(mockTags);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");
  const [deleteTagId, setDeleteTagId] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");

  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditTag = (tag: Tag) => {
    setEditingTagId(tag.id);
    setEditingTagName(tag.name);
  };

  const saveTagEdit = () => {
    if (!editingTagName.trim()) return;
    
    setTags(tags.map(tag => 
      tag.id === editingTagId ? { ...tag, name: editingTagName } : tag
    ));
    setEditingTagId(null);
    setEditingTagName("");
  };

  const cancelTagEdit = () => {
    setEditingTagId(null);
    setEditingTagName("");
  };

  const confirmDeleteTag = () => {
    if (deleteTagId) {
      setTags(tags.filter(tag => tag.id !== deleteTagId));
      setDeleteTagId(null);
    }
  };

  const addNewTag = () => {
    if (!newTagName.trim()) return;
    
    const randomColor = () => {
      const colors = ["#ADD8E6", "#FFD700", "#98FB98", "#FFA07A", "#DDA0DD", "#87CEFA"];
      return colors[Math.floor(Math.random() * colors.length)];
    };
    
    const newTag: Tag = {
      id: `tag-${Date.now()}`,
      name: newTagName,
      color: randomColor(),
    };
    
    setTags([...tags, newTag]);
    setNewTagName("");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#E6E0F5] to-[#F9F5F8]">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 mt-16">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Tag Management</h1>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-border/50 p-6">
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Search tags..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="New tag name..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="w-full md:w-auto"
              />
              <Button 
                variant="primary" 
                onClick={addNewTag} 
                disabled={!newTagName.trim()}
                className="flex items-center gap-2"
              >
                <Plus size={16} />
                Add Tag
              </Button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-4 font-medium text-sm">Tag</th>
                  <th className="text-left py-3 px-4 font-medium text-sm">Color</th>
                  <th className="text-left py-3 px-4 font-medium text-sm">Posts</th>
                  <th className="text-right py-3 px-4 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTags.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground">
                      No tags found
                    </td>
                  </tr>
                ) : (
                  filteredTags.map(tag => (
                    <tr key={tag.id} className="border-b border-border/50 hover:bg-secondary/10">
                      <td className="py-3 px-4">
                        {editingTagId === tag.id ? (
                          <Input 
                            value={editingTagName} 
                            onChange={(e) => setEditingTagName(e.target.value)}
                            autoFocus
                            className="w-full max-w-xs"
                          />
                        ) : (
                          <Badge style={{ backgroundColor: tag.color }} className="text-xs">
                            {tag.name}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-6 h-6 rounded-md" style={{ backgroundColor: tag.color }}></div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {/* Mocked post count */}
                        {Math.floor(Math.random() * 20)} posts
                      </td>
                      <td className="py-3 px-4 text-right">
                        {editingTagId === tag.id ? (
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={cancelTagEdit}
                              className="h-8 w-8 p-0"
                            >
                              <X size={16} />
                            </Button>
                            <Button 
                              variant="primary" 
                              size="sm" 
                              onClick={saveTagEdit}
                              className="h-8 w-8 p-0"
                              disabled={!editingTagName.trim()}
                            >
                              <Check size={16} />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleEditTag(tag)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 size={16} />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setDeleteTagId(tag.id)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      
      <AlertDialog open={!!deleteTagId} onOpenChange={() => setDeleteTagId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this tag? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteTag}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TagManagement;
