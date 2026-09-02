'use client';

import { useEffect, useState } from 'react';
import { FileText, CheckCircle, XCircle, Search, Calendar } from 'lucide-react';
import api from '@/lib/api';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataTablePagination } from '@/components/shared/DataTablePagination';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import Link from 'next/link';

export default function RfcApprovalPage() {
 const { user } = useAuth();
 const [rfcs, setRfcs] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [page, setPage] = useState(1);
 const [pageSize, setPageSize] = useState(10);

 const [approvingRfc, setApprovingRfc] = useState<any | null>(null);
 const [rejectingRfcId, setRejectingRfcId] = useState<string | null>(null);
 const [processingId, setProcessingId] = useState<string | null>(null);

 useEffect(() => {
   fetchPendingRfcs();
 }, [search]);

 const fetchPendingRfcs = async () => {
   setLoading(true);
   try {
     const { data } = await api.get('/api/rfc', { params: { search, status: 'WAITING_APPROVAL', limit: 100 } });
     setRfcs(data.data || []);
   } catch (error) {
     console.error('Failed to fetch pending RFCs', error);
   } finally {
     setLoading(false);
   }
 };

 const handleApprove = async () => {
   if (!approvingRfc) return;
   setProcessingId(approvingRfc.id);
   try {
     await api.patch(`/api/rfc/${approvingRfc.id}`, { 
       status: 'APPROVED', 
       approverId: user?.id 
     });
     toast.success(`RFC ${approvingRfc.rfcNumber} approved successfully`);
     setApprovingRfc(null);
     fetchPendingRfcs();
   } catch (error: any) {
     toast.error(error.response?.data?.message || 'Failed to approve RFC');
   } finally {
     setProcessingId(null);
   }
 };

 const handleReject = async () => {
   if (!rejectingRfcId) return;
   setProcessingId(rejectingRfcId);
   try {
     await api.patch(`/api/rfc/${rejectingRfcId}`, { status: 'REJECTED', approverId: user?.id });
     toast.success('RFC rejected successfully');
     fetchPendingRfcs();
     setRejectingRfcId(null);
   } catch (error: any) {
     toast.error(error.response?.data?.message || 'Failed to reject RFC');
   } finally {
     setProcessingId(null);
   }
 };

 return (
   <div className="space-y-6">
     <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
       <div>
         <h1 className="text-3xl font-bold tracking-tight">RFC Approval</h1>
         <p className="text-muted-foreground mt-1">Review and approve material consumption requests.</p>
       </div>
     </div>

     <div className="flex max-w-sm mb-4">
       <div className="relative w-full">
         <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
         <Input
           type="search"
           placeholder="Search by RFC number or project..."
           className="pl-8"
           value={search}
           onChange={(e) => setSearch(e.target.value)}
         />
       </div>
     </div>


       <Table>
         <TableHeader>
           <TableRow className="bg-muted/50">
             <TableHead className="w-[180px]">RFC Number</TableHead>
             <TableHead>Project</TableHead>
             <TableHead>Warehouse</TableHead>
             <TableHead>Requestor</TableHead>
             <TableHead>Date</TableHead>
             <TableHead className="text-right">Actions</TableHead>
           </TableRow>
         </TableHeader>
         <TableBody>
           {loading ? (
             <TableRow>
               <TableCell colSpan={6} className="h-24 text-center">
                 <div className="flex justify-center"><div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div></div>
               </TableCell>
             </TableRow>
           ) : rfcs.length > 0 ? (
             rfcs.slice((page - 1) * pageSize, page * pageSize).map((rfc) => (
               <TableRow key={rfc.id} className="hover:bg-muted/30">
                 <TableCell className="font-medium text-primary">
                   <Link href={`/rfc/${rfc.id}`} className="hover:underline">
                     {rfc.rfcNumber}
                   </Link>
                 </TableCell>
                 <TableCell>
                   <div className="font-medium">{rfc.projectName}</div>
                 </TableCell>
                 <TableCell>{rfc.warehouseName || '-'}</TableCell>
                 <TableCell>
                   <div className="flex flex-col">
                     <span className="text-sm font-medium">{rfc.requestorName || 'Unknown'}</span>
                     <span className="text-xs text-muted-foreground">{rfc.requestorRole || ''}</span>
                   </div>
                 </TableCell>
                 <TableCell>
                   <div className="flex flex-col">
                     <span className="text-sm">{formatDate(rfc.createdAt)}</span>
                   </div>
                 </TableCell>
                 <TableCell className="text-right">
                   <div className="flex items-center justify-end gap-2">
                     <Link href={`/rfc/${rfc.id}`}>
                       <Button variant="outline" size="sm">
                         View Details
                       </Button>
                     </Link>
                     <Button 
                       variant="destructive" 
                       size="icon" 
                       className="h-8 w-8"
                       title="Reject"
                       onClick={() => setRejectingRfcId(rfc.id)}
                       disabled={processingId === rfc.id}
                     >
                       <XCircle className="h-4 w-4" />
                     </Button>
                     <Button 
                       variant="default" 
                       size="icon" 
                       className="h-8 w-8 bg-green-600 hover:bg-green-700 text-white"
                       title="Approve"
                       onClick={() => setApprovingRfc(rfc)}
                       disabled={processingId === rfc.id}
                     >
                       <CheckCircle className="h-4 w-4" />
                     </Button>
                   </div>
                 </TableCell>
               </TableRow>
             ))
           ) : (
             <TableRow>
               <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                 No pending RFCs for approval.
               </TableCell>
             </TableRow>
           )}
         </TableBody>
       </Table>
     
     <div className="p-4">
       <DataTablePagination 
         currentPage={page} 
         pageSize={pageSize} 
         totalItems={rfcs.length} 
         onPageChange={setPage} 
         onPageSizeChange={setPageSize} 
       />
     </div>

     <Dialog open={!!approvingRfc} onOpenChange={(open) => !open && setApprovingRfc(null)}>
       <DialogContent>
         <DialogHeader>
           <DialogTitle>Approve RFC</DialogTitle>
           <DialogDescription>
             Are you sure you want to approve RFC {approvingRfc?.rfcNumber}? This will allow the warehouse to release the requested materials.
           </DialogDescription>
         </DialogHeader>
         
         <DialogFooter className="mt-4">
           <Button variant="outline" onClick={() => setApprovingRfc(null)} disabled={!!processingId}>
             Cancel
           </Button>
           <Button onClick={handleApprove} disabled={!!processingId} className="bg-green-600 hover:bg-green-700 text-white">
             {processingId ? "Approving..." : "Yes, Approve RFC"}
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>

     <Dialog open={!!rejectingRfcId} onOpenChange={(open) => !open && setRejectingRfcId(null)}>
       <DialogContent>
         <DialogHeader>
           <DialogTitle>Reject RFC</DialogTitle>
           <DialogDescription>
             Are you sure you want to reject this RFC? This action cannot be undone.
           </DialogDescription>
         </DialogHeader>
         <DialogFooter className="mt-4">
           <Button variant="outline" onClick={() => setRejectingRfcId(null)} disabled={!!processingId}>
             Cancel
           </Button>
           <Button variant="destructive" onClick={handleReject} disabled={!!processingId}>
             {processingId ? "Rejecting..." : "Yes, Reject"}
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   </div>
 );
}
