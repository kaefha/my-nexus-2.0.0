'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Package, MapPin } from 'lucide-react';
import api from '@/lib/api';

interface GlobalMaterialDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalMaterialDistributionModal({ isOpen, onClose }: GlobalMaterialDistributionModalProps) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchGlobalStocks();
    }
  }, [isOpen]);

  const fetchGlobalStocks = async () => {
    try {
      setLoading(true);
      // Fetches all stocks across all warehouses
      const res = await api.get('/api/inventory/stocks');
      const stocks = res.data?.data || [];
      
      // Group stocks by materialCode
      const grouped = stocks.reduce((acc: any, stock: any) => {
        const code = stock.materialCode;
        if (!acc[code]) {
          acc[code] = {
            materialCode: code,
            materialName: stock.materialName,
            category: stock.category,
            totalQuantity: 0,
            unit: stock.unit,
            warehouses: []
          };
        }
        acc[code].totalQuantity += Number(stock.quantity || 0);
        acc[code].warehouses.push({
          warehouseName: stock.warehouseName,
          quantity: Number(stock.quantity || 0)
        });
        return acc;
      }, {});

      setMaterials(Object.values(grouped));
    } catch (error) {
      console.error('Failed to fetch global stocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMaterials = materials.filter((m) => 
    m.materialName.toLowerCase().includes(search.toLowerCase()) || 
    m.materialCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-[95vw] max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Lokasi Material
            </DialogTitle>
            <DialogDescription>
              Lihat daftar material yang tersedia dan rincian lokasinya di setiap gudang.
            </DialogDescription>
          </DialogHeader>

          <div className="relative mt-4 mb-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari material..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto relative min-h-[300px]">
          {loading ? (
            <div className="p-8 flex flex-col items-center justify-center space-y-4">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Memuat data distribusi material...</p>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Tidak ada material yang ditemukan.
            </div>
          ) : (
            <div className="px-6 pb-6">
              <Table className="[&_tr]:border-none" containerClassName="border rounded-xl bg-transparent shadow-none overflow-hidden">
                <TableHeader className="bg-muted/30 sticky top-0 backdrop-blur-sm z-10 border-b">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="w-[120px] pl-4">Kode SKU</TableHead>
                    <TableHead>Nama Material</TableHead>
                    <TableHead className="w-[120px]">Kategori</TableHead>
                    <TableHead className="text-right w-[150px]">Total Stok</TableHead>
                    <TableHead className="w-[250px] pr-4">Lokasi Gudang</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.map((mat, idx) => (
                    <TableRow key={idx} className="border-none hover:bg-muted/30">
                      <TableCell className="font-medium text-muted-foreground pl-4">{mat.materialCode}</TableCell>
                      <TableCell className="font-semibold">{mat.materialName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal border-border bg-transparent shadow-none rounded-full px-2 py-0.5">{mat.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-base">{mat.totalQuantity.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground ml-1">{mat.unit}</span>
                      </TableCell>
                      <TableCell className="pr-4">
                        <div className="flex flex-col gap-1.5">
                          {mat.warehouses.map((wh: any, i: number) => (
                            <div key={i} className="flex items-center justify-between text-xs bg-muted/20 p-1.5 rounded-md border border-border/60 shadow-none h-[28px]">
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <MapPin className="w-3.5 h-3.5" /> {wh.warehouseName}
                              </span>
                              <span className="font-bold text-foreground">{wh.quantity.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
