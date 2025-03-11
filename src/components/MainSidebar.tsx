
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  BarChart3, 
  TagIcon, 
  Users, 
  Settings, 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui-extensions/Button";

interface MainSidebarProps {
  collapsed: boolean;
  toggleCollapsed: () => void;
}

const MainSidebar: React.FC<MainSidebarProps> = ({ collapsed, toggleCollapsed }) => {
  const location = useLocation();
  
  const navigationItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Analytics", path: "/analytics", icon: BarChart3 },
    { name: "Tags", path: "/tags", icon: TagIcon },
    { name: "Connections", path: "/connections", icon: Users },
  ];

  return (
    <div className={cn(
      "h-screen bg-sidebar fixed left-0 top-0 z-40 flex flex-col border-r border-border/50 transition-all duration-300 pt-16",
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
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon size={20} className={cn("flex-shrink-0", collapsed ? "mx-auto" : "mr-3")} />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="p-3 border-t border-border/50">
        <Button 
          variant="subtle" 
          size="sm" 
          className="w-full justify-center"
          onClick={toggleCollapsed}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span className="ml-2">Collapse</span>}
        </Button>
      </div>
    </div>
  );
};

export default MainSidebar;
