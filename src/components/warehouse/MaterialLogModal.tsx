import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import api from '@/lib/api';

interface MaterialLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouseId: string;
  materialId: string;
  materialCode: string;
  materialName: string;
}

export function MaterialLogModal({ isOpen, onClose, warehouseId, materialId, materialCode, materialName }: MaterialLogModalProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && warehouseId && materialId) {
      fetchLogs();
    }
  }, [isOpen, warehouseId, materialId]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // the movements API returns transactions for a specific warehouse and material
      const res = await api.get(`/api/inventory/movements?warehouseId=${warehouseId}&materialId=${materialId}&limit=50`);
      setLogs(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch material logs', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTransactionType = (type: string) => {
    if (!type) return '-';
    // Contoh: "IN_MANUAL_ENTRY" -> "In Manual Entry" -> "Manual Entry" (atau sesuai keinginan)
    const formatted = type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
      
    // Jika ingin lebih rapi:
    if (type === 'IN_MANUAL_ENTRY') return 'Manual Entry (IN)';
    if (type === 'OUT_MANUAL_ENTRY') return 'Manual Entry (OUT)';
    if (type === 'IN_RECEIPT') return 'Goods Receipt';
    if (type === 'OUT_ISSUE') return 'Goods Issue';
    
    return formatted;
  };

  const getTransactionTypeColor = (type: string) => {
    if (type.startsWith('IN')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    if (type.startsWith('OUT')) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    if (type === 'ADJUSTMENT') return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    if (type === 'RETURN') return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1000px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Riwayat Transaksi Material</DialogTitle>
          <DialogDescription>
            Menampilkan riwayat pergerakan (log) untuk material <strong className="text-foreground">{materialCode} - {materialName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto mt-4">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada riwayat transaksi untuk material ini.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>Referensi</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {format(new Date(log.createdAt), 'dd MMM yyyy, HH:mm', { locale: id })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-medium ${getTransactionTypeColor(log.transactionType)}`}>
                        {formatTransactionType(log.transactionType)}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${log.quantity > 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                      {log.quantity > 0 ? '+' : ''}{log.quantity}
                    </TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate" title={log.referenceId || '-'}>
                      {log.referenceId || '-'}
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate" title={log.notes || '-'}>
                      {log.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
