
import React, { useState } from "react";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  count: number;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ count }) => {
  const [open, setOpen] = useState(false);

  const mockNotifications = [
    {
      id: "1",
      title: "Post Failed",
      message: "Your post to Twitter could not be published.",
      time: "10 minutes ago",
      read: false,
    },
    {
      id: "2",
      title: "AI Suggestion",
      message: "AI has suggested edits for 3 pending posts.",
      time: "1 hour ago",
      read: false,
    },
    {
      id: "3",
      title: "Scheduled Post",
      message: "Your post to LinkedIn has been published.",
      time: "3 hours ago",
      read: true,
    },
  ];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="relative">
        <Bell size={20} className="text-muted-foreground hover:text-foreground transition-colors" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
            {count}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {mockNotifications.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          <>
            {mockNotifications.map((notification) => (
              <DropdownMenuItem 
                key={notification.id}
                className={cn(
                  "flex flex-col items-start py-3 cursor-pointer",
                  !notification.read && "bg-secondary/20"
                )}
              >
                <div className="font-medium text-sm">{notification.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{notification.message}</div>
                <div className="text-xs text-muted-foreground mt-1">{notification.time}</div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center justify-center text-primary text-xs cursor-pointer">
              Mark all as read
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
