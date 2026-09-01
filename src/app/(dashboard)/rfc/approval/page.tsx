'use client';

import { useEffect, useState, useRef } from 'react';
import { CheckCircle, XCircle, Clock, Search, MapPin, Loader2, FileText, PenTool, Eye } from 'lucide-react';
import api from '@/lib/api';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SignatureCanvas from 'react-signature-canvas';
import { useAuth } from '@/hooks/useAuth';
import { DataTablePagination } from '@/components/shared/DataTablePagination';
import Link from 'next/link';

export default function RfcApprovalPage() {
 const { user } = useAuth();
 const [rfcs, setRfcs] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [processingId, setProcessingId] = useState<string | null>(null);
 const [approvingRfc, setApprovingRfc] = useState<any | null>(null);
 const [rejectingRfcId, setRejectingRfcId] = useState<string | null>(null);
 const [signedDocument, setSignedDocument] = useState<File | null>(null);
 
 const [page, setPage] = useState(1);
 const [pageSize, setPageSize] = useState(10);

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const actionId = searchParams?.get('actionId');

 useEffect(() => {
 fetchPendingRfcs();
 setPage(1);
 }, [search]);

 const fetchPendingRfcs = async () => {
 try {
 const { data } = await api.get('/api/rfc', { params: { search, limit: 50 } });
  // Filter for RFCs that need approval based on user role and strict destination
  const pending = data.data.filter((r: any) => {
    // 1. Strict user-targeted check: If assigned to a specific user, ONLY that user can see it
    if (r.approvalDestination && r.approvalDestination !== user?.id) {
      return false;
    }

    // 2. Role-based fallback
    if (r.status === 'WAITING_APPROVAL' && (user?.role === 'PROCUREMENT' || user?.role === 'OWNER' || user?.role === 'DIREKTUR' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN')) return true;
    
    return false;
  });
 setRfcs(pending);

      // Auto-open modal if actionId is passed
      if (actionId) {
        const found = pending.find((r: any) => r.id === actionId);
        if (found) {
          setApprovingRfc(found);
          // Optional: clear query param so it doesn't reopen on refresh
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', '/rfc/approval');
          }
        }
      }
 } catch (error) {
 console.error(error);
 } finally {
 setLoading(false);
 }
 };

  const openApproveModal = (rfc: any) => {
    setApprovingRfc(rfc);
    setSignedDocument(null);
  };

  const handleApprove = async () => {
    if (!approvingRfc) return;
    setProcessingId(approvingRfc.id);
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

      let nextStatus = 'APPROVED';

      await api.patch(`/api/rfc/${approvingRfc.id}`, { 
        status: nextStatus, 
        signedDocument: signedDocumentUrl,
        approverId: user?.id
      });
      
      setApprovingRfc(null);
      fetchPendingRfcs();
      window.dispatchEvent(new Event('refreshNotifications'));
    } catch (error) {
      console.error('Failed to approve', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingRfcId) return;
    setProcessingId(rejectingRfcId);
    try {
      await api.patch(`/api/rfc/${rejectingRfcId}`, { status: 'REJECTED', approverId: user?.id });
      fetchPendingRfcs();
      window.dispatchEvent(new Event('refreshNotifications'));
      setRejectingRfcId(null);
    } catch (error) {
      console.error('Failed to reject', error);
    } finally {
      setProcessingId(null);
    }
  };

 return (
 <div className="space-y-6">
 <div className="animate-fade-in">
        <h1 className="text-3xl font-bold tracking-tight">RFC Approval Queue</h1>
 <p className="text-sm text-muted-foreground mt-1">Review and approve Request for Consumption workflows</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
 <Input
 type="search"
 placeholder="Search pending RFCs..."
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
 ) : rfcs.length > 0 ? (
 <>
 <Table className="whitespace-nowrap">
 <TableHeader className="bg-muted/50">
 <TableRow>
 <TableHead className="w-[120px]">RFC Number</TableHead>
 <TableHead className="w-[250px]">Project / Location</TableHead>
 <TableHead className="w-[150px]">Requestor</TableHead>
 <TableHead className="w-[150px]">Date</TableHead>
 <TableHead className="w-[120px]">Status</TableHead>
 <TableHead className="w-[80px] text-right">Actions</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {rfcs.slice((page - 1) * pageSize, page * pageSize).map((rfc) => (
 <TableRow key={rfc.id} className="hover:bg-muted/30">
 <TableCell className="font-medium text-primary">
 {rfc.rfcNumber}
 </TableCell>
 <TableCell className="whitespace-normal max-w-[250px]">
 <div className="font-medium">{rfc.project?.projectName}</div>
 <div className="flex items-start gap-1.5 text-xs text-muted-foreground mt-1">
 <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
 <span>{rfc.location}</span>
 </div>
 </TableCell>
 <TableCell>
 <div className="text-sm font-medium">{rfc.requestor?.name || 'Unknown'}</div>
 <div className="text-xs text-muted-foreground mt-0.5 border-t pt-1 border-muted/50 inline-block">
  To: {rfc.approver?.name || 'Any Approver'}
 </div>
 </TableCell>
 <TableCell>
 <span className="text-sm">{formatDate(rfc.createdAt)}</span>
 </TableCell>
 <TableCell>
 <StatusBadge status={rfc.status} />
 </TableCell>
 <TableCell className="text-right">
  <div className="flex justify-end gap-2 items-center">
    {rfc.requestDocument && (
      <a 
        href={rfc.requestDocument} 
        target="_blank" 
        rel="noreferrer"
        className="text-xs text-blue-600 hover:underline flex items-center gap-1 mr-2"
        title="View Request Document"
      >
        <FileText className="w-4 h-4" /> View Doc
      </a>
    )}
    
    {/* Activity Log Dropdown/Modal trigger could be added here if we had detailed history. For now, showing 'To' approver is the log. */}
    
  <Link href={`/rfc/${rfc.id}`}>
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
  onClick={() => setRejectingRfcId(rfc.id)}
  disabled={processingId === rfc.id}
  >
  <XCircle className="w-4 h-4 mr-1" /> Reject
  </Button>
  <Button 
  size="sm"
  className="bg-green-600 hover:bg-green-700 text-white h-8 px-2"
  onClick={() => openApproveModal(rfc)}
  disabled={processingId === rfc.id}
  >
  {processingId === rfc.id ? (
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
    totalItems={rfcs.length} 
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
 <p className="text-sm text-muted-foreground mt-1">There are no RFCs waiting for your approval right now.</p>
 </div>
 )}
        </div>
      </div>

      <Dialog open={!!approvingRfc} onOpenChange={(open) => !open && setApprovingRfc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve RFC</DialogTitle>
            <DialogDescription>
              You are about to approve RFC {approvingRfc?.rfcNumber}. If required, please upload the signed document below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="signedDocument">Signed Document (Optional)</Label>
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
              <p className="text-xs text-muted-foreground">Upload the wet-signed version of the document.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovingRfc(null)} disabled={!!processingId}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={!!processingId} className="bg-green-600 hover:bg-green-700 text-white">
              {processingId ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!rejectingRfcId} onOpenChange={(open) => !open && setRejectingRfcId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject RFC</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this Request for Consumption? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingRfcId(null)} disabled={!!processingId}>
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
