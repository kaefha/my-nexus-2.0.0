'use client';

import { useEffect, useState } from 'react';
import { FileText, Plus, Search, MapPin, Calendar, Clock, Loader2, Printer, Filter, MoreHorizontal, Pencil, Trash2, Eye } from 'lucide-react';
import api from '@/lib/api';
import StatusBadge from '@/components/shared/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { DataTablePagination } from '@/components/shared/DataTablePagination';
import Link from 'next/link';

export default function RfcPage() {
 const [rfcs, setRfcs] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [status, setStatus] = useState('ALL');
 const [startDate, setStartDate] = useState('');
 const [endDate, setEndDate] = useState('');
 const [sort, setSort] = useState('desc');
 const [page, setPage] = useState(1);
 const [pageSize, setPageSize] = useState(10);

 const [editModalOpen, setEditModalOpen] = useState(false);
 const [selectedRfc, setSelectedRfc] = useState<any>(null);
 const [editFormData, setEditFormData] = useState({ location: '', notes: '' });
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [deleteId, setDeleteId] = useState<string | null>(null);
 const [isDeleting, setIsDeleting] = useState(false);

 useEffect(() => {
   fetchRfcs();
   setPage(1);
 }, [search, status, startDate, endDate, sort]);

 const fetchRfcs = async () => {
   setLoading(true);
   try {
     const { data } = await api.get('/api/rfc', { params: { search, status, startDate, endDate, sort, limit: 100 } });
     setRfcs(data.data || []);
 } catch (error) {
 console.error(error);
 } finally {
 setLoading(false);
 }
 };

 const openEditModal = (rfc: any) => {
   setSelectedRfc(rfc);
   setEditFormData({
     location: rfc.location || '',
     notes: rfc.notes || ''
   });
   setEditModalOpen(true);
 };

 const handleEditSubmit = async (e: React.FormEvent) => {
   e.preventDefault();
   if (!selectedRfc) return;

   setIsSubmitting(true);
   try {
     await api.patch(`/api/rfc/${selectedRfc.id}`, {
       isEdit: true,
       location: editFormData.location,
       notes: editFormData.notes
     });
     toast.success('RFC updated and reset to DRAFT');
     setEditModalOpen(false);
     fetchRfcs();
   } catch (error: any) {
     toast.error(error.response?.data?.message || 'Failed to update RFC');
   } finally {
     setIsSubmitting(false);
   }
 };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/api/rfc/${deleteId}`);
      toast.success('RFC deleted successfully');
      setDeleteId(null);
      fetchRfcs();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete RFC');
    } finally {
      setIsDeleting(false);
    }
  };

 return (
 <div className="space-y-6">
 <div className="animate-fade-in">
        <h1 className="text-3xl font-bold tracking-tight">RFC Management</h1>
 <p className="text-sm text-muted-foreground mt-1">Manage Request for Consumption (RFC) workflows</p>
      </div>

      <div className="flex flex-col gap-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search RFCs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <Select value={status} onValueChange={(val) => setStatus(val || "")}>
              <SelectTrigger className="w-[230px] h-9 bg-background">
                <SelectValue>
                  {status === 'ALL' ? 'All Status' : 
                   status === 'DRAFT' ? 'Draft' :
                   status === 'WAITING_SITE_APPROVAL' ? 'Waiting Site Approval' :
                   status === 'WAITING_FINANCE_APPROVAL' ? 'Waiting Finance Approval' :
                   status === 'APPROVED' ? 'Approved' : 
                   status === 'REJECTED' ? 'Rejected' : 'All Status'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="WAITING_SITE_APPROVAL">Waiting Site Approval</SelectItem>
                <SelectItem value="WAITING_FINANCE_APPROVAL">Waiting Finance Approval</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5">
              <DatePicker 
                value={startDate} 
                onChange={setStartDate} 
                className="w-[130px] h-9 bg-background"
              />
              <span className="text-muted-foreground">-</span>
              <DatePicker 
                value={endDate} 
                onChange={setEndDate} 
                className="w-[130px] h-9 bg-background"
              />
            </div>

            <Select value={sort} onValueChange={(val) => setSort(val || "")}>
              <SelectTrigger className="w-[160px] h-9 bg-background">
                <SelectValue>
                  Sort by: {sort === 'desc' ? 'Newest' : 'Oldest'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Sort by: Newest</SelectItem>
                <SelectItem value="asc">Sort by: Oldest</SelectItem>
              </SelectContent>
            </Select>

            <Link href="/rfc/create" className="ml-auto lg:ml-2">
              <Button className="h-9 gap-2">
                <Plus className="w-4 h-4" /> Create RFC
              </Button>
            </Link>
          </div>
        </div>
      </div>

 <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
 {loading ? (
 <div className="p-8 text-center flex flex-col items-center bg-card border rounded-xl ">
 <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
 <p className="text-muted-foreground">Loading RFC data...</p>
 </div>
 ) : rfcs.length > 0 ? (
 <>
 <Table className="whitespace-nowrap">
 <TableHeader>
 <TableRow>
 <TableHead className="w-[140px]">RFC Number</TableHead>
 <TableHead className="w-[250px]">Project</TableHead>
 <TableHead className="w-[200px]">Location</TableHead>
 <TableHead className="w-[150px]">Requestor</TableHead>
 <TableHead className="w-[100px]">Items</TableHead>
 <TableHead className="w-[120px]">Status</TableHead>
 <TableHead className="w-[80px] text-right">Action</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {rfcs.slice((page - 1) * pageSize, page * pageSize).map((rfc) => (
 <TableRow key={rfc.id} className="hover:bg-muted/30">
 <TableCell className="font-medium text-primary">
 {rfc.rfcNumber}
 </TableCell>
 <TableCell>
 <div className="font-medium">{rfc.project?.projectName}</div>
 <div className="text-[10px] text-muted-foreground">{rfc.project?.customer}</div>
 </TableCell>
 <TableCell className="whitespace-normal max-w-[300px]">
 <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
 <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
 <span>{rfc.location}</span>
 </div>
 </TableCell>
 <TableCell>
 <div className="flex items-center gap-2">
 <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
 {rfc.requestor?.name?.charAt(0) || 'U'}
 </div>
 <span className="text-sm">{rfc.requestor?.name || 'Unknown'}</span>
 </div>
 </TableCell>
 <TableCell>
 <Badge variant="outline" className="text-xs">
 {rfc._count?.items || 0} items
 </Badge>
 </TableCell>
 <TableCell>
 <StatusBadge status={rfc.status} />
 </TableCell>
  <TableCell className="text-right">
    <DropdownMenu>
      <DropdownMenuTrigger className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="cursor-pointer" onClick={() => window.location.href = '/rfc/' + rfc.id}>
          <Eye className="w-4 h-4 mr-2 text-primary" /> View Details
        </DropdownMenuItem>
        {rfc.signedDocument ? (
          <DropdownMenuItem className="cursor-pointer" onClick={() => window.open(rfc.signedDocument, '_blank')}>
            <FileText className="w-4 h-4 mr-2" /> Signed Doc
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem className="cursor-pointer" onClick={() => window.open(`/print/rfc/${rfc.id}`, '_blank')}>
            <Printer className="w-4 h-4 mr-2" /> Print PDF
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="cursor-pointer" onClick={() => openEditModal(rfc)}>
          <Pencil className="w-4 h-4 mr-2 text-muted-foreground" /> Edit RFC
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => setDeleteId(rfc.id)}>
          <Trash2 className="w-4 h-4 mr-2" /> Delete RFC
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </TableCell>
  </TableRow>
 ))}
 </TableBody>
 </Table>
 <DataTablePagination 
    totalItems={rfcs.length} 
    pageSize={pageSize} 
    currentPage={page} 
    onPageChange={setPage} 
    onPageSizeChange={setPageSize} 
 />
 </>
 ) : (
 <div className="text-center py-16 bg-card border rounded-xl ">
 <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
 <p className="text-muted-foreground">No RFCs found</p>
 <Link href="/rfc/create">
 <Button variant="link" className="mt-2">
 Create your first RFC
 </Button>
 </Link>
 </div>
 )}
 </div>

 <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
  <DialogContent>
    <form onSubmit={handleEditSubmit}>
      <DialogHeader>
        <DialogTitle>Edit RFC {selectedRfc?.rfcNumber}</DialogTitle>
        <DialogDescription>
          Modifying this RFC will reset its status back to Draft and it will require re-approval.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="location">Location *</Label>
          <Input 
            id="location" 
            value={editFormData.location}
            onChange={(e) => setEditFormData({...editFormData, location: e.target.value})}
            required 
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="notes">Notes</Label>
          <Input 
            id="notes" 
            value={editFormData.notes}
            onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save & Reset to Draft
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
 </Dialog>

 <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
  <DialogContent className="sm:max-w-[425px]">
  <DialogHeader>
  <DialogTitle>Delete RFC?</DialogTitle>
  <DialogDescription>
  Are you sure you want to delete this RFC? This cannot be undone.
  </DialogDescription>
  </DialogHeader>
  <DialogFooter className="pt-4">
  <Button variant="outline" className="w-full sm:w-auto" onClick={() => setDeleteId(null)} disabled={isDeleting}>Cancel</Button>
  <Button variant="destructive" className="w-full sm:w-auto" onClick={confirmDelete} disabled={isDeleting}>
  {isDeleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
  Delete
  </Button>
  </DialogFooter>
  </DialogContent>
 </Dialog>

 </div>
 );
}
