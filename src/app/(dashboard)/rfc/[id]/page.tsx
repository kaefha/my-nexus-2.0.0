'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, MapPin, Calendar, FileText, Printer, CheckCircle, XCircle, Banknote } from 'lucide-react';
import api from '@/lib/api';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function RfcDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [rfc, setRfc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [signedDocument, setSignedDocument] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRfcDetails();
  }, [resolvedParams.id]);

  const handleApprove = async () => {
    setProcessing(true);
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
        }
      }

      await api.patch(`/api/rfc/${resolvedParams.id}`, { 
        status: 'APPROVED', 
        signedDocument: signedDocumentUrl,
        approverId: user?.id
      });
      
      toast.success('RFC Approved successfully');
      setIsApproveModalOpen(false);
      fetchRfcDetails(); // Refresh details
      window.dispatchEvent(new Event('refreshNotifications'));
    } catch (error) {
      console.error('Failed to approve', error);
      toast.error('Failed to approve RFC');
    } finally {
      setProcessing(false);
    }
  };

  const fetchRfcDetails = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/rfc/${resolvedParams.id}`);
      setRfc(data.data);
    } catch (error: any) {
      toast.error('Failed to load RFC details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading details...</p>
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const grandTotal = rfc?.items?.reduce((sum: number, item: any) => sum + ((parseFloat(item.requestQty) || 0) * (parseFloat(item.unitPrice) || 0)), 0) || 0;

  if (!rfc) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold mb-2">RFC Not Found</h2>
        <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-start md:items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0 mt-1 md:mt-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <span className="break-all">{rfc.rfcNumber}</span>
              <div className="inline-block w-fit">
                <StatusBadge status={rfc.status} />
              </div>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Detailed view of Request for Consumption</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:ml-auto pl-12 md:pl-0">
          {rfc.signedDocument && (
            <Button variant="outline" size="sm" className="sm:size-default" onClick={() => window.open(rfc.signedDocument, '_blank')}>
              <FileText className="w-4 h-4 mr-2" /> Signed Doc
            </Button>
          )}
          <Button variant="default" size="sm" className="sm:size-default" onClick={() => window.open(`/print/rfc/${rfc.id}`, '_blank')}>
            <Printer className="w-4 h-4 mr-2" /> Print PDF
          </Button>
          {rfc.status === 'WAITING_APPROVAL' && (user?.role === 'PROCUREMENT' || user?.role === 'OWNER' || user?.role === 'DIREKTUR' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white sm:size-default" onClick={() => setIsApproveModalOpen(true)}>
              <CheckCircle className="w-4 h-4 mr-2" /> Approve
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Project Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Project Name</p>
              <p className="font-medium">{rfc.project?.projectName || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <div className="flex items-center gap-1.5 font-medium">
                <MapPin className="w-4 h-4 text-primary" /> {rfc.location || '-'}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created At</p>
              <div className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-4 h-4 text-primary" /> 
                {rfc.createdAt ? new Date(rfc.createdAt).toLocaleString() : '-'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Requestor</p>
              <p className="font-medium">{rfc.requestor?.name || '-'}</p>
              <p className="text-xs text-muted-foreground">{rfc.requestor?.role || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Site Approver</p>
              <p className="font-medium">{rfc.siteApproverName || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Finance Approver</p>
              <p className="font-medium">{rfc.financeApproverName || '-'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {rfc.notes && (
        <div className="flex flex-col items-start gap-[3.6px] rounded-[14.4px] bg-card border border-border p-4 w-full">
          <div className="text-sm font-medium">Additional Notes</div>
          <div className="text-sm text-foreground flex flex-col items-start self-stretch p-[10.8px] rounded-[7.2px] bg-muted/50">
            {rfc.notes}
          </div>
        </div>
      )}

      {grandTotal > 0 && (
        <div className="flex flex-col justify-center items-start w-full h-[87px] py-[14.4px] px-0 gap-[14.4px] rounded-[14.4px] border border-border bg-card">
          <div className="w-full flex items-center justify-between px-[14.4px] sm:px-[24px]">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-full text-primary">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estimated Grand Total</p>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                  {formatCurrency(grandTotal)}
                </h3>
              </div>
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-xs text-muted-foreground max-w-[200px]">
                Estimated total based on master material unit prices.
              </p>
            </div>
          </div>
        </div>
      )}

      <Card className="border-0 shadow-none ring-0 bg-transparent">
        <CardHeader className="px-0">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Requested Items</span>
            <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full">
              {rfc.items?.length || 0} items
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="pl-6">Material Code</TableHead>
                <TableHead>Material Name</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Est. Unit Price</TableHead>
                <TableHead className="text-right">Est. Total</TableHead>
                <TableHead className="pr-6">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rfc.items && rfc.items.length > 0 ? (
                rfc.items.map((item: any) => {
                  const qty = parseFloat(item.requestQty) || 0;
                  const price = parseFloat(item.unitPrice) || 0;
                  const total = qty * price;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="pl-6 font-medium text-primary">{item.materialCode}</TableCell>
                      <TableCell>{item.materialName}</TableCell>
                      <TableCell className="text-right font-semibold">{item.requestQty}</TableCell>
                      <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{price > 0 ? formatCurrency(price) : '-'}</TableCell>
                      <TableCell className="text-right font-medium">{price > 0 ? formatCurrency(total) : '-'}</TableCell>
                      <TableCell className="pr-6 text-muted-foreground text-sm max-w-[200px] truncate" title={item.notes}>
                        {item.notes || '-'}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No items requested in this RFC
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {rfc.items && rfc.items.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5} className="text-right pl-6 font-bold">Estimated Grand Total</TableCell>
                  <TableCell className="text-right font-bold text-primary">
                    {formatCurrency(
                      rfc.items.reduce((sum: number, item: any) => sum + ((parseFloat(item.requestQty) || 0) * (parseFloat(item.unitPrice) || 0)), 0)
                    )}
                  </TableCell>
                  <TableCell className="pr-6"></TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isApproveModalOpen} onOpenChange={setIsApproveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve RFC</DialogTitle>
            <DialogDescription>
              You are about to approve RFC {rfc?.rfcNumber}. If required, please upload the signed document below.
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
            <Button variant="outline" onClick={() => setIsApproveModalOpen(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={processing} className="bg-green-600 hover:bg-green-700 text-white">
              {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
