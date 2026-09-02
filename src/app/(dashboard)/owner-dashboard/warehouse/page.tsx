'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Warehouse as WarehouseIcon, Search, Box, ArrowRight, Package, Layers
} from 'lucide-react';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';

interface WarehouseData {
  id: string;
  name: string;
  code: string;
  location?: string;
  status: string;
  totalStock: number;
  totalMaterials: number;
}

export default function OwnerWarehouseListPage() {
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/warehouse');
        setWarehouses(res.data?.data || []);
      } catch (error) {
        console.error('Failed to fetch warehouses', error);
      } finally {
        setLoading(false);
      }
    };
    fetchWarehouses();
  }, []);

  const filteredWarehouses = warehouses.filter(w => 
    w.name?.toLowerCase().includes(search.toLowerCase()) || 
    w.code?.toLowerCase().includes(search.toLowerCase()) ||
    w.location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daftar Gudang</h1>
          <p className="text-sm text-muted-foreground mt-1">High-level view of all operational warehouses.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari gudang..."
            className="pl-9 h-10 bg-background border-muted-foreground/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-[85px] bg-muted rounded-[14.4px] animate-pulse" />
          ))}
        </div>
      ) : filteredWarehouses.length > 0 ? (
        <div className="flex flex-col gap-3">
          {filteredWarehouses.map((w) => (
            <Link href={`/owner-dashboard/warehouse/${w.id}`} key={w.id} className="block group">
              <div className="bg-white rounded-[14.4px] px-5 py-3.5 flex flex-row items-center gap-10 shadow-[0px_1px_2px_-1px_rgba(0,0,0,0.1),0px_1px_3px_0px_rgba(0,0,0,0.1),0px_0px_0px_1px_rgba(229,229,229,0.5)] overflow-hidden transition-all duration-300 hover:shadow-md hover:ring-1 hover:ring-primary/40 relative">
                
                {/* Left Column (Info) */}
                <div className="flex flex-col flex-1 min-w-[200px]">
                  <div className="text-[16.2px] font-bold text-[#0a0a0a] truncate leading-[25.2px]">
                    {w.name}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Box className="w-[12.6px] h-[12.6px] text-[#737373]" />
                    <span className="text-[10.8px] font-medium text-[#737373] leading-[14.4px]">{w.code}</span>
                  </div>
                </div>

                {/* Center Columns (Stats) */}
                <div className="flex items-center gap-7 shrink-0">
                  <div className="flex items-center gap-[7.2px]">
                    <div className="bg-blue-500/10 rounded-[7.2px] p-[5.4px]">
                      <Package className="w-[14.4px] h-[14.4px] text-blue-500" />
                    </div>
                    <div className="flex flex-col w-[66.83px]">
                      <span className="text-[10px] font-medium text-[#737373] uppercase tracking-[0.5px] leading-[14.29px]">Total Stok</span>
                      <span className="text-[12.6px] font-semibold text-[#0a0a0a] leading-[18px]">{w.totalStock?.toLocaleString() || 0}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-[7.2px]">
                    <div className="bg-emerald-500/10 rounded-[7.2px] p-[5.4px]">
                      <Layers className="w-[14.4px] h-[14.4px] text-emerald-500" />
                    </div>
                    <div className="flex flex-col w-[79.27px]">
                      <span className="text-[10px] font-medium text-[#737373] uppercase tracking-[0.5px] leading-[14.29px]">SKU Material</span>
                      <span className="text-[12.6px] font-semibold text-[#0a0a0a] leading-[18px]">{w.totalMaterials?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Right Columns (Status & Action) */}
                <div className="flex items-center gap-10 shrink-0 ml-auto">
                  <div className={`border rounded-full px-[9px] py-[1.8px] flex items-center gap-[5.4px] ${w.status?.toLowerCase() === 'inactive' ? 'bg-red-50 border-red-200' : 'bg-[#dcfce7] border-[#b9f8cf]'}`}>
                    <div className={`w-[5.4px] h-[5.4px] opacity-70 rounded-full ${w.status?.toLowerCase() === 'inactive' ? 'bg-red-600' : 'bg-[#008235]'}`}></div>
                    <span className={`text-[10.8px] font-medium leading-[14.4px] capitalize ${w.status?.toLowerCase() === 'inactive' ? 'text-red-600' : 'text-[#008235]'}`}>{w.status || 'Active'}</span>
                  </div>

                  <div className="flex items-center gap-[3.6px] text-[#171717] group-hover:text-primary transition-colors">
                    <span className="text-[10.8px] font-medium leading-[14.4px]">Lihat Detil</span>
                    <ArrowRight className="w-[12.6px] h-[12.6px] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-card border rounded-xl shadow-sm">
          <WarehouseIcon className="w-16 h-16 text-muted-foreground opacity-30 mb-4" />
          <h2 className="text-xl font-bold">Tidak ada gudang ditemukan</h2>
          <p className="text-muted-foreground text-sm mt-1">Gudang yang Anda cari tidak ada di dalam sistem.</p>
        </div>
      )}
    </div>
  );
}
