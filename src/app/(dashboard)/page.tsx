'use client';

import { useEffect, useState } from 'react';
import {
  Package,
  FolderKanban,
  FileText,
  ShoppingCart,
  Truck,
  AlertTriangle,
  Warehouse as WarehouseIcon,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Wallet,
} from 'lucide-react';
import api from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import StatusBadge from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import OwnerDashboard from '@/components/dashboard/OwnerDashboard';

interface KPIData {
  totalMaterials: number;
  activeProjects: number;
  pendingRfc: number;
  activePo: number;
  onDelivery: number;
  pendingTransfers: number;
  totalWarehouses: number;
  totalAssetValue?: number;
}

interface Activity {
  recentRfcs: any[];
  recentPos: any[];
  recentMovements: any[];
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [activities, setActivities] = useState<Activity | null>(null);
  const [warehouseData, setWarehouseData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const [kpiRes, lowStockRes, activitiesRes, warehouseRes] = await Promise.all([
        api.get('/api/dashboard/overview'),
        api.get('/api/dashboard/low-stock'),
        api.get('/api/dashboard/activities'),
        api.get('/api/dashboard/warehouses'),
      ]);
      setKpi(kpiRes.data);
      setLowStock(lowStockRes.data);
      setActivities(activitiesRes.data);
      setWarehouseData(warehouseRes.data);
    } catch (error) {
      // Fallback dummy data for UI preview
      setKpi({
        totalMaterials: 156, activeProjects: 12, pendingRfc: 3,
        activePo: 8, onDelivery: 5, pendingTransfers: 4, totalWarehouses: 3,
        totalAssetValue: 4520000000
      });
      setLowStock([
        { materialName: 'Joint Closure 48 Core', warehouseName: 'Warehouse Medan', availableStock: 18, minimumStock: 20, unit: 'PCS' }
      ]);
      setActivities({
        recentRfcs: [{ id: 1, rfcNumber: 'RFC-DEMO-001', status: 'WAITING_APPROVAL', updatedAt: new Date(), project: { projectName: 'Demo Project' } }],
        recentPos: [],
        recentMovements: [{ id: 1, movementType: 'IN', quantity: 150, date: new Date(), material: { materialName: 'Fiber Optic', unit: 'Meter' }, warehouse: { warehouseName: 'Medan' } }]
      });
      setWarehouseData([
        { id: 1, name: 'Warehouse Medan', location: 'Sumatera Utara', totalItems: 45, totalStock: 12500 },
        { id: 2, name: 'Warehouse Sibolga', location: 'Sumatera Utara', totalItems: 28, totalStock: 8400 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const kpiCards = kpi ? [
    {
      title: 'Total Nilai Material',
      value: `Rp ${Number(kpi.totalAssetValue || 0).toLocaleString('id-ID')}`,
      icon: Wallet,
      change: 'Valuasi Aset Real-time',
      changePositive: true,
      isPrimary: true
    },
    {
      title: 'Total Materials',
      value: kpi.totalMaterials,
      icon: Package,
      change: '+12%',
      changePositive: true,
    },
    {
      title: 'Active Projects',
      value: kpi.activeProjects,
      icon: FolderKanban,
      change: '+3',
      changePositive: true,
    },
    {
      title: 'Pending RFC',
      value: kpi.pendingRfc,
      icon: FileText,
      change: kpi.pendingRfc > 0 ? 'Needs attention' : 'All clear',
      changePositive: kpi.pendingRfc === 0,
    },
    {
      title: 'Active PO',
      value: kpi.activePo,
      icon: ShoppingCart,
      change: `${kpi.activePo} ongoing`,
      changePositive: true,
    },
    {
      title: 'Low Stock Alerts',
      value: lowStock.length,
      icon: AlertTriangle,
      change: lowStock.length > 0 ? 'Check warehouse' : 'Stock OK',
      changePositive: lowStock.length === 0,
    },
  ] : [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-72 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (user?.role === 'OWNER') {
    return <OwnerDashboard />;
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Overview of your network inventory operations and asset valuations
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className={cn("animate-fade-in transition-all hover:shadow-md", card.isPrimary && "border-primary/40 bg-primary/5")} style={{ animationDelay: `${index * 80}ms` }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={cn("text-sm font-medium", card.isPrimary ? "text-primary font-semibold" : "text-muted-foreground")}>
                  {card.title}
                </CardTitle>
                <div className={cn("w-8 h-8 rounded-md flex items-center justify-center", card.isPrimary ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")}>
                  <Icon className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={cn("font-bold tracking-tight", card.isPrimary ? "text-2xl text-primary" : "text-2xl")}>{card.value}</div>
                <div className="flex items-center gap-1 mt-1">
                  {card.changePositive ? (
                    <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-destructive" />
                  )}
                  <p className={cn("text-xs", card.changePositive ? "text-emerald-500" : "text-destructive")}>
                    {card.change}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent RFC Activity */}
        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <CardTitle className="text-base font-semibold">Recent RFC Activity</CardTitle>
            </div>
            <Link href="/rfc">
              <Button variant="link" className="text-xs h-auto p-0">
                View all &rarr;
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="[&_table]:border-0 [&_table]: [&_table]:bg-transparent">
            {activities?.recentRfcs && activities.recentRfcs.length > 0 ? (
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">RFC Number</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[150px] text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.recentRfcs.map((rfc) => (
                    <TableRow key={rfc.id}>
                      <TableCell className="font-medium">
                        {rfc.rfcNumber}
                        <div className="text-[10px] text-muted-foreground font-normal">{rfc.project?.projectName}</div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={rfc.status} />
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatDate(rfc.updatedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No recent RFC activity</p>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <CardTitle className="text-base font-semibold">Low Stock Alerts</CardTitle>
            </div>
            <Link href="/inventory">
              <Button variant="link" className="text-xs h-auto p-0">
                View all &rarr;
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {lowStock.length > 0 ? (
              <div className="space-y-4">
                {lowStock.map((item, i) => (
                  <div key={i} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">{item.materialName}</p>
                      <p className="text-xs text-muted-foreground">{item.warehouseName}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive">
                        {Number(item.availableStock).toLocaleString()} {item.unit}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Min: {Number(item.minimumStock).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">All stock levels are healthy</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Warehouse Overview */}
        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <WarehouseIcon className="w-4 h-4 text-primary" />
              <CardTitle className="text-base font-semibold">Warehouse Overview</CardTitle>
            </div>
            <Link href="/warehouse">
              <Button variant="link" className="text-xs h-auto p-0">
                Manage &rarr;
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {warehouseData.length > 0 ? (
              <div className="space-y-3">
                {warehouseData.map((wh) => (
                  <div key={wh.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/40">
                    <div>
                      <p className="text-sm font-medium">{wh.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        {wh.location}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{wh.totalItems} items</p>
                      <p className="text-xs text-muted-foreground">{wh.totalStock.toLocaleString()} total stock</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No warehouses found</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Stock Movements */}
        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <CardTitle className="text-base font-semibold">Recent Movements</CardTitle>
            </div>
            <Link href="/inventory/movements">
              <Button variant="link" className="text-xs h-auto p-0">
                View all &rarr;
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="[&_[data-slot=table-container]]:border-0 [&_[data-slot=table-container]]: [&_[data-slot=table-container]]:bg-transparent">
            {activities?.recentMovements && activities.recentMovements.length > 0 ? (
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Material</TableHead>
                    <TableHead className="w-[100px] text-right">Qty</TableHead>
                    <TableHead className="w-[150px] text-right hidden sm:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.recentMovements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{movement.material?.materialName}</div>
                        <div className="text-[10px] text-muted-foreground">{movement.warehouse?.warehouseName}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={movement.movementType === 'IN' ? 'secondary' : 'destructive'} className={movement.movementType === 'IN' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : ''}>
                          {movement.movementType === 'IN' ? '+' : '-'}{Number(movement.quantity || 0).toLocaleString()} {movement.material?.unit}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground hidden sm:table-cell">
                        {formatDate(movement.date)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No recent movements</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
