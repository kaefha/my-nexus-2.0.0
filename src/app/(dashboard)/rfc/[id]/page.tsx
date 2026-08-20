'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, MapPin, Calendar, FileText, Printer, CheckCircle, XCircle } from 'lucide-react';
import api from '@/lib/api';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

export default function RfcDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [rfc, setRfc] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRfcDetails();
  }, [resolvedParams.id]);

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
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            {rfc.rfcNumber}
            <StatusBadge status={rfc.status} />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Detailed view of Request for Consumption</p>
        </div>
        <div className="ml-auto flex gap-2">
          {rfc.signedDocument && (
            <Button variant="outline" onClick={() => window.open(rfc.signedDocument, '_blank')}>
              <FileText className="w-4 h-4 mr-2" /> Signed Doc
            </Button>
          )}
          <Button variant="default" onClick={() => window.open(`/print/rfc/${rfc.id}`, '_blank')}>
            <Printer className="w-4 h-4 mr-2" /> Print PDF
          </Button>
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
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm">Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground bg-muted/30 p-3 rounded-md">{rfc.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
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
                <TableHead className="pr-6">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rfc.items && rfc.items.length > 0 ? (
                rfc.items.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="pl-6 font-medium text-primary">{item.materialCode}</TableCell>
                    <TableCell>{item.materialName}</TableCell>
                    <TableCell className="text-right font-semibold">{item.requestQty}</TableCell>
                    <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                    <TableCell className="pr-6 text-muted-foreground text-sm max-w-[200px] truncate" title={item.notes}>
                      {item.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No items requested in this RFC
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
