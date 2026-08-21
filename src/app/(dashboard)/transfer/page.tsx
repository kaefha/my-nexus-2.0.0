'use client';

import { useEffect, useState } from 'react';
import { ArrowLeftRight, Search, Plus, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTablePagination } from '@/components/shared/DataTablePagination';
import { useAuth } from '@/hooks/useAuth';

export default function TransferPage() {
 const { user } = useAuth();
 const [transfers, setTransfers] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 
 const [page, setPage] = useState(1);
 const [pageSize, setPageSize] = useState(10);

 // Modal state
 const [isOpen, setIsOpen] = useState(false);
 const [viewData, setViewData] = useState<any>(null);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [warehouses, setWarehouses] = useState<any[]>([]);
 const [isManualTo, setIsManualTo] = useState(false);
 const [formData, setFormData] = useState({
 transferNumber: '',
 fromLocation: '',
 toLocation: '',
 transferDate: '',
 reason: '',
 pic: ''
 });

 const fetchTransfers = async () => {
 setLoading(true);
 try {
 const { data } = await api.get('/api/transfer', { params: { search, limit: 5000 } });
 setTransfers(data.data || []);
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
 console.error(e);
 }
 };

 useEffect(() => {
 fetchTransfers();
 fetchWarehouses();
 setPage(1);
 }, [search]);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsSubmitting(true);
 try {
 await api.post('/api/transfer', formData);
 setIsOpen(false);
 setFormData({ transferNumber: '', fromLocation: '', toLocation: '', transferDate: '', reason: '', pic: '' });
 setIsManualTo(false);
 fetchTransfers();
 } catch (error) {
 console.error('Error creating transfer:', error);
 alert('Failed to create Transfer');
 } finally {
 setIsSubmitting(false);
 }
 };

 const canApprove = user?.role === 'PROCUREMENT' || user?.role === 'LOGISTICS' || user?.role === 'ADMIN';

 const updateStatus = async (status: string) => {
  setIsSubmitting(true);
  try {
    await api.put('/api/transfer', { id: viewData.id, status });
    setViewData(null);
    fetchTransfers();
  } catch (error) {
    console.error('Error updating status:', error);
    alert('Failed to update status');
  } finally {
    setIsSubmitting(false);
  }
 };

 return (
 <div className="space-y-6">
 <div className="animate-fade-in">
        <h1 className="text-2xl font-bold">Material Transfer</h1>
 <p className="text-sm text-muted-foreground mt-0.5">Manage stock movements between locations</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
 <Input 
 type="search" 
 placeholder="Search transfer number or location..." 
 value={search} 
 onChange={(e) => setSearch(e.target.value)}
 className="pl-9"
 />
        </div>
        <Button onClick={() => setIsOpen(true)} className="gap-2 ">
 <Plus className="w-4 h-4" /> New Transfer
 </Button>
      </div>

 <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
 {loading ? (
 <div className="p-8 text-center flex flex-col items-center bg-card border rounded-xl ">
 <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
 <p className="text-muted-foreground">Loading transfers...</p>
 </div>
 ) : transfers.length > 0 ? (
 <>
 <Table className="whitespace-nowrap">
 <TableHeader>
 <TableRow>
 <TableHead className="w-[150px]">Transfer Number</TableHead>
 <TableHead className="w-[150px]">From</TableHead>
 <TableHead className="w-[150px]">To</TableHead>
 <TableHead className="w-[150px]">Date</TableHead>
 <TableHead className="w-[200px]">PIC</TableHead>
 <TableHead className="w-[120px]">Status</TableHead>
 <TableHead className="w-[80px] text-right">Action</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {transfers.slice((page - 1) * pageSize, page * pageSize).map((t) => (
 <TableRow key={t.id} className="hover:bg-muted/30">
 <TableCell className="font-medium text-primary">{t.transferNumber}</TableCell>
 <TableCell>{t.fromLocation}</TableCell>
 <TableCell>{t.toLocation}</TableCell>
 <TableCell className="text-muted-foreground">
 {t.transferDate ? formatDate(t.transferDate) : '-'}
 </TableCell>
 <TableCell>{t.pic || '-'}</TableCell>
 <TableCell><StatusBadge status={t.status} /></TableCell>
 <TableCell className="text-right">
 <Button variant="ghost" size="sm" className="text-xs text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary" onClick={() => setViewData(t)}>
 View
 </Button>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 <DataTablePagination 
    totalItems={transfers.length} 
    pageSize={pageSize} 
    currentPage={page} 
    onPageChange={setPage} 
    onPageSizeChange={setPageSize} 
  />
 </>
 ) : (
 <div className="text-center py-16 bg-card border rounded-xl ">
 <ArrowLeftRight className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
 <p className="text-muted-foreground">No transfers found</p>
 <Button variant="link" onClick={() => setIsOpen(true)} className="mt-2">
 Create your first transfer
 </Button>
 </div>
 )}
 </div>

 <Dialog open={isOpen} onOpenChange={setIsOpen}>
 <DialogContent className="sm:max-w-[700px]">
 <form onSubmit={handleSubmit}>
 <DialogHeader>
 <DialogTitle>New Material Transfer</DialogTitle>
 <DialogDescription>Create a new stock transfer request.</DialogDescription>
 </DialogHeader>
 <div className="grid gap-4 py-4">
 <div className="flex flex-col gap-2">
 <Label htmlFor="transferNumber">Transfer Number *</Label>
 <Input 
 id="transferNumber" 
 placeholder="e.g. TR-2026-001" 
 value={formData.transferNumber}
 onChange={(e) => setFormData({...formData, transferNumber: e.target.value})}
 required 
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="flex flex-col gap-2">
 <Label htmlFor="fromLocation">From Location *</Label>
 <Select value={formData.fromLocation} onValueChange={(val) => setFormData({ ...formData, fromLocation: val || "" })} required>
 <SelectTrigger>
 <SelectValue placeholder="Select Warehouse" />
 </SelectTrigger>
 <SelectContent>
 {warehouses.map(wh => (
 <SelectItem key={wh.id} value={wh.name}>{wh.name} {wh.code ? `(${wh.code})` : ''}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="flex flex-col gap-2">
 <Label htmlFor="toLocation">To Location *</Label>
 {!isManualTo ? (
 <Select 
 value={warehouses.some(w => w.name === formData.toLocation) ? formData.toLocation : (formData.toLocation === 'MANUAL' ? 'MANUAL' : '')} 
 onValueChange={(val) => {
 if (val === 'MANUAL') {
 setIsManualTo(true);
 setFormData({...formData, toLocation: ''});
 } else {
 setFormData({...formData, toLocation: val || ''});
 }
 }} 
 required
 >
 <SelectTrigger>
 <SelectValue placeholder="Select Warehouse" />
 </SelectTrigger>
 <SelectContent>
 {warehouses.map(wh => (
 <SelectItem key={wh.id} value={wh.name}>{wh.name} {wh.code ? `(${wh.code})` : ''}</SelectItem>
 ))}
 <SelectItem value="MANUAL" className="font-semibold text-primary">+ Type manually...</SelectItem>
 </SelectContent>
 </Select>
 ) : (
 <div className="flex gap-2">
 <Input 
 id="toLocation" 
 placeholder="e.g. Site B" 
 value={formData.toLocation}
 onChange={(e) => setFormData({...formData, toLocation: e.target.value})}
 autoFocus
 required 
 />
 <Button type="button" variant="outline" onClick={() => {
 setIsManualTo(false);
 setFormData({...formData, toLocation: ''});
 }}>Cancel</Button>
 </div>
 )}
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="flex flex-col gap-2">
 <Label htmlFor="transferDate">Transfer Date</Label>
 <DatePicker 
 value={formData.transferDate}
 onChange={(value) => setFormData({...formData, transferDate: value})}
 />
 </div>
 <div className="flex flex-col gap-2">
 <Label htmlFor="pic">PIC</Label>
 <Input 
 id="pic" 
 placeholder="e.g. John Doe" 
 value={formData.pic}
 onChange={(e) => setFormData({...formData, pic: e.target.value})}
 />
 </div>
 </div>
 <div className="flex flex-col gap-2">
 <Label htmlFor="reason">Reason / Notes</Label>
 <Input 
 id="reason" 
 placeholder="e.g. Restock for project deployment" 
 value={formData.reason}
 onChange={(e) => setFormData({...formData, reason: e.target.value})}
 />
 </div>
 </div>
 <DialogFooter>
 <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
 Cancel
 </Button>
 <Button type="submit" disabled={isSubmitting}>
 {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
 Save Transfer
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>

 <Dialog open={!!viewData} onOpenChange={(open) => !open && setViewData(null)}>
 <DialogContent className="sm:max-w-[500px]">
 <DialogHeader>
 <DialogTitle>Transfer Details</DialogTitle>
 <DialogDescription>Details for material transfer <span className="font-semibold text-primary">{viewData?.transferNumber}</span></DialogDescription>
 </DialogHeader>
 {viewData && (
 <div className="space-y-4 py-2">
 <div className="grid grid-cols-3 gap-2 text-sm border-b pb-3">
 <span className="font-medium text-muted-foreground">Transfer Number</span>
 <span className="col-span-2 font-semibold text-primary">{viewData.transferNumber}</span>
 </div>
 <div className="grid grid-cols-3 gap-2 text-sm border-b pb-3">
 <span className="font-medium text-muted-foreground">Status</span>
 <span className="col-span-2"><StatusBadge status={viewData.status} /></span>
 </div>
 <div className="grid grid-cols-3 gap-2 text-sm border-b pb-3">
 <span className="font-medium text-muted-foreground">From Location</span>
 <span className="col-span-2">{viewData.fromLocation}</span>
 </div>
 <div className="grid grid-cols-3 gap-2 text-sm border-b pb-3">
 <span className="font-medium text-muted-foreground">To Location</span>
 <span className="col-span-2">{viewData.toLocation}</span>
 </div>
 <div className="grid grid-cols-3 gap-2 text-sm border-b pb-3">
 <span className="font-medium text-muted-foreground">Transfer Date</span>
 <span className="col-span-2">{viewData.transferDate ? formatDate(viewData.transferDate) : '-'}</span>
 </div>
 <div className="grid grid-cols-3 gap-2 text-sm border-b pb-3">
 <span className="font-medium text-muted-foreground">PIC</span>
 <span className="col-span-2">{viewData.pic || '-'}</span>
 </div>
 <div className="grid grid-cols-3 gap-2 text-sm pb-1">
 <span className="font-medium text-muted-foreground">Reason / Notes</span>
 <span className="col-span-2 whitespace-pre-wrap">{viewData.reason || '-'}</span>
 </div>
 </div>
 )}
 <DialogFooter className="flex w-full justify-between sm:justify-between items-center">
 <div className="flex-1">
   {canApprove && viewData?.status === 'PENDING' && (
     <div className="flex gap-2">
       <Button type="button" variant="destructive" onClick={() => updateStatus('REJECTED')} disabled={isSubmitting}>
         Reject
       </Button>
       <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => updateStatus('APPROVED')} disabled={isSubmitting}>
         Approve
       </Button>
     </div>
   )}
 </div>
 <Button type="button" variant="outline" onClick={() => setViewData(null)} disabled={isSubmitting}>
 Close
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
