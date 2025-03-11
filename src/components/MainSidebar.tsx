
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  BarChart3, 
  TagIcon,
  Plug,
  Settings, 
  LogOut,
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui-extensions/Button";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MainSidebarProps {
  collapsed: boolean;
  toggleCollapsed: () => void;
}

const MainSidebar: React.FC<MainSidebarProps> = ({ collapsed, toggleCollapsed }) => {
  const location = useLocation();
  const { signOut } = useAuth();
  
  const navigationItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Analytics", path: "/analytics", icon: BarChart3 },
    { name: "Tags", path: "/tags", icon: TagIcon },
    { name: "Connections", path: "/connections", icon: Plug },
  ];

  return (
    <div className={cn(
      "h-screen bg-[#E6E0F5] fixed left-0 top-0 z-40 flex flex-col border-r border-purple-200/50 transition-all duration-300 pt-16",
      collapsed ? "w-14" : "w-52"
    )}>
      <div className="flex-1 overflow-y-auto p-3">
        <nav className="space-y-1">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center px-3 py-2 rounded-md transition-colors group",
                  isActive 
                    ? "bg-purple-500/50 text-purple-900" 
                    : "text-purple-800/80 hover:bg-purple-500/30 hover:text-purple-900"
                )}
              >
                <item.icon size={20} className={cn("flex-shrink-0", collapsed ? "mx-auto" : "mr-3")} />
                {!collapsed && <span className="truncate text-xs">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="p-3 border-t border-purple-200/50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="subtle" 
              size="sm" 
              className="w-full text-xs bg-purple-500/30 text-purple-900 hover:bg-purple-500/50"
            >
              <div className="flex items-center justify-center w-full">
                <Settings size={20} className={cn(collapsed ? "mx-auto" : "mr-3")} />
                {!collapsed && <span>Settings</span>}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <Settings size={16} className="mr-2" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-red-600" onClick={() => signOut()}>
              <LogOut size={16} className="mr-2" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button 
          variant="subtle" 
          size="sm" 
          className="w-full justify-center mt-2 bg-purple-500/30 text-purple-900 hover:bg-purple-500/50"
          onClick={toggleCollapsed}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </Button>
      </div>
    </div>
  );
};

export default MainSidebar;
