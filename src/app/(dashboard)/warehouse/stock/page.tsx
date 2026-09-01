'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Layers, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { DataTablePagination } from '@/components/shared/DataTablePagination';

interface Stock {
  id: string;
  warehouseName: string;
  warehouseCode: string;
  materialCode: string;
  materialName: string;
  category: string;
  quantity: number;
  lastUpdated: string;
}

export default function StockMonitoringPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchStocks();
      setPage(1);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [search, selectedWarehouse]);

  const fetchWarehouses = async () => {
    try {
      const { data } = await api.get('/api/warehouse');
      setWarehouses(data.data || []);
    } catch (error) {
      console.error('Failed to fetch warehouses', error);
    }
  };

  const fetchStocks = async () => {
    setLoading(true);
    try {
      const warehouseQuery = selectedWarehouse !== 'ALL' ? `&warehouseId=${selectedWarehouse}` : '';
      const { data } = await api.get(`/api/inventory/stocks?search=${search}${warehouseQuery}&limit=5000`);
      setStocks(data.data || []);
    } catch (error) {
      console.error('Failed to fetch stocks', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Monitoring</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor real-time inventory levels across all warehouse locations.
          </p>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative w-full sm:w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search material or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-full sm:w-[250px]">
          <Select value={selectedWarehouse} onValueChange={(val) => setSelectedWarehouse(val || "")}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Warehouse" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Warehouses</SelectItem>
              {warehouses.map(w => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading stock data...</p>
          </div>
        ) : stocks.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Material Code</TableHead>
                  <TableHead>Material Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stocks.slice((page - 1) * pageSize, page * pageSize).map((stock, i) => (
                  <TableRow key={`${stock.id}-${i}`}>
                    <TableCell className="font-medium">{stock.warehouseName}</TableCell>
                    <TableCell>{stock.materialCode || '-'}</TableCell>
                    <TableCell>{stock.materialName}</TableCell>
                    <TableCell>{stock.category || '-'}</TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {stock.quantity}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {stock.lastUpdated ? formatDate(stock.lastUpdated) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <DataTablePagination 
              totalItems={stocks.length} 
              pageSize={pageSize} 
              currentPage={page} 
              onPageChange={setPage} 
              onPageSizeChange={setPageSize} 
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Layers className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No stocks found</h2>
            <p className="text-muted-foreground max-w-md">
              There is no stock matching your current filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
