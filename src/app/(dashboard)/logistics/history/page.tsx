'use client';

import { useEffect, useState } from 'react';
import { Search, Eye, Loader2, Package, CheckCircle2, MapPin, Trash2, MoreHorizontal } from 'lucide-react';
import api from '@/lib/api';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataTablePagination } from '@/components/shared/DataTablePagination';
import { useAuth } from '@/hooks/useAuth';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export default function LogisticsHistoryPage() {
 const [selectedDO, setSelectedDO] = useState<any>(null);
 const [dos, setDos] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [warehouses, setWarehouses] = useState<any[]>([]);
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { user } = useAuth();
  
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const fetchDOs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/logistics', { params: { search, type: 'history', limit: 5000 } });
      setDos(data.data || []);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };

  const fetchWarehouses = async () => {
    try {
      const { data } = await api.get('/api/warehouse', { params: { limit: 100 } });
      setWarehouses(data.data || []);
    } catch (e) {
      console.error('Failed to fetch Warehouses', e);
    }
  };

  useEffect(() => {
    fetchDOs();
    fetchWarehouses();
    setPage(1);
  }, [search]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this completed Delivery Order? All associated records and evidence will be permanently deleted.')) return;
    try {
      await api.delete(`/api/logistics/${id}`);
      toast.success('Delivery Order deleted successfully');
      fetchDOs();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete Delivery Order');
    }
  };

 return (
 <div className="space-y-6">
 <div className="animate-fade-in">
        <h1 className="text-2xl font-bold">Shipment History</h1>
 <p className="text-sm text-muted-foreground mt-0.5">View completed delivery orders and evidences</p>
      </div>

      <div className="flex gap-4 items-center animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
 <Input 
 type="search" 
 placeholder="Search DO number, project, PO..." 
 value={search} 
 onChange={(e) => setSearch(e.target.value)}
 className="pl-9"
 />
        </div>
      </div>

 <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
 {loading ? (
 <div className="p-8 text-center flex flex-col items-center bg-card border rounded-xl ">
 <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
 <p className="text-muted-foreground">Loading shipment history...</p>
 </div>
 ) : dos.length > 0 ? (
 <>
 <Table className="whitespace-nowrap">
 <TableHeader>
 <TableRow>
  <TableHead className="w-[150px]">DO Number</TableHead>
  <TableHead className="w-[200px]">Origin</TableHead>
  <TableHead className="w-[200px]">Destination</TableHead>
  <TableHead className="w-[250px]">End-to-End Ref</TableHead>
  <TableHead className="w-[100px]">Items</TableHead>
  <TableHead className="w-[150px]">Shipping Date</TableHead>
  <TableHead className="w-[120px]">Status</TableHead>
 <TableHead className="w-[80px] text-right">Action</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {dos.slice((page - 1) * pageSize, page * pageSize).map((d) => (
 <TableRow key={d.id} className="hover:bg-muted/30">
  <TableCell className="font-medium text-primary">{d.doNumber}</TableCell>
  <TableCell>{d.origin}</TableCell>
  <TableCell>
    {warehouses.find(w => w.id === d.destination)?.name || d.destination || 'Warehouse'}
  </TableCell>
  <TableCell>
    <div className="flex flex-col gap-0.5">
      <span className="font-medium">{d.project?.projectName || '-'}</span>
      {d.po && <span className="text-[10px] text-muted-foreground">PO: {d.po.poNumber}</span>}
      {d.rfc && <span className="text-[10px] text-muted-foreground">RFC: {d.rfc.rfcNumber}</span>}
    </div>
  </TableCell>
  <TableCell>
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      <Package className="w-3 h-3" />
      <span>{d._count?.items || 0} mat</span>
    </div>
  </TableCell>
  <TableCell className="text-muted-foreground">
  {d.shippingDate ? formatDate(d.shippingDate) : '-'}
  </TableCell>
 <TableCell><StatusBadge status={d.status} /></TableCell>
 <TableCell className="text-right">
    {isAdmin ? (
      <DropdownMenu>
        <DropdownMenuTrigger className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => setSelectedDO(d)} className="cursor-pointer">
            <Eye className="w-4 h-4 mr-2 text-muted-foreground" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDelete(d.id)} className="cursor-pointer text-destructive focus:text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete DO
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : (
      <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setSelectedDO(d)}>
        <Eye className="w-4 h-4 mr-1" /> View
      </Button>
    )}
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 <DataTablePagination 
    totalItems={dos.length} 
    pageSize={pageSize} 
    currentPage={page} 
    onPageChange={setPage} 
    onPageSizeChange={setPageSize} 
  />
  </>
 ) : (
 <div className="text-center py-16 bg-card border rounded-xl ">
 <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
 <p className="text-muted-foreground">No completed shipments found</p>
 </div>
 )}
 </div>

 <Dialog open={!!selectedDO} onOpenChange={(open) => !open && setSelectedDO(null)}>
  <DialogContent className="sm:max-w-[700px]">
    <DialogHeader>
      <DialogTitle>Shipment Details</DialogTitle>
    </DialogHeader>
    {selectedDO && (
      <div className="grid gap-6 py-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">DO Number</p>
            <p className="font-medium">{selectedDO.doNumber}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Status</p>
            <StatusBadge status={selectedDO.status} />
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Origin</p>
            <p className="font-medium">{selectedDO.origin}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Destination</p>
            <p className="font-medium">{warehouses.find(w => w.id === selectedDO.destination)?.name || selectedDO.destination}</p>
          </div>
          <div className="col-span-2 p-3 bg-muted/30 rounded-lg border">
            <p className="text-muted-foreground mb-1 text-xs">End-to-End Traceability</p>
            <div className="flex flex-col gap-1">
              <p><span className="font-medium">Project:</span> {selectedDO.project?.projectName || '-'}</p>
              <p><span className="font-medium">Purchase Order:</span> {selectedDO.po?.poNumber || '-'}</p>
              <p><span className="font-medium">RFC:</span> {selectedDO.rfc?.rfcNumber || '-'}</p>
            </div>
          </div>
        </div>
        
        {selectedDO.evidence && (
          <div>
            <p className="text-sm font-medium mb-2">Delivery Evidence</p>
            <div className="border rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center p-2 max-h-80">
              <img src={selectedDO.evidence} alt="Delivery Evidence" className="max-h-72 object-contain" />
            </div>
          </div>
        )}
        
        {!selectedDO.evidence && (
          <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground text-sm">
            No evidence photo was uploaded for this delivery.
          </div>
        )}
      </div>
    )}
  </DialogContent>
 </Dialog>
 </div>
 );
}
