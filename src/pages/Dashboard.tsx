
import React, { useState } from "react";
import Header from "@/components/Header";
import PostFeed from "@/components/PostFeed";
import Sidebar from "@/components/Sidebar";
import MainSidebar from "@/components/MainSidebar";
import { AIMode } from "@/types/ai";
import { Button } from "@/components/ui-extensions/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusIcon, Settings, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import NotificationBell from "@/components/NotificationBell";
import AIToggle from "@/components/AIToggle";

const Dashboard = () => {
  const [aiMode, setAIMode] = useState<AIMode>("human");
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#E6E0F5] to-[#F9F5F8]">
      <Header />
      
      <MainSidebar 
        collapsed={sidebarCollapsed} 
        toggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-14' : 'ml-52'} mt-16`}>
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center mb-6 bg-white/60 p-3 rounded-lg shadow-sm">
            <div className="relative flex-1 mr-4">
              <Input 
                className="pl-10 pr-4 py-2 w-full bg-white" 
                placeholder="Search posts or prompt AI..."
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
            </div>
            <div className="flex items-center space-x-4">
              <NotificationBell count={3} />
              <AIToggle mode={aiMode} onModeChange={setAIMode} />
              <Button variant="primary" className="flex items-center gap-2">
                <PlusIcon size={16} />
                New Post
              </Button>
            </div>
          </div>
          
          <Tabs defaultValue="pending">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="denied">Denied</TabsTrigger>
              </TabsList>
              <Button variant="subtle" className="flex items-center gap-2">
                <Settings size={16} />
                Filters
              </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                <TabsContent value="pending" className="mt-0">
                  <PostFeed 
                    status="pending" 
                    aiMode={aiMode} 
                    onEditWithAI={() => setShowSidebar(true)} 
                  />
                </TabsContent>
                <TabsContent value="scheduled" className="mt-0">
                  <PostFeed 
                    status="scheduled" 
                    aiMode={aiMode} 
                    onEditWithAI={() => setShowSidebar(true)} 
                  />
                </TabsContent>
                <TabsContent value="approved" className="mt-0">
                  <PostFeed 
                    status="approved" 
                    aiMode={aiMode} 
                    onEditWithAI={() => setShowSidebar(true)} 
                  />
                </TabsContent>
                <TabsContent value="denied" className="mt-0">
                  <PostFeed 
                    status="denied" 
                    aiMode={aiMode} 
                    onEditWithAI={() => setShowSidebar(true)} 
                  />
                </TabsContent>
              </div>
              
              {showSidebar && (
                <div className="lg:col-span-1">
                  <Sidebar onClose={() => setShowSidebar(false)} />
                </div>
              )}
            </div>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
