'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Loader2, Search, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function CreatePOPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('editId');
  
  const [loading, setLoading] = useState(false);
  const [isFetchingRfc, setIsFetchingRfc] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [approvedRfcs, setApprovedRfcs] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    poNumber: '',
    vendor: '',
    rfcId: '',
    expectedDate: '',
    notes: '',
    transporter: '',
    driverName: '',
    vehicleNumber: '',
    deliverTo: '',
    approverId: '',
    subject: '',
    items: [] as any[]
  });

  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorPopoverOpen, setVendorPopoverOpen] = useState(false);
  
  const [rfcSearch, setRfcSearch] = useState('');
  const [rfcPopoverOpen, setRfcPopoverOpen] = useState(false);

  const [approverSearch, setApproverSearch] = useState('');
  const [approverPopoverOpen, setApproverPopoverOpen] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [rfcRes, vendorRes, usersRes] = await Promise.all([
        api.get('/api/rfc?status=APPROVED'),
        api.get('/api/vendors'),
        api.get('/api/users')
      ]);
      setApprovedRfcs(rfcRes.data.data || []);
      setVendors(vendorRes.data.data || []);
      setUsers(usersRes.data.data || []);
      
      if (editId) {
        const { data } = await api.get(`/api/procurement/${editId}`);
        const po = data.data;
        setFormData({
          poNumber: po.poNumber || '',
          vendor: po.vendor || '',
          rfcId: po.rfcId || '',
          expectedDate: po.expectedDate ? new Date(po.expectedDate).toISOString().split('T')[0] : '',
          notes: po.notes || '',
          transporter: po.transporter || '',
          driverName: po.driverName || '',
          vehicleNumber: po.vehicleNumber || '',
          deliverTo: po.deliverTo || '',
          approverId: po.approverId || '',
          subject: po.subject || '',
          items: po.items || []
        });
      }
    } catch (err) {
      console.error('Failed to load initial data', err);
      toast.error('Failed to load initial data');
    } finally {
      setLoadingInitial(false);
    }
  };

  const handleRfcChange = async (rfcId: string) => {
    if (rfcId === 'none' || !rfcId) {
      setFormData(prev => ({ ...prev, rfcId: '', items: [] }));
      return;
    }
    
    setFormData(prev => ({ ...prev, rfcId }));
    
    setIsFetchingRfc(true);
    try {
      const { data } = await api.get(`/api/rfc/${rfcId}`);
      if (data?.data?.items) {
        const mappedItems = data.data.items.map((item: any) => ({
          ...item,
          quantity: item.requestQty
        }));
        setFormData(prev => ({ ...prev, rfcId, items: mappedItems }));
      }
    } catch (error) {
      console.error('Failed to fetch RFC details', error);
    } finally {
      setIsFetchingRfc(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editId) {
        await api.put(`/api/procurement/${editId}`, formData);
        toast.success('PO updated successfully');
      } else {
        await api.post('/api/procurement', formData);
        toast.success('PO created successfully');
      }
      router.push('/procurement');
    } catch (err: any) {
      console.error('Failed to submit PO', err);
      toast.error(err.response?.data?.message || (editId ? 'Failed to update PO' : 'Failed to create PO'));
    } finally {
      setLoading(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-4 animate-fade-in">
        <Link href="/procurement">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{editId ? 'Edit Purchase Order' : 'Create Purchase Order'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {editId ? 'Update the details of this PO.' : 'Fill in the details to generate a new PO.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
            <CardDescription>Primary details for this purchase order.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="poNumber">PO Number <span className="text-destructive">*</span></Label>
                <Input 
                  id="poNumber" 
                  placeholder="e.g. PO-2026-001" 
                  value={formData.poNumber}
                  onChange={(e) => setFormData({...formData, poNumber: e.target.value})}
                  required 
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="subject">Perihal (Subject)</Label>
                <Input 
                  id="subject" 
                  placeholder="e.g. Delivery Order Material" 
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rfcRef">Reference RFC Number</Label>
                <Popover open={rfcPopoverOpen} onOpenChange={setRfcPopoverOpen}>
                  <PopoverTrigger
                      className="flex min-h-10 h-auto w-full max-w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="text-left flex-1 pr-2 break-words whitespace-normal">
                      {formData.rfcId
                        ? approvedRfcs.find((r) => r.id === formData.rfcId)?.rfcNumber
                        : "Select an approved RFC (Optional)"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </PopoverTrigger>
                  <PopoverContent className="w-(--anchor-width) min-w-[300px] p-0" align="start">
                    <div className="flex items-center border-b px-3">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <Input
                        placeholder="Search RFC number..."
                        className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                        value={rfcSearch}
                        onChange={(e) => setRfcSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1">
                      <div
                        className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${!formData.rfcId ? 'bg-accent text-accent-foreground' : ''}`}
                        onClick={() => {
                          handleRfcChange('');
                          setRfcPopoverOpen(false);
                        }}
                      >
                        {!formData.rfcId && (
                          <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                            <Check className="h-4 w-4" />
                          </span>
                        )}
                        None (Manual PO)
                      </div>
                      {approvedRfcs.filter(r => 
                          r.rfcNumber.toLowerCase().includes(rfcSearch.toLowerCase())
                        ).map(r => (
                          <div
                            key={r.id}
                            className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${formData.rfcId === r.id ? 'bg-accent text-accent-foreground' : ''}`}
                            onClick={() => {
                              handleRfcChange(r.id);
                              setRfcPopoverOpen(false);
                            }}
                          >
                            {formData.rfcId === r.id && (
                              <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                <Check className="h-4 w-4" />
                              </span>
                            )}
                            {r.rfcNumber}
                          </div>
                        ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor Name <span className="text-destructive">*</span></Label>
                <Popover open={vendorPopoverOpen} onOpenChange={setVendorPopoverOpen}>
                  <PopoverTrigger
                      className="flex min-h-10 h-auto w-full max-w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="text-left flex-1 pr-2 break-words whitespace-normal">
                      {formData.vendor || "Select a vendor..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </PopoverTrigger>
                  <PopoverContent className="w-(--anchor-width) min-w-[300px] p-0" align="start">
                    <div className="flex items-center border-b px-3">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <Input
                        placeholder="Search vendor name..."
                        className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                        value={vendorSearch}
                        onChange={(e) => setVendorSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1">
                      {vendors.filter(v => 
                          v.name.toLowerCase().includes(vendorSearch.toLowerCase())
                        ).map(v => (
                          <div
                            key={v.id}
                            className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${formData.vendor === v.name ? 'bg-accent text-accent-foreground' : ''}`}
                            onClick={() => {
                              setFormData({ ...formData, vendor: v.name });
                              setVendorPopoverOpen(false);
                            }}
                          >
                            {formData.vendor === v.name && (
                              <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                <Check className="h-4 w-4" />
                              </span>
                            )}
                            {v.name}
                          </div>
                        ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expectedDate">Expected Date</Label>
                <DatePicker 
                  value={formData.expectedDate}
                  onChange={(value) => setFormData({...formData, expectedDate: value})}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="approverId">Approval Destination <span className="text-destructive">*</span></Label>
                <Popover open={approverPopoverOpen} onOpenChange={setApproverPopoverOpen}>
                  <PopoverTrigger
                      className="flex min-h-10 h-auto w-full max-w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="text-left flex-1 pr-2 break-words whitespace-normal">
                      {formData.approverId
                        ? (() => {
                            const u = users.find((u) => u.id === formData.approverId);
                            return u ? `${u.name} (${u.role})` : "Select approver...";
                          })()
                        : "Select approver..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </PopoverTrigger>
                  <PopoverContent className="w-(--anchor-width) min-w-[300px] p-0" align="start">
                    <div className="flex items-center border-b px-3">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <Input
                        placeholder="Search approver..."
                        className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                        value={approverSearch}
                        onChange={(e) => setApproverSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1">
                      {users.filter(u => u.name.toLowerCase().includes(approverSearch.toLowerCase())).length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">No approver found.</div>
                      ) : (
                        users.filter(u => u.name.toLowerCase().includes(approverSearch.toLowerCase())).map(u => (
                          <div
                            key={u.id}
                            className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${formData.approverId === u.id ? 'bg-accent text-accent-foreground' : ''}`}
                            onClick={() => {
                              setFormData({...formData, approverId: u.id});
                              setApproverPopoverOpen(false);
                            }}
                          >
                            {formData.approverId === u.id && (
                              <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                <Check className="h-4 w-4" />
                              </span>
                            )}
                            {u.name} ({u.role})
                          </div>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Input 
                  id="notes" 
                  placeholder="Optional notes" 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '200ms' }}>
          <CardHeader>
            <CardTitle>Logistics & Delivery</CardTitle>
            <CardDescription>Details for the shipping and delivery.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transporter">Transporter / Ekspedisi</Label>
                <Input 
                  id="transporter" 
                  placeholder="e.g. PT. Lintas Benua Ekspres" 
                  value={formData.transporter}
                  onChange={(e) => setFormData({...formData, transporter: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="driverName">Driver Name</Label>
                <Input 
                  id="driverName" 
                  placeholder="e.g. Budi Santoso" 
                  value={formData.driverName}
                  onChange={(e) => setFormData({...formData, driverName: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="vehicleNumber">Truck / Vehicle Number</Label>
                <Input 
                  id="vehicleNumber" 
                  placeholder="e.g. B 9012 CDE" 
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData({...formData, vehicleNumber: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="deliverTo">Deliver To</Label>
                <Input 
                  id="deliverTo" 
                  placeholder="e.g. Proyek Pembangunan Jalur Kereta Api Lintas Makassar - Parepare" 
                  value={formData.deliverTo}
                  onChange={(e) => setFormData({...formData, deliverTo: e.target.value})}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {formData.items?.length > 0 && (
          <Card className="animate-fade-in" style={{ animationDelay: '300ms' }}>
            <CardHeader>
              <CardTitle>Auto-filled Items from RFC</CardTitle>
              <CardDescription>The following items will be linked to this PO.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 bg-muted/20 p-4 rounded-lg border text-sm">
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {formData.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center bg-background px-3 py-2 rounded-md border">
                      <span className="truncate pr-2 font-medium">{item.materialName}</span>
                      <span className="font-semibold whitespace-nowrap bg-primary/10 text-primary px-2 py-1 rounded">
                        {item.quantity} units
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-end gap-4 pt-4">
          <Link href="/procurement">
            <Button variant="outline" type="button" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading} className="min-w-[120px]">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {editId ? 'Save Changes' : 'Create PO'}
          </Button>
        </div>
      </form>
    </div>
  );
}
