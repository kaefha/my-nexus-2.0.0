'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Warehouse, MapPin, Search, Package, Box, Layers, BarChart, DollarSign, User, Home, ChevronRight
} from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { MaterialLogModal } from '@/components/warehouse/MaterialLogModal';

export default function OwnerWarehouseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();

  const [warehouse, setWarehouse] = useState<any>(null);
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // States for material log modal
  const [selectedLogMaterial, setSelectedLogMaterial] = useState<any>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch warehouse metadata
        const whRes = await api.get(`/api/warehouse/${id}`);
        setWarehouse(whRes.data?.data);

        // Fetch warehouse stocks
        const stRes = await api.get(`/api/inventory/stocks?warehouseId=${id}`);
        setStocks(stRes.data?.data || []);
      } catch (error) {
        console.error('Failed to fetch data', error);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  const filteredStocks = stocks.filter(s => 
    s.materialName?.toLowerCase().includes(search.toLowerCase()) || 
    s.materialCode?.toLowerCase().includes(search.toLowerCase()) ||
    s.category?.toLowerCase().includes(search.toLowerCase())
  );

  const totalStockQty = stocks.reduce((sum, s) => sum + Number(s.quantity || 0), 0);
  const totalValue = stocks.reduce((sum, s) => sum + Number(s.totalValue || 0), 0);

  const categoryDistribution = stocks.reduce((acc: any, stock: any) => {
    const cat = stock.category || 'Uncategorized';
    if (!acc[cat]) {
      acc[cat] = { count: 0, qty: 0, unit: stock.unit || '' };
    }
    acc[cat].count += 1;
    acc[cat].qty += Number(stock.quantity || 0);
    // If multiple units exist in one category, this just takes the first one found
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-4">
        <div className="h-8 w-32 bg-muted rounded-md mb-4" />
        <div className="h-40 bg-muted rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 bg-muted rounded-xl" />
          <div className="h-24 bg-muted rounded-xl" />
          <div className="h-24 bg-muted rounded-xl" />
        </div>
        <div className="h-64 bg-muted rounded-xl mt-4" />
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Warehouse className="w-16 h-16 text-muted-foreground opacity-50 mb-4" />
        <h2 className="text-xl font-bold">Gudang tidak ditemukan</h2>
        <Button variant="link" onClick={() => router.back()} className="mt-4">
          Kembali ke Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
        <Link href="/owner-dashboard" className="hover:text-foreground transition-colors flex items-center gap-1">
          <Home className="w-4 h-4" />
        </Link>
        <ChevronRight className="w-4 h-4" />
        <Link href="/owner-dashboard/warehouse" className="hover:text-foreground transition-colors">
          Daftar Gudang
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="font-medium text-foreground">{warehouse?.name || 'Detail Gudang'}</span>
      </nav>

      {/* Header Navigation */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-full">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Detail Gudang</h1>
          <p className="text-sm text-muted-foreground">High-level view of warehouse operations and assets.</p>
        </div>
      </div>

      {/* Detil Gudang Unified Header */}
      <div className="bg-card rounded-[14px] py-6 flex flex-col gap-6 shadow-sm ring-1 ring-border relative overflow-hidden">
        <div className="px-8 flex flex-col gap-4 w-full relative z-10">
          <div className="flex flex-col gap-0 w-full">
            <div className="text-foreground font-semibold text-lg leading-7">Detil Gudang</div>
          </div>
          
          <div className="flex flex-col xl:flex-row gap-6 items-start w-full">
            {/* Left Section (Warehouse Info + Categories) */}
            <div className="flex flex-col gap-[17px] flex-1 w-full">
              {/* Warehouse Info */}
              <div className="flex flex-row gap-[19px] items-center w-full">
                <div className="flex flex-col gap-[9px] flex-1">
                  <div className="flex flex-col gap-0">
                    <div className="text-foreground font-medium text-3xl leading-7">{warehouse.name}</div>
                  </div>
                  
                  <div className="flex flex-row flex-wrap gap-x-[21.6px] gap-y-2 items-center w-full min-h-[18px]">
                    <div className="flex flex-row gap-[5.4px] items-center">
                      <Box className="w-[14.4px] h-[14.4px] opacity-70" />
                      <div className="text-foreground/80 font-medium text-[12.6px] leading-[18px]">{warehouse.code}</div>
                    </div>
                    <div className="flex flex-row gap-[5.4px] items-center">
                      <MapPin className="w-[14.4px] h-[14.4px] opacity-70 text-muted-foreground" />
                      <div className="text-muted-foreground font-normal text-[12.6px] leading-[18px]">{warehouse.location || 'Lokasi belum diset'}</div>
                    </div>
                    <div className="flex flex-row gap-[5.4px] items-center">
                      <div className="text-muted-foreground font-normal text-[12.6px] leading-[18px]">PIC:</div>
                    </div>
                    <div className="flex flex-row gap-[5.4px] items-center">
                      <User className="w-[14.4px] h-[14.4px] opacity-70 text-muted-foreground" />
                      <div className="text-muted-foreground font-normal text-[12.6px] leading-[18px] uppercase">{warehouse.picName || warehouse.type || 'MAIN'}</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-row flex-wrap gap-x-[21.6px] gap-y-2 items-center w-full min-h-[18px]">
                    <div className="flex flex-row gap-[5.4px] items-center">
                      <Layers className="w-[14.4px] h-[14.4px] opacity-70" />
                      <div className="text-foreground/80 font-medium text-[12.6px] leading-[18px]">
                        Assigned Project: {warehouse.projects && warehouse.projects.length > 0 ? warehouse.projects.map((p: any) => p.code).join(', ') : 'Belum di-assign ke project'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Category Breakdown (Dynamic Grid) */}
              <div className="flex flex-row gap-4 items-start flex-wrap content-start w-full mt-2">
                {Object.keys(categoryDistribution).length > 0 ? (
                  Object.entries(categoryDistribution).map(([cat, data]: [string, any]) => (
                    <div key={cat} className="bg-card rounded-[14px] py-2 flex flex-col gap-6 ring-1 ring-border shadow-sm w-full sm:w-[197px]">
                      <div className="px-4 flex flex-row gap-3 items-center w-full">
                        <div className="flex flex-col gap-0.5 w-full py-1">
                          <div className="text-muted-foreground font-medium text-sm leading-5 capitalize">{cat.toLowerCase()}</div>
                          <div className="text-foreground font-medium text-lg leading-7 flex items-baseline gap-1.5">
                            {data.qty.toLocaleString()} <span className="text-sm font-medium capitalize">{data.unit || 'SKU'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground py-4 px-2">Belum ada material di gudang ini.</div>
                )}
              </div>
            </div>
            
            {/* Right Section (Total Material & Updates) */}
            <div className="bg-card rounded-[11px] py-5 flex flex-col justify-between ring-1 ring-border shadow-sm w-full xl:w-[200px] shrink-0 h-full min-h-[220px]">
              <div className="px-5 grid grid-cols-1 gap-[3px] w-full">
                <div className="text-foreground font-semibold text-[14.6px] leading-[22.7px]">Total Material</div>
              </div>
              
              <div className="flex flex-col items-center justify-center w-full py-4 relative">
                {/* Simulated Donut Chart using CSS border */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="bg-transparent border-none p-0 outline-none">
                      <div className="w-[122px] h-[122px] rounded-full border-[16px] border-primary/20 border-t-primary flex flex-col items-center justify-center relative shadow-inner cursor-pointer hover:border-primary/30 transition-colors">
                        <div className="text-foreground font-bold text-xl">{totalStockQty.toLocaleString()}</div>
                        <div className="text-muted-foreground text-[10px] leading-tight">Unit Fisik</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      <p>Total: <strong>{totalStockQty.toLocaleString()}</strong> fisik dari <strong>{stocks.length}</strong> jenis material (SKU).</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <div className="px-5 grid grid-cols-1 gap-[1px] w-full mt-2">
                <div className="text-foreground font-semibold text-[14.6px] leading-[22.7px]">Last Update</div>
                <div className="text-muted-foreground font-normal text-[13px] leading-[22.7px]">
                  {stocks.length > 0 && stocks[0].lastUpdated 
                    ? format(new Date(stocks[0].lastUpdated), 'dd MMM yyyy, HH:mm') 
                    : 'Belum ada update'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Materials Table */}
      <Card className="shadow-none border-0 ring-0">
        <CardHeader className="pb-4 px-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" /> Daftar Material
              </CardTitle>
              <CardDescription>Rincian SKU dan stok yang tersedia di dalam gudang ini.</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari material..."
                className="pl-9 h-9 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredStocks.length > 0 ? (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[120px]">Kode SKU</TableHead>
                  <TableHead>Nama Material</TableHead>
                  <TableHead className="w-[150px]">Kategori</TableHead>
                  <TableHead className="w-[150px] text-right">Stok Fisik</TableHead>
                  <TableHead className="w-[180px]">Terakhir Diupdate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStocks.map((stock, i) => (
                  <TableRow 
                    key={i} 
                    className="group hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedLogMaterial(stock);
                      setIsLogModalOpen(true);
                    }}
                  >
                    <TableCell className="font-medium text-muted-foreground">{stock.materialCode}</TableCell>
                    <TableCell className="font-semibold">{stock.materialName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal text-xs">{stock.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold">{stock.quantity.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground ml-1">{stock.unit}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {stock.lastUpdated ? format(new Date(stock.lastUpdated), 'dd MMM yyyy HH:mm') : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-muted-foreground opacity-50" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Gudang Kosong</h3>
              <p className="text-muted-foreground text-sm">Tidak ada material di dalam gudang ini yang sesuai dengan pencarian.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedLogMaterial && (
        <MaterialLogModal
          isOpen={isLogModalOpen}
          onClose={() => setIsLogModalOpen(false)}
          warehouseId={id as string}
          materialId={selectedLogMaterial.materialId}
          materialCode={selectedLogMaterial.materialCode}
          materialName={selectedLogMaterial.materialName}
        />
      )}
    </div>
  );
}
