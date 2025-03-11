
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  BarChart3, 
  TagIcon,
  Plug,
  Settings, 
  User,
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
      "h-screen bg-[#F0E6FF] fixed left-0 top-0 z-40 flex flex-col border-r border-border/50 transition-all duration-300 pt-16",
      collapsed ? "w-[4.5rem]" : "w-64"
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
                    ? "bg-[#9b87f5]/20 text-[#6E59A5]" 
                    : "text-[#7E69AB] hover:bg-[#9b87f5]/10 hover:text-[#6E59A5]"
                )}
              >
                <item.icon size={20} className={cn("flex-shrink-0", collapsed ? "mx-auto" : "mr-3")} />
                {!collapsed && <span className="truncate text-xs">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="p-3 border-t border-[#D6BCFA]/30">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="subtle" 
              size="sm" 
              className="w-full justify-between text-xs"
            >
              <div className="flex items-center">
                <User size={18} className={cn(collapsed ? "mx-auto" : "mr-2")} />
                {!collapsed && <span>Profile</span>}
              </div>
              {!collapsed && <ChevronRight size={16} />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <User size={16} className="mr-2" />
              <span>Profile</span>
            </DropdownMenuItem>
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
          className="w-full justify-center mt-2"
          onClick={toggleCollapsed}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span className="ml-2 text-xs">Collapse</span>}
        </Button>
      </div>
    </div>
  );
};

export default MainSidebar;
