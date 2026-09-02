'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Warehouse, MapPin, Search, Package, Box, Layers, BarChart, DollarSign
} from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function OwnerWarehouseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();

  const [warehouse, setWarehouse] = useState<any>(null);
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  const totalValue = stocks.reduce((acc, curr) => acc + (curr.totalValue || 0), 0);
  const totalStockQty = stocks.reduce((acc, curr) => acc + (curr.quantity || 0), 0);

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

      {/* Main Info Card */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-card to-muted/30 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <CardContent className="p-8 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-start gap-5">
              <div className="p-4 bg-primary/10 rounded-2xl shrink-0">
                <Warehouse className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl font-bold tracking-tight">{warehouse.name}</h2>
                  <StatusBadge status={warehouse.status} />
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-medium text-foreground/80">
                    <Box className="w-4 h-4 opacity-70" /> {warehouse.code}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 opacity-70" /> {warehouse.location || 'Lokasi belum diset'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 opacity-70" /> {warehouse.type || 'N/A'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mr-1">Assigned To:</span>
                  {warehouse.projects && warehouse.projects.length > 0 ? (
                    warehouse.projects.map((p: any) => (
                      <Badge key={p.id} variant="secondary" className="px-2 py-0.5 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors">
                        {p.code} - {p.name}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="px-2 py-0.5 text-muted-foreground border-dashed">
                      Belum di-assign ke project
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            {warehouse.evidence && (
              <div className="shrink-0 group relative rounded-xl overflow-hidden shadow-sm border">
                <img 
                  src={warehouse.evidence} 
                  alt="Warehouse" 
                  className="w-40 h-28 object-cover transition-transform group-hover:scale-105 duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-xs font-medium">Foto Gudang</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm border-0 ring-1 ring-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Stok (Fisik)</p>
                <h3 className="text-2xl font-bold mt-1">{totalStockQty.toLocaleString()}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-0 ring-1 ring-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estimasi Valuasi (Rp)</p>
                <h3 className="text-2xl font-bold mt-1 tracking-tight">Rp {totalValue.toLocaleString()}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0 ring-1 ring-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-lg text-orange-500">
                <BarChart className="w-6 h-6" />
              </div>
              <div className="w-full">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-medium text-muted-foreground">Kapasitas (CBM)</p>
                  <span className="text-xs font-bold">{warehouse.capacity ? warehouse.capacity.toLocaleString() : '-'}</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                   <div className="h-full bg-orange-500 rounded-full" style={{ width: warehouse.capacity ? '45%' : '0%' }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Materials Table */}
      <Card className="shadow-sm border-0 ring-1 ring-border/50">
        <CardHeader className="border-b bg-muted/20 pb-4">
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
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[120px]">Kode SKU</TableHead>
                  <TableHead>Nama Material</TableHead>
                  <TableHead className="w-[150px]">Kategori</TableHead>
                  <TableHead className="w-[150px] text-right">Stok Fisik</TableHead>
                  <TableHead className="w-[180px] text-right">Estimasi Nilai (Rp)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStocks.map((stock, i) => (
                  <TableRow key={i} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-muted-foreground">{stock.materialCode}</TableCell>
                    <TableCell className="font-semibold">{stock.materialName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal text-xs">{stock.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-base">{stock.quantity.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground ml-1">{stock.unit}</span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground font-medium">
                      {(stock.totalValue || 0).toLocaleString()}
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
    </div>
  );
}
