'use client';

import { useEffect, useState } from 'react';
import { Package, Search, ArrowDownRight, ArrowUpRight, History, ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/api/inventory/stock-balance', { params: { search, limit: 50 } });
        setInventory(data.data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, [search]);

  const handleViewLogs = async (item: any) => {
    setSelectedStock(item);
    setIsLogsOpen(true);
    setLogsLoading(true);
    try {
      const { data } = await api.get('/api/inventory/movements', { 
        params: { materialId: item.materialId, warehouseId: item.warehouseId, limit: 100 } 
      });
      setLogs(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLogsLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'IN': return <ArrowDownToLine className="w-4 h-4 text-emerald-500" />;
      case 'OUT': return <ArrowUpFromLine className="w-4 h-4 text-red-500" />;
      default: return <ArrowRightLeft className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'IN': return <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">Goods In</Badge>;
      case 'OUT': return <Badge variant="outline" className="text-red-600 bg-red-50 border-red-200">Goods Out</Badge>;
      case 'TRANSFER': return <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200">Transfer</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold">Stock Balance</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Current inventory levels across all warehouses</p>
      </div>

      <div className="relative max-w-md animate-fade-in" style={{ animationDelay: '100ms' }}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" placeholder="Search material..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-10 pr-4 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-x-auto animate-fade-in" style={{ animationDelay: '200ms' }}>
        <table className="w-full whitespace-nowrap">
          <thead><tr className="border-b border-border bg-secondary/30">
            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Material</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Code</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Warehouse</th>
            <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Available</th>
            <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Reserved</th>
            <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Minimum</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
            <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Action</th>
          </tr></thead>
          <tbody>
            {loading ? [...Array(8)].map((_, i) => (
              <tr key={i} className="border-b border-border">{[...Array(8)].map((_, j) => (
                <td key={j} className="px-4 py-4"><div className="h-4 bg-secondary rounded shimmer" /></td>
              ))}</tr>
            )) : inventory.map((item) => {
              const isLow = item.availableStock <= item.minimumStock;
              return (
                <tr key={item.id} className="border-b border-border hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{item.material?.materialName}</p>
                    <p className="text-xs text-muted-foreground">{item.material?.unit}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{item.material?.materialCode}</td>
                  <td className="px-4 py-3 text-sm">{item.warehouse?.warehouseName}</td>
                  <td className={cn("px-4 py-3 text-sm font-semibold text-right", isLow ? "text-red-400" : "text-emerald-400")}>{item.availableStock.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-amber-400">{item.reservedStock.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-muted-foreground">{item.minimumStock.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {isLow ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400 border border-red-500/30">
                        <ArrowDownRight className="w-3 h-3" /> Low
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <ArrowUpRight className="w-3 h-3" /> OK
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleViewLogs(item)}>
                      <History className="w-4 h-4 mr-2" /> Logs
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && inventory.length === 0 && (
          <div className="text-center py-16"><Package className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" /><p className="text-muted-foreground">No inventory data</p></div>
        )}
      </div>

      <Dialog open={isLogsOpen} onOpenChange={setIsLogsOpen}>
        <DialogContent className="sm:max-w-7xl w-[95vw] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Material Movement Logs</DialogTitle>
            <DialogDescription>
              {selectedStock?.material?.materialName} ({selectedStock?.material?.materialCode}) at {selectedStock?.warehouse?.warehouseName}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto mt-4">
            {logsLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : logs.length > 0 ? (
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow className="bg-secondary/30">
                    <TableHead className="w-[180px]">Date</TableHead>
                    <TableHead className="w-[120px]">Type</TableHead>
                    <TableHead className="w-[100px] text-right">Quantity</TableHead>
                    <TableHead className="w-[200px]">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((tx) => (
                    <TableRow key={tx.id} className="hover:bg-muted/30">
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(tx.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(tx.transactionType)}
                          {getTransactionBadge(tx.transactionType)}
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${tx.transactionType === 'IN' ? 'text-emerald-500' : tx.transactionType === 'OUT' ? 'text-red-500' : ''}`}>
                        {tx.transactionType === 'IN' ? '+' : tx.transactionType === 'OUT' ? '-' : ''}
                        {tx.quantity} {selectedStock?.material?.unit}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm truncate max-w-[200px]" title={tx.notes || '-'}>
                        {tx.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-16 bg-card border rounded-xl">
                <ArrowRightLeft className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No recent transactions found.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
