'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import api from '@/lib/api';
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  ShoppingCart,
  Truck,
  Warehouse,
  ArrowLeftRight,
  Package,
  BarChart3,
  Database,
  Zap,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

const groupedNavigation = [
  {
    group: 'Main',
    items: [
      {
        label: 'Dashboard',
        href: '/',
        icon: LayoutDashboard,
      },
      {
        label: 'Owner Dashboard',
        href: '/owner-dashboard',
        icon: BarChart3,
      },
    ]
  },
  {
    group: 'Transactional',
    items: [
      {
        label: 'Project Management',
        href: '/projects',
        icon: FolderKanban,
        children: [
          { label: 'Project List', href: '/projects' },
          { label: 'Material Requirement', href: '/projects/requirements' },
        ],
      },
      {
        label: 'PR Management',
        href: '/pr',
        icon: FileText,
        children: [
          { label: 'PR List', href: '/pr' },
          { label: 'Approval Queue', href: '/pr/approval' },
          { label: 'Purchase Log', href: '/pr/history' },
        ],
      },

      {
        label: 'Procurement',
        href: '/procurement',
        icon: ShoppingCart,
        children: [
          { label: 'Active POs', href: '/procurement' },
          { label: 'Approval Queue', href: '/procurement/approval' },
          { label: 'PO History', href: '/procurement/history' },
        ],
      },
      {
        label: 'Logistics',
        href: '/logistics',
        icon: Truck,
        children: [
          { label: 'Delivery Tracking', href: '/logistics' },
          { label: 'Shipment History', href: '/logistics/history' },
        ],
      },
      {
        label: 'RFC',
        href: '/rfc',
        icon: FileText,
        children: [
          { label: 'RFC List', href: '/rfc' },
          { label: 'Approval Queue', href: '/rfc/approval' },
        ],
      },
    ]
  },
  {
    group: 'Non-Transactional',
    items: [
      {
        label: 'Warehouse',
        href: '/warehouse',
        icon: Warehouse,
        children: [
          { label: 'Warehouse List', href: '/warehouse' },
          { label: 'Material Receive', href: '/warehouse/receive' },
          { label: 'Material Issue', href: '/warehouse/issue' },
          { label: 'Stock Monitoring', href: '/warehouse/stock' },
        ],
      },
      {
        label: 'Inventory',
        href: '/inventory',
        icon: Package,
        children: [
          { label: 'Material Catalog', href: '/inventory/catalog' },
          { label: 'Stock Balance', href: '/inventory' },
          { label: 'Movement History', href: '/inventory/movements' },
        ],
      },
      {
        label: 'Material Transfer',
        href: '/transfer',
        icon: ArrowLeftRight,
      },
      {
        label: 'Reports',
        href: '/reports',
        icon: BarChart3,
      },
      {
        label: 'Master Data',
        href: '/master-data',
        icon: Database,
        children: [
          { label: 'Materials', href: '/master-data/materials' },
          { label: 'Warehouses', href: '/master-data/warehouses' },
          { label: 'Vendors', href: '/master-data/vendors' },
          { label: 'Users', href: '/master-data/users' },
          { label: 'Terms Configuration', href: '/master-data/terms' },
        ],
      },
    ]
  }
];

function NavCollapsible({ item, pathname, counts }: { item: any, pathname: string, counts: any }) {
  const isItemActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
  const [open, setOpen] = React.useState(isItemActive);

  React.useEffect(() => {
    if (isItemActive) setOpen(true);
  }, [isItemActive]);

  const getBadgeForLabel = (childLabel: string, parentLabel: string) => {
    if (childLabel === 'Approval Queue' && parentLabel === 'PR Management' && counts.rfcApprovals > 0) {
      return <Badge variant="destructive" className="ml-auto h-5 px-1.5 flex items-center justify-center text-[10px]">{counts.rfcApprovals}</Badge>;
    }
    if (childLabel === 'Approval Queue' && parentLabel === 'Procurement' && counts.poApprovals > 0) {
      return <Badge variant="destructive" className="ml-auto h-5 px-1.5 flex items-center justify-center text-[10px]">{counts.poApprovals}</Badge>;
    }
    if (childLabel === 'Delivery Tracking' && counts.pendingLogistics > 0) {
      return <Badge variant="destructive" className="ml-auto h-5 px-1.5 flex items-center justify-center text-[10px]">{counts.pendingLogistics}</Badge>;
    }
    if (childLabel === 'Material Receive' && counts.materialReceives > 0) {
      return <Badge variant="destructive" className="ml-auto h-5 px-1.5 flex items-center justify-center text-[10px]">{counts.materialReceives}</Badge>;
    }
    return null;
  };

  // Check if group itself needs a badge
  const groupHasNotification = () => {
    if (item.label === 'PR Management' && counts.rfcApprovals > 0) return true;
    if (item.label === 'Procurement' && counts.poApprovals > 0) return true;
    if (item.label === 'Logistics' && counts.pendingLogistics > 0) return true;
    if (item.label === 'Warehouse' && counts.materialReceives > 0) return true;
    return false;
  };

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <SidebarMenuButton 
          isActive={isItemActive} 
          tooltip={item.label}
          render={<CollapsibleTrigger />}
        >
          <item.icon />
          <span>{item.label}</span>
          {!open && groupHasNotification() && (
            <div className="w-2 h-2 rounded-full bg-destructive absolute right-10 top-1/2 -translate-y-1/2" />
          )}
          <ChevronRight className={`ml-auto transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
        </SidebarMenuButton>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children?.map((child: any) => (
              <SidebarMenuSubItem key={child.label}>
                <SidebarMenuSubButton 
                  isActive={pathname === child.href}
                  render={<Link href={child.href} />}
                >
                  <span>{child.label}</span>
                  {getBadgeForLabel(child.label, item.label)}
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export default function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [counts, setCounts] = React.useState({ rfcApprovals: 0, poApprovals: 0, materialReceives: 0, pendingLogistics: 0 });

  const filteredNavigation = groupedNavigation.map(group => {
    let filteredItems = group.items;
    
    // Role-based filtering
    const userRole = user?.role?.toUpperCase() || '';
    
    filteredItems = filteredItems.filter(item => {
      // Admin has access to everything
      if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') return true;

      switch (item.label) {
        case 'Project Management':
          return ['SITE_MANAGER', 'PROJECT_MANAGER'].includes(userRole);
        case 'PR Management':
          return ['SITE_MANAGER', 'PROJECT_MANAGER', 'PROCUREMENT', 'OWNER', 'DIREKTUR'].includes(userRole);
        case 'RFC':
          return userRole !== 'OWNER';
        case 'Owner Dashboard':
          return false; // Only Admin sees it (Admin bypasses this switch)
        case 'Procurement':
          return ['PROCUREMENT', 'OWNER', 'DIREKTUR'].includes(userRole);
        case 'Logistics':
          return true; // All roles can view Logistics
        case 'Warehouse':
        case 'Inventory':
        case 'Material Transfer':
          return ['PROCUREMENT', 'OWNER', 'DIREKTUR', 'SITE_MANAGER', 'PROJECT_MANAGER'].includes(userRole);
        case 'Master Data':
          return ['PROCUREMENT'].includes(userRole);
        default:
          return true; // Dashboard, Reports etc
      }
    });

    return {
      ...group,
      items: filteredItems
    };
  }).filter(group => group.items.length > 0);

  React.useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await api.get('/api/notifications/counts');
        if (res.data?.data) setCounts(res.data.data);
      } catch(e) {
        console.error("Failed to fetch notification counts", e);
      }
    };
    fetchCounts();
    
    const handleRefresh = () => fetchCounts();
    window.addEventListener('refreshNotifications', handleRefresh);
    return () => window.removeEventListener('refreshNotifications', handleRefresh);
  }, [pathname]); // Refetch on route change and events

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <Sidebar variant="sidebar" {...props}>
      <SidebarHeader className="border-b h-16 flex justify-center px-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="MAI Logo" className="w-10 h-10 object-contain" />
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-tight text-primary">Gudang Online</h1>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 font-medium max-w-[140px]">MAI Network Inventory App</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {filteredNavigation.map((group) => (
          <SidebarGroup key={group.group} className="mb-2 last:mb-0">
            {group.group !== 'Main' && (
              <SidebarGroupLabel className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {group.group}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const hasChildren = item.children && item.children.length > 0;
                  const isItemActive = isActive(item.href);
                  
                  if (hasChildren) {
                    return <NavCollapsible key={item.label} item={item} pathname={pathname} counts={counts} />;
                  }

                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton 
                        isActive={isItemActive} 
                        tooltip={item.label}
                        render={<Link href={item.href} />}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary border flex items-center justify-center">
                <span className="text-xs font-semibold">
                  {user?.name?.substring(0, 2).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium truncate">{user?.name || 'User'}</span>
                <span className="text-xs text-muted-foreground truncate">{user?.email || ''}</span>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
