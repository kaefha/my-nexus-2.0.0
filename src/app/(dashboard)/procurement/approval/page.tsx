'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Search, Loader2, FileText, Eye, Upload } from 'lucide-react';
import api from '@/lib/api';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { DataTablePagination } from '@/components/shared/DataTablePagination';
import Link from 'next/link';
import { toast } from 'sonner';

export default function PoApprovalPage() {
  const { user } = useAuth();
  const [pos, setPos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [approvingPo, setApprovingPo] = useState<any | null>(null);
  const [rejectingPoId, setRejectingPoId] = useState<string | null>(null);
  const [signedDocument, setSignedDocument] = useState<File | null>(null);
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchPendingPOs();
    setPage(1);
  }, [search]);

  const fetchPendingPOs = async () => {
    try {
      const { data } = await api.get('/api/procurement', { params: { search, type: 'active', limit: 50 } });
      const pending = data.data.filter((r: any) => {
        if (r.status === 'WAITING_APPROVAL' && (user?.id === r.approverId || !r.approverId)) {
          return true;
        }
        return false;
      });
      setPos(pending);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openApproveModal = (po: any) => {
    setApprovingPo(po);
    setSignedDocument(null);
  };

  const handleApprove = async () => {
    if (!approvingPo) return;
    setProcessingId(approvingPo.id);
    try {
      let signedDocumentUrl = null;
      if (signedDocument) {
        const uploadData = new FormData();
        uploadData.append('file', signedDocument);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadData,
        });
        
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          signedDocumentUrl = url;
        } else {
          throw new Error('Failed to upload document');
        }
      }

      await api.patch(`/api/procurement/${approvingPo.id}/status`, { 
        status: 'APPROVED', 
        signedDocumentUrl,
        approverId: user?.id
      });
      
      toast.success('PO Approved successfully');
      setApprovingPo(null);
      fetchPendingPOs();
      window.dispatchEvent(new Event('refreshNotifications'));
    } catch (error) {
      console.error('Failed to approve', error);
      toast.error('Failed to approve PO');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingPoId) return;
    setProcessingId(rejectingPoId);
    try {
      await api.patch(`/api/procurement/${rejectingPoId}/status`, { status: 'REJECTED', approverId: user?.id });
      toast.success('PO Rejected successfully');
      fetchPendingPOs();
      window.dispatchEvent(new Event('refreshNotifications'));
      setRejectingPoId(null);
    } catch (error) {
      console.error('Failed to reject', error);
      toast.error('Failed to reject PO');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold tracking-tight">PO Approval Queue</h1>
        <p className="text-sm text-muted-foreground mt-1">Review and approve pending Purchase Orders</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search pending POs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
        <div className="w-full">
          {loading ? (
            <div className="p-8 text-center flex flex-col items-center bg-card border rounded-xl">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Loading approval queue...</p>
            </div>
          ) : pos.length > 0 ? (
            <>
              <Table className="whitespace-nowrap">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[120px]">PO Number</TableHead>
                    <TableHead className="w-[200px]">Vendor</TableHead>
                    <TableHead className="w-[150px]">Expected Date</TableHead>
                    <TableHead className="w-[150px]">Items</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pos.slice((page - 1) * pageSize, page * pageSize).map((po) => (
                    <TableRow key={po.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-primary">
                        {po.poNumber}
                      </TableCell>
                      <TableCell className="whitespace-normal max-w-[200px]">
                        <div className="font-medium">{po.vendor}</div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{po.expectedDate ? formatDate(po.expectedDate) : '-'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{po._count?.items || 0} items</div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={po.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 items-center">
                          <Link href={`/procurement/${po.id}`}>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 px-2"
                            >
                              <Eye className="w-4 h-4 mr-1" /> Details
                            </Button>
                          </Link>

                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2"
                            onClick={() => setRejectingPoId(po.id)}
                            disabled={processingId === po.id}
                          >
                            <XCircle className="w-4 h-4 mr-1" /> Reject
                          </Button>
                          <Button 
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white h-8 px-2"
                            onClick={() => openApproveModal(po)}
                            disabled={processingId === po.id}
                          >
                            {processingId === po.id ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4 mr-1" />
                            )}
                            Approve
                          </Button>
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
            <div className="text-center py-16 bg-card border rounded-xl">
              <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="text-muted-foreground font-medium">All caught up!</p>
              <p className="text-sm text-muted-foreground mt-1">There are no POs waiting for your approval right now.</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!approvingPo} onOpenChange={(open) => !open && setApprovingPo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve PO & Upload Document</DialogTitle>
            <DialogDescription>
              You are about to approve PO {approvingPo?.poNumber}. You must upload the signed PDF document to complete the approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="signedDocument">Signed Document</Label>
              <Input 
                id="signedDocument" 
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setSignedDocument(e.target.files[0]);
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">Upload the signed PDF version of this Purchase Order.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovingPo(null)} disabled={!!processingId}>
              Cancel
            </Button>
            <Button 
              onClick={handleApprove} 
              disabled={!!processingId || !signedDocument} 
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {processingId ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload & Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectingPoId} onOpenChange={(open) => !open && setRejectingPoId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject PO</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this Purchase Order? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingPoId(null)} disabled={!!processingId}>
              Cancel
            </Button>
            <Button onClick={handleReject} disabled={!!processingId} variant="destructive">
              {processingId ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
              Yes, Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
