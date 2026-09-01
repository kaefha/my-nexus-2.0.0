'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart, Search, Eye, Plus, Loader2, CheckCircle2, XCircle, Send, Pencil, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTablePagination } from '@/components/shared/DataTablePagination';

export default function ProcurementHistoryPage() {
 const { user } = useAuth();
 const [pos, setPos] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 
 const [page, setPage] = useState(1);
 const [pageSize, setPageSize] = useState(10);
 
 const [formData, setFormData] = useState<any>({
 poNumber: '',
 vendor: '',
 rfcId: '',
 expectedDate: '',
 notes: '',
 items: []
 });
 const [approvedRfcs, setApprovedRfcs] = useState<any[]>([]);
 const [isFetchingRfc, setIsFetchingRfc] = useState(false);
 const [vendors, setVendors] = useState<any[]>([]);
 const [isEditMode, setIsEditMode] = useState(false);

 // View PO state
 const [isOpen, setIsOpen] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isViewOpen, setIsViewOpen] = useState(false);
 const [selectedPo, setSelectedPo] = useState<any>(null);
 const [isLoadingPo, setIsLoadingPo] = useState(false);
 
 const fetchPOs = async () => {
  setLoading(true);
  try {
  const { data } = await api.get('/api/procurement', { params: { search, type: 'history', limit: 5000 } });
  setPos(data.data || []);
 } catch (e) { 
 console.error(e); 
 } finally { 
 setLoading(false); 
 }
 };

 useEffect(() => {
 fetchPOs();
 setPage(1);
 }, [search]);

  const openViewDialog = async (po: any) => {
    setIsViewOpen(true);
    setIsLoadingPo(true);
    setSelectedPo(null);
    try {
      const { data } = await api.get(`/api/procurement/${po.id}`);
      setSelectedPo(data.data);
    } catch (error) {
      console.error('Error fetching PO details:', error);
      toast.error('Failed to load PO details');
    } finally {
      setIsLoadingPo(false);
    }
  };

  const updatePOStatus = async (status: string) => {
    if (!selectedPo) return;
    try {
      const payload: any = { status };
      if (['APPROVED', 'REJECTED', 'PROCESSED', 'DELIVERED', 'COMPLETED'].includes(status) && user?.id) {
        payload.approverId = user.id;
      }
      await api.patch(`/api/procurement/${selectedPo.id}/status`, payload);
      toast.success(`PO status updated to ${status}`);
      setSelectedPo({ ...selectedPo, status, approverName: user?.name, approverRole: user?.role });
      fetchPOs();
    } catch (error) {
      console.error('Failed to update status', error);
      toast.error('Failed to update PO status');
    }
  };

  const handleDeletePO = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Purchase Order? This action cannot be undone.')) return;
    try {
      await api.delete(`/api/procurement/${id}`);
      toast.success('Purchase Order deleted successfully');
      fetchPOs();
    } catch (error) {
      console.error('Failed to delete PO:', error);
      toast.error('Failed to delete Purchase Order');
    }
  };

 return (
 <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">PO History</h1>
          <p className="text-muted-foreground mt-1">View processed and historical purchase orders</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
 <Input 
 type="search" 
 placeholder="Search PO number, vendor..." 
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
 <p className="text-muted-foreground">Loading purchase orders...</p>
 </div>
 ) : pos.length > 0 ? (
 <>
 <Table className="whitespace-nowrap">
 <TableHeader>
 <TableRow>
 <TableHead className="w-[150px]">PO Number</TableHead>
 <TableHead className="w-[250px]">Vendor</TableHead>
 <TableHead className="w-[150px]">Expected</TableHead>
 <TableHead className="w-[120px]">Status</TableHead>
 <TableHead className="w-[80px] text-right">Action</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {pos.slice((page - 1) * pageSize, page * pageSize).map((po) => (
 <TableRow key={po.id} className="hover:bg-muted/30">
 <TableCell className="font-medium text-primary">{po.poNumber}</TableCell>
 <TableCell>{po.vendor}</TableCell>
 <TableCell className="text-muted-foreground">
 {po.expectedDate ? formatDate(po.expectedDate) : '-'}
 </TableCell>
 <TableCell><StatusBadge status={po.status} /></TableCell>
 <TableCell className="w-[80px] text-right">
 <div className="flex justify-end gap-2">
 <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openViewDialog(po)}>
 <Eye className="h-4 w-4" />
 </Button>
 {user?.role === 'ADMIN' && (
   <Button 
     variant="ghost" 
     size="icon" 
     className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" 
     onClick={() => handleDeletePO(po.id)}
   >
     <Trash2 className="h-4 w-4" />
   </Button>
 )}
 </div>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 <DataTablePagination 
    totalItems={pos.length} 
    pageSize={pageSize} 
    currentPage={page} 
    onPageChange={setPage} 
    onPageSizeChange={setPageSize} 
 />
 </>
 ) : (
 <div className="text-center py-16 bg-card border rounded-xl ">
 <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
 <p className="text-muted-foreground">No purchase orders found</p>
 </div>
 )}
 </div>

  {/* View PO Dialog */}
  <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Purchase Order Details</DialogTitle>
      </DialogHeader>
      
      {isLoadingPo ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : selectedPo ? (
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">PO Number</p>
              <p className="font-semibold">{selectedPo.poNumber}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Status</p>
              <StatusBadge status={selectedPo.status} />
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Vendor</p>
              <p className="font-medium">{selectedPo.vendor}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Expected Date</p>
              <p>{selectedPo.expectedDate ? formatDate(selectedPo.expectedDate) : '-'}</p>
            </div>
            {selectedPo.rfcId && (
              <div className="col-span-1 sm:col-span-2">
                <p className="text-muted-foreground mb-1">Reference RFC ID</p>
                <p className="font-mono text-xs break-all bg-muted/30 p-2 rounded">{selectedPo.rfcId}</p>
              </div>
            )}
            {selectedPo.notes && (
              <div className="col-span-1 sm:col-span-2">
                <p className="text-muted-foreground mb-1">Notes</p>
                <p className="bg-muted/30 p-3 rounded-md text-muted-foreground">{selectedPo.notes}</p>
              </div>
            )}
            {selectedPo.approverName && (
              <div className="col-span-1 sm:col-span-2 bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-900 p-3 rounded-md">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Processed By</p>
                <p className="font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <span className="truncate">{selectedPo.approverName}</span> <span className="text-muted-foreground font-normal text-sm truncate">({selectedPo.approverRole})</span>
                </p>
              </div>
            )}
          </div>
          
          <div>
            <h4 className="font-semibold mb-3 border-b pb-2">Order Items</h4>
            {selectedPo.items && selectedPo.items.length > 0 ? (
              <div className="overflow-x-auto">
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Material</TableHead>
                      <TableHead className="w-[100px] text-right">Quantity</TableHead>
                      <TableHead className="w-[250px]">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPo.items.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.materialName || 'Unknown Material'}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{item.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic bg-muted/20 p-4 rounded text-center">No items found for this PO.</p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-8">Failed to load PO details.</p>
      )}
      
      {/* Action Buttons for History Tracking */}
      <div className="flex justify-end gap-2 mt-6">
        {selectedPo?.status === 'APPROVED' && (
          <Button variant="default" onClick={() => updatePOStatus('PROCESSED')} className="bg-blue-600 hover:bg-blue-700">
            <CheckCircle2 className="w-4 h-4 mr-2" /> Mark as Processed
          </Button>
        )}
        {selectedPo?.status === 'PROCESSED' && (
          <Button variant="default" onClick={() => updatePOStatus('DELIVERED')} className="bg-teal-600 hover:bg-teal-700">
            <CheckCircle2 className="w-4 h-4 mr-2" /> Mark as Delivered
          </Button>
        )}
        {selectedPo?.status === 'DELIVERED' && (
          <Button variant="default" onClick={() => updatePOStatus('COMPLETED')} className="bg-emerald-600 hover:bg-emerald-700">
            <CheckCircle2 className="w-4 h-4 mr-2" /> Complete PO
          </Button>
        )}
        <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
      </div>
    </DialogContent>
  </Dialog>
  </div>
  );
}
