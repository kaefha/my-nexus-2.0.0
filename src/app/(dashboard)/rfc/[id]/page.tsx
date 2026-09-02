'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Package, User, Calendar, MapPin, Upload, Loader2, Save, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import StatusBadge from '@/components/shared/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function RfcDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [rfc, setRfc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Warehouse completion state
  const [takerName, setTakerName] = useState('');
  const [takerDate, setTakerDate] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    fetchRfcDetails();
  }, [params.id]);

  const fetchRfcDetails = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/rfc/${params.id}`);
      setRfc(data.data);
      if (data.data?.takerName) setTakerName(data.data.takerName);
      if (data.data?.takerDate) setTakerDate(data.data.takerDate.substring(0, 10));
      if (data.data?.evidenceDocument) setEvidenceUrl(data.data.evidenceDocument);
    } catch (error) {
      console.error('Failed to fetch RFC details', error);
      toast.error('Failed to load details');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!takerName) return toast.error('Please input the name of the person taking the materials');
    if (!takerDate) return toast.error('Please input the pickup date');
    // Evidence is optional depending on business logic, but let's encourage it or just make it optional.

    setIsCompleting(true);
    try {
      await api.patch(`/api/rfc/${rfc.id}`, {
        status: 'COMPLETED',
        takerName,
        takerDate,
        evidenceDocument: evidenceUrl || null,
        completedBy: user?.id
      });
      toast.success('Materials successfully released and stock deducted!');
      fetchRfcDetails();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to complete RFC');
    } finally {
      setIsCompleting(false);
    }
  };

  if (loading) {
    return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!rfc) {
    return <div className="p-6 text-center text-muted-foreground">RFC not found.</div>;
  }

  const isApproved = rfc.status === 'APPROVED';
  const isCompleted = rfc.status === 'COMPLETED';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{rfc.rfcNumber}</h1>
            <StatusBadge status={rfc.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            Created on {new Date(rfc.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Requested Materials</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rfc.items && rfc.items.length > 0 ? (
                    rfc.items.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.materialName}</div>
                          <div className="text-xs text-muted-foreground">{item.materialCode}</div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{item.requestQty}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{item.notes || '-'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">No items found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {isApproved && (
            <Card className="border-primary/50 shadow-sm">
              <CardHeader className="bg-primary/5 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Warehouse Release Confirmation
                </CardTitle>
                <CardDescription>
                  This request is approved. Please fill out the details below before releasing the materials. This will deduct the stock from the warehouse.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="takerName">Taker Name (Nama Pengambil) <span className="text-destructive">*</span></Label>
                    <Input 
                      id="takerName" 
                      placeholder="e.g. Budi (Teknisi)" 
                      value={takerName}
                      onChange={(e) => setTakerName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="takerDate">Pickup Date (Tanggal Ambil) <span className="text-destructive">*</span></Label>
                    <Input 
                      id="takerDate" 
                      type="date"
                      value={takerDate}
                      onChange={(e) => setTakerDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="evidence">Evidence Document (URL / Photo Link)</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="evidence" 
                        placeholder="https://..." 
                        value={evidenceUrl}
                        onChange={(e) => setEvidenceUrl(e.target.value)}
                      />
                      {/* In a real app, this would be a file upload component */}
                    </div>
                    <p className="text-xs text-muted-foreground">Upload a photo of the recipient with the materials or a signed form.</p>
                  </div>
                </div>
                
                <div className="pt-4 flex justify-end">
                  <Button onClick={handleComplete} disabled={isCompleting || !takerName || !takerDate} className="gap-2">
                    {isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Confirm Release & Deduct Stock
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isCompleted && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Release Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block mb-1">Taken By</span>
                    <span className="font-medium">{rfc.takerName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Pickup Date</span>
                    <span className="font-medium">{rfc.takerDate ? new Date(rfc.takerDate).toLocaleDateString() : '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Processed By (Warehouse)</span>
                    <span className="font-medium">{rfc.completedByName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Completed At</span>
                    <span className="font-medium">{rfc.completedAt ? new Date(rfc.completedAt).toLocaleString() : '-'}</span>
                  </div>
                  {rfc.evidenceDocument && (
                    <div className="col-span-2 mt-2">
                      <span className="text-muted-foreground block mb-1">Evidence Document</span>
                      <a href={rfc.evidenceDocument} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                        <FileText className="h-4 w-4" /> View Document
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <span className="text-muted-foreground flex items-center gap-2 mb-1"><MapPin className="h-4 w-4" /> Source Warehouse</span>
                <span className="font-medium">{rfc.warehouse?.name || '-'}</span>
              </div>
              <Separator />
              <div>
                <span className="text-muted-foreground flex items-center gap-2 mb-1"><FileText className="h-4 w-4" /> Project</span>
                <span className="font-medium">{rfc.project?.projectName || '-'}</span>
              </div>
              {rfc.notes && (
                <>
                  <Separator />
                  <div>
                    <span className="text-muted-foreground flex items-center gap-2 mb-1">Notes / Purpose</span>
                    <span>{rfc.notes}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Activity Log</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative pl-6 border-l-2 border-muted space-y-6">
                <div className="relative">
                  <div className="absolute -left-[29px] bg-background p-1 rounded-full">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Requested</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{new Date(rfc.createdAt).toLocaleString()}</p>
                    <p className="text-xs mt-1">By {rfc.requestor?.name || 'Unknown'}</p>
                  </div>
                </div>

                {rfc.approvedAt && (
                  <div className="relative">
                    <div className="absolute -left-[29px] bg-background p-1 rounded-full">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Approved</p>
                      <p className="text-muted-foreground text-xs mt-0.5">{new Date(rfc.approvedAt).toLocaleString()}</p>
                      <p className="text-xs mt-1">By {rfc.approver?.name || 'Unknown'}</p>
                    </div>
                  </div>
                )}
                
                {rfc.completedAt && (
                  <div className="relative">
                    <div className="absolute -left-[29px] bg-background p-1 rounded-full">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Completed (Materials Released)</p>
                      <p className="text-muted-foreground text-xs mt-0.5">{new Date(rfc.completedAt).toLocaleString()}</p>
                      <p className="text-xs mt-1">By {rfc.completedByName || 'Unknown'}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
