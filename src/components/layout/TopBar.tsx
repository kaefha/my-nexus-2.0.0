'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import {
  Bell,
  Search,
  LogOut,
  User,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function TopBar() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/api/dashboard/notifications');
        const data = res.data || [];
        setNotifications(data);
        if (data.length > 0) setHasUnread(true);
      } catch (e) {
        console.error('Error fetching notifications:', e);
      }
    };

    if (user) {
      fetchNotifications();
      
      const handleRefresh = () => fetchNotifications();
      window.addEventListener('refreshNotifications', handleRefresh);
      return () => window.removeEventListener('refreshNotifications', handleRefresh);
    }
  }, [user]);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setHasUnread(false);
    }
  };

  const getRoleLabel = (role: string) => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getUserInitials = (name: string) => {
    if (!name) return 'U';
    const split = name.split(' ');
    if (split.length > 1) return (split[0][0] + split[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="h-16 shrink-0 border-b bg-background flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <SidebarTrigger className="-ml-2" />
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search anything..."
            className="w-full pl-9 bg-muted/50 focus-visible:bg-background"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu onOpenChange={handleOpenChange}>
          <DropdownMenuTrigger render={
            <Button variant="ghost" size="icon" className="relative cursor-pointer hover:bg-muted/50">
              <Bell className="w-5 h-5 text-muted-foreground" />
              {hasUnread && (
                <div className="absolute right-2 top-2 w-2 h-2 bg-destructive rounded-full" />
              )}
            </Button>
          } />
          <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-y-auto">
            <div className="px-4 py-3 border-b flex items-center justify-between sticky top-0 bg-background z-10">
              <p className="text-sm font-semibold">Notifications</p>
              {notifications.length > 0 && (
                <Badge variant="secondary" className="text-xs">{notifications.length} New</Badge>
              )}
            </div>
            
            {notifications.length > 0 ? (
              <div className="flex flex-col">
                {notifications.map((notif) => (
                  <DropdownMenuItem key={notif.id} className="p-0 border-b last:border-0 cursor-pointer">
                    <Link href={notif.link} className="flex flex-col gap-1 p-4 w-full hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm leading-tight text-foreground">{notif.title}</p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {new Date(notif.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {notif.message}
                      </p>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground flex flex-col items-center justify-center">
                <Bell className="w-8 h-8 mb-2 opacity-20" />
                <p>You're all caught up!</p>
                <p className="text-xs mt-1">No new notifications</p>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="h-10 px-2 gap-2 hover:bg-muted/50">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                    {getUserInitials(user?.name || '')}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden sm:flex flex-col">
                  <span className="text-sm font-medium leading-none">{user?.name || 'User'}</span>
                  <span className="text-[10px] text-muted-foreground mt-1">
                    {getRoleLabel(user?.role || 'User')}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-64 shadow-xl">
            <div className="px-2 py-2.5">
              <p className="text-sm font-medium leading-none mb-1">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              <div className="mt-2">
                <Badge variant="secondary" className="text-[10px] uppercase">
                  {getRoleLabel(user?.role || 'User')}
                </Badge>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <Link href="/profile" className="flex items-center w-full gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <Link href="/settings" className="flex items-center w-full gap-2">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={logout} 
              className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
