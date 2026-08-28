'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Send, Printer, Upload, FileText } from 'lucide-react';
import api from '@/lib/api';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  
  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Upload Signed Doc state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploadForApproval, setIsUploadForApproval] = useState(false);
  const [signedDocument, setSignedDocument] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchPO = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/procurement/${id}`);
      setPo(data.data);
    } catch (error) {
      console.error('Error fetching PO details:', error);
      toast.error('Failed to load PO details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPO();
  }, [id]);

  const updatePOStatus = async (status: string) => {
    if (!po) return;
    try {
      const payload: any = { status };
      if ((status === 'APPROVED' || status === 'REJECTED') && user?.id) {
        payload.approverId = user.id;
      }
      await api.patch(`/api/procurement/${po.id}/status`, payload);
      toast.success(`PO status updated to ${status}`);
      fetchPO();
    } catch (error) {
      console.error('Failed to update status', error);
      toast.error('Failed to update PO status');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">PO not found.</p>
        <Link href="/procurement">
          <Button variant="link">Back to list</Button>
        </Link>
      </div>
    );
  }

  const isProcurement = ['PROCUREMENT', 'ADMIN', 'OWNER', 'SUPER_ADMIN'].includes(user?.role || '');

  return (
    <div className="space-y-6 animate-fade-in max-w-[1400px] mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/procurement">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">PO Details: {po.poNumber}</h1>
            <StatusBadge status={po.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">Vendor: {po.vendor}</p>
        </div>
        <div className="flex gap-2">
          {po.signedDocumentUrl ? (
            <Button variant="outline" onClick={() => window.open(po.signedDocumentUrl, '_blank')} className="gap-2">
              <FileText className="w-4 h-4" /> Download Signed PO
            </Button>
          ) : (
            <Button variant="outline" onClick={() => window.open(`/print/po/${po.id}`, '_blank')} className="gap-2">
              <Printer className="w-4 h-4" /> Print PDF
            </Button>
          )}
          {isProcurement && !(po.status === 'WAITING_APPROVAL' && user?.id === po.approverId) && (
            <Button onClick={() => setIsUploadOpen(true)} className="gap-2">
              <Upload className="w-4 h-4" /> Upload Signed Doc
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              {po.items && po.items.length > 0 ? (
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Material</TableHead>
                      <TableHead className="w-[100px] text-right">Quantity</TableHead>
                      <TableHead className="w-[250px]">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {po.items.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.materialName || 'Unknown Material'}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{item.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground italic bg-muted/20 p-4 rounded text-center">No items found for this PO.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-muted-foreground text-xs mb-1 uppercase tracking-wider font-semibold">Expected Date</p>
                <p className="text-sm">{po.expectedDate ? formatDate(po.expectedDate) : '-'}</p>
              </div>
              {po.transporter && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1 uppercase tracking-wider font-semibold">Transporter / Ekspedisi</p>
                  <p className="text-sm font-medium">{po.transporter}</p>
                </div>
              )}
              {(po.driverName || po.vehicleNumber) && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-muted-foreground text-xs mb-1 uppercase tracking-wider font-semibold">Driver</p>
                    <p className="text-sm">{po.driverName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1 uppercase tracking-wider font-semibold">Vehicle</p>
                    <p className="text-sm">{po.vehicleNumber || '-'}</p>
                  </div>
                </div>
              )}
              {po.deliverTo && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1 uppercase tracking-wider font-semibold">Deliver To</p>
                  <p className="text-sm">{po.deliverTo}</p>
                </div>
              )}
              {po.rfcId && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1 uppercase tracking-wider font-semibold">Reference RFC ID</p>
                  <p className="font-mono text-xs break-all bg-muted/30 p-2 rounded mt-1">{po.rfcId}</p>
                </div>
              )}
              {po.notes && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1 uppercase tracking-wider font-semibold">Notes</p>
                  <p className="bg-muted/30 p-3 rounded-md text-sm text-muted-foreground">{po.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {po.approverName && (
            <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-100 dark:border-green-900">
              <CardContent className="p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">
                    {po.status === 'APPROVED' ? 'Approved By' : po.status === 'REJECTED' ? 'Rejected By' : 'Assigned Approver'}
                  </p>
                  <p className="font-medium text-sm">
                    {po.approverName}
                  </p>
                  <p className="text-muted-foreground text-xs">{po.approverRole}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {po.status === 'WAITING_APPROVAL' && user?.id === po.approverId && (
            <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Pending Action</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => { setIsUploadForApproval(true); setIsUploadOpen(true); }}>
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Approve (Upload Doc)
                </Button>
                <Button variant="destructive" className="w-full" onClick={() => updatePOStatus('REJECTED')}>
                  <XCircle className="w-4 h-4 mr-1" /> Reject
                </Button>
              </CardContent>
            </Card>
          )}
          {po.status === 'DRAFT' && isProcurement && (
            <Button className="w-full bg-amber-600 hover:bg-amber-700" onClick={() => updatePOStatus('WAITING_APPROVAL')}>
              <Send className="w-4 h-4 mr-2" />
              Submit for Approval
            </Button>
          )}
        </div>
      </div>

      <Dialog open={isUploadOpen} onOpenChange={(open) => { setIsUploadOpen(open); if (!open) { setSignedDocument(null); setIsUploadForApproval(false); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isUploadForApproval ? 'Approve PO & Upload Document' : 'Upload Signed Purchase Order'}</DialogTitle>
            <DialogDescription>
              {isUploadForApproval 
                ? 'To approve this PO, you must upload the signed PDF document.' 
                : 'Upload the signed PDF version of this Purchase Order.'}
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
            </div>
          </div>
          <DialogFooter className="sm:justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsUploadOpen(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button 
              disabled={!signedDocument || isUploading} 
              onClick={async () => {
                setIsUploading(true);
                try {
                  const uploadData = new FormData();
                  uploadData.append('file', signedDocument as Blob);
                  const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: uploadData,
                  });
                  
                  if (!uploadRes.ok) throw new Error('Failed to upload document');
                  const { url } = await uploadRes.json();
                  
                  const payload: any = { signedDocumentUrl: url };
                  if (isUploadForApproval) {
                    payload.status = 'APPROVED';
                    if (user?.id) payload.approverId = user.id;
                    await api.patch(`/api/procurement/${po.id}/status`, payload);
                  } else {
                    await api.patch(`/api/procurement/${po.id}`, payload);
                  }
                  
                  toast.success(isUploadForApproval ? 'PO Approved successfully' : 'Signed document uploaded successfully');
                  setIsUploadOpen(false);
                  setIsUploadForApproval(false);
                  fetchPO();
                } catch (error) {
                  toast.error('Failed to upload document');
                } finally {
                  setIsUploading(false);
                }
              }}
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
