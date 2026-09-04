'use client';

import { useEffect, useState } from 'react';
import {
  Package,
  Warehouse as WarehouseIcon,
  Layers,
  ArrowRight
} from 'lucide-react';
import api from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { GlobalMaterialDistributionModal } from './GlobalMaterialDistributionModal';

interface OwnerData {
  totalWarehouses: number;
  totalMaterialTypes: number;
  totalMaterialStock: number;
  recentWarehouses: any[];
  recentMaterials: any[];
}

export default function OwnerDashboard() {
  const [data, setData] = useState<OwnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);

  useEffect(() => {
    const fetchOwnerDashboard = async () => {
      try {
        const res = await api.get('/api/dashboard/owner');
        setData(res.data?.data);
      } catch (error) {
        console.error('Failed to fetch owner dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOwnerDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-72 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const kpiCards = data ? [
    {
      title: 'Total Gudang',
      value: data.totalWarehouses,
      icon: WarehouseIcon,
      isPrimary: true,
      href: '/owner-dashboard/warehouse'
    },
    {
      title: 'Total Material (Fisik)',
      value: data.totalMaterialStock.toLocaleString(),
      icon: Package,
    },
    {
      title: 'Total Jenis Material (SKU)',
      value: data.totalMaterialTypes.toLocaleString(),
      icon: Layers,
      onClick: () => setIsMaterialModalOpen(true)
    },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="animate-fade-in flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Owner Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            High-level overview of warehouses and material inventory.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          const isClickable = !!card.onClick;
          const CardInner = (
            <Card 
              className={cn("animate-fade-in transition-all hover:shadow-md h-full", card.isPrimary && "border-primary/40 bg-primary/5", isClickable && "cursor-pointer")} 
              style={{ animationDelay: `${index * 80}ms` }}
              onClick={card.onClick}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={cn("text-lg font-medium", card.isPrimary ? "text-primary font-bold" : "text-foreground font-semibold")}>
                  {card.title}
                </CardTitle>
                <div className={cn("w-10 h-10 rounded-md flex items-center justify-center shrink-0", card.isPrimary ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")}>
                  <Icon className="w-5 h-5" />
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className={cn("font-bold tracking-tight", card.isPrimary ? "text-4xl text-primary" : "text-4xl text-foreground")}>{card.value}</div>
                {card.href && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-primary font-medium group cursor-pointer hover:underline">
                    Lihat List Gudang <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
                {!card.href && isClickable && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-primary font-medium group cursor-pointer hover:underline">
                    Lihat Detil Material <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </CardContent>
            </Card>
          );

          return card.href ? (
            <Link href={card.href} key={card.title} className="block">
              {CardInner}
            </Link>
          ) : (
            <div key={card.title}>{CardInner}</div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Recent Warehouses Activity */}
        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <WarehouseIcon className="w-4 h-4 text-primary" />
              <CardTitle className="text-base font-semibold">Recent Gudang Aktif</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="[&_[data-slot=table-container]]:border-0 [&_[data-slot=table-container]]: [&_[data-slot=table-container]]:bg-transparent">
            {data?.recentWarehouses && data.recentWarehouses.length > 0 ? (
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Gudang</TableHead>
                    <TableHead className="text-right">Aktivitas Terakhir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentWarehouses.map((wh) => (
                    <TableRow key={wh.id}>
                      <TableCell className="font-medium">
                        <Link href={`/owner-dashboard/warehouse/${wh.id}`} className="hover:underline text-primary">
                          {wh.name}
                        </Link>
                        <div className="text-[10px] text-muted-foreground font-normal">{wh.location}</div>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatDate(wh.lastActivity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Belum ada aktivitas gudang</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Materials Activity */}
        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <CardTitle className="text-base font-semibold">Recent Material Aktif</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="[&_[data-slot=table-container]]:border-0 [&_[data-slot=table-container]]: [&_[data-slot=table-container]]:bg-transparent">
            {data?.recentMaterials && data.recentMaterials.length > 0 ? (
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Aktivitas Terakhir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentMaterials.map((mat) => (
                    <TableRow key={mat.id}>
                      <TableCell className="font-medium">
                        {mat.name}
                        <div className="text-[10px] text-muted-foreground font-normal">{mat.code}</div>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatDate(mat.lastActivity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Belum ada aktivitas material</p>
            )}
          </CardContent>
        </Card>
      </div>

      <GlobalMaterialDistributionModal 
        isOpen={isMaterialModalOpen} 
        onClose={() => setIsMaterialModalOpen(false)} 
      />
    </div>
  );
}
