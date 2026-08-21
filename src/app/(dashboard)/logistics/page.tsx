'use client';

import { useEffect, useState } from 'react';
import { Truck, Search, Eye, Plus, Loader2, Package, MapPin, MoreHorizontal, Pencil, Trash2, ChevronsUpDown, Check } from 'lucide-react';
import api from '@/lib/api';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import RealTrackingMap from '@/components/map/RealTrackingMap';
import { useRouter } from 'next/navigation';
import { DataTablePagination } from '@/components/shared/DataTablePagination';

export default function LogisticsPage() {
 const { user } = useAuth();
 const router = useRouter();
 const [dos, setDos] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 
 const [page, setPage] = useState(1);
 const [pageSize, setPageSize] = useState(10);
 
  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pos, setPos] = useState<any[]>([]);
  const [poPopoverOpen, setPoPopoverOpen] = useState(false);
 const [poSearch, setPoSearch] = useState('');
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    doNumber: '',
    origin: '',
    destination: '',
    poId: '',
    shippingDate: '',
    notes: '',
    originCoords: '' // e.g. -6.228637, 106.857384
  });

  const fetchDOs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/logistics', { params: { search, type: 'active', limit: 5000 } });
      setDos(data.data || []);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };

  const fetchPOs = async () => {
    try {
      const { data } = await api.get('/api/procurement', { params: { status: 'APPROVED', limit: 100 } });
      setPos(data.data || []);
    } catch (e) {
      console.error('Failed to fetch POs', e);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const { data } = await api.get('/api/warehouse', { params: { limit: 100 } });
      setWarehouses(data.data || []);
    } catch (e) {
      console.error('Failed to fetch Warehouses', e);
    }
  };

  useEffect(() => {
    fetchDOs();
    fetchPOs();
    fetchWarehouses();
    setPage(1);
  }, [search]);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsSubmitting(true);
    try {
      // Parse originCoords if available
      let originLat = null;
      let originLng = null;
      if (formData.originCoords) {
        const parts = formData.originCoords.split(',');
        if (parts.length === 2) {
          originLat = parseFloat(parts[0].trim());
          originLng = parseFloat(parts[1].trim());
        }
      }
      
      const payload = {
        ...formData,
        originLat,
        originLng
      };

      if (editId) {
        await api.put(`/api/logistics/${editId}`, payload);
        toast.success('Delivery Order updated successfully');
      } else {
        await api.post('/api/logistics', payload);
        toast.success('Delivery Order created successfully');
      }
      setIsOpen(false);
      setEditId(null);
      setFormData({ doNumber: '', origin: '', destination: '', poId: '', shippingDate: '', notes: '', originCoords: '' });
      fetchDOs();
 } catch (error: any) {
 console.error('Error creating DO:', error);
 toast.error(error.response?.data?.message || 'Failed to create Delivery Order');
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleDelete = async (id: string) => {
   if (!confirm('Are you sure you want to delete this DO?')) return;
   try {
     await api.delete(`/api/logistics/${id}`);
     toast.success('DO deleted successfully');
     fetchDOs();
   } catch (error: any) {
     toast.error(error.response?.data?.message || 'Failed to delete DO');
   }
 };

  const canEdit = user?.role === 'ADMIN' || user?.role === 'PROCUREMENT' || user?.role === 'SUPER_ADMIN';

 return (
 <div className="space-y-6">
 <div className="animate-fade-in">
        <h1 className="text-2xl font-bold">Delivery Tracking</h1>
 <p className="text-sm text-muted-foreground mt-0.5">Track shipments and delivery orders</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
 <Input 
 type="search" 
 placeholder="Search DO number, location..." 
 value={search} 
 onChange={(e) => setSearch(e.target.value)}
 className="pl-9"
 />
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button onClick={() => {
              setEditId(null);
              setFormData({ doNumber: '', origin: '', destination: '', poId: '', shippingDate: '', notes: '', originCoords: '' });
              setIsOpen(true);
            }} className="gap-2">
              <Plus className="w-4 h-4" /> New DO
            </Button>
          </div>
        )}
      </div>

 <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
 {loading ? (
 <div className="p-8 text-center flex flex-col items-center bg-card border rounded-xl ">
 <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
 <p className="text-muted-foreground">Loading delivery orders...</p>
 </div>
 ) : dos.length > 0 ? (
 <>
 <Table className="whitespace-nowrap">
 <TableHeader>
 <TableRow>
  <TableHead className="w-[150px]">DO Number</TableHead>
  <TableHead className="w-[200px]">Origin</TableHead>
  <TableHead className="w-[200px]">Destination</TableHead>
  <TableHead className="w-[250px]">Project</TableHead>
  <TableHead className="w-[100px]">Items</TableHead>
  <TableHead className="w-[150px]">Shipping Date</TableHead>
  <TableHead className="w-[120px]">Status</TableHead>
 <TableHead className="w-[80px] text-right">Action</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {dos.slice((page - 1) * pageSize, page * pageSize).map((d) => (
 <TableRow key={d.id} className="hover:bg-muted/30">
  <TableCell className="font-medium text-primary">{d.doNumber}</TableCell>
  <TableCell>{d.origin}</TableCell>
  <TableCell>
    {warehouses.find(w => w.id === d.destination)?.name || d.destination || 'Warehouse'}
  </TableCell>
  <TableCell>
    <div>
      <p className="font-medium">{d.project?.projectName || '-'}</p>
      {d.po && <p className="text-xs text-muted-foreground">PO: {d.po.poNumber}</p>}
    </div>
  </TableCell>
  <TableCell>
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      <Package className="w-3 h-3" />
      <span>{d._count?.items || 0} mat</span>
    </div>
  </TableCell>
  <TableCell className="text-muted-foreground">
  {d.shippingDate ? formatDate(d.shippingDate) : '-'}
  </TableCell>
 <TableCell><StatusBadge status={d.status} /></TableCell>
 <TableCell className="text-right">
  <div className="flex justify-end gap-2">
    <Button 
      variant="outline" 
      size="sm" 
      className="text-xs h-8" 
      onClick={() => {
        const url = `${window.location.origin}/track/${d.id}`;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(() => {
            toast.success('Tracking link copied to clipboard! Send this to the driver.');
          }).catch(() => {
            prompt('Please copy this tracking link manually:', url);
          });
        } else {
          // Fallback for non-secure contexts (HTTP non-localhost)
          try {
            const textArea = document.createElement("textarea");
            textArea.value = url;
            // Avoid scrolling to bottom
            textArea.style.top = "0";
            textArea.style.left = "0";
            textArea.style.position = "fixed";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (successful) {
              toast.success('Tracking link copied to clipboard! Send this to the driver.');
            } else {
              prompt('Please copy this tracking link manually:', url);
            }
          } catch (err) {
            prompt('Please copy this tracking link manually:', url);
          }
        }
      }}
    >
      <MapPin className="w-3 h-3 mr-1" /> Copy Link
    </Button>
    <DropdownMenu>
      <DropdownMenuTrigger className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => router.push(`/logistics/${d.id}`)} className="cursor-pointer">
          <Eye className="w-4 h-4 mr-2 text-muted-foreground" />
          View Details
        </DropdownMenuItem>
        {canEdit && (
          <>
            <DropdownMenuItem onClick={() => {
              setEditId(d.id);
              setFormData({
                doNumber: d.doNumber || '',
                origin: d.origin || '',
                destination: d.destination || '',
                poId: d.po?.id || d.poId || '',
                shippingDate: d.shippingDate ? d.shippingDate.split('T')[0] : '',
                notes: d.notes || '',
                originCoords: (d.originLat && d.originLng) ? `${d.originLat}, ${d.originLng}` : ''
              });
              setIsOpen(true);
            }} className="cursor-pointer">
              <Pencil className="w-4 h-4 mr-2 text-muted-foreground" />
              Edit DO
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDelete(d.id)} className="cursor-pointer text-destructive focus:text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete DO
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 <DataTablePagination 
    totalItems={dos.length} 
    pageSize={pageSize} 
    currentPage={page} 
    onPageChange={setPage} 
    onPageSizeChange={setPageSize} 
  />
  </>
 ) : (
 <div className="text-center py-16 bg-card border rounded-xl ">
 <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
 <p className="text-muted-foreground">No active delivery orders found</p>
 {canEdit && (
   <Button variant="link" onClick={() => setIsOpen(true)} className="mt-2">
   Create your first DO
   </Button>
 )}
 </div>
 )}
 </div>

 <Dialog open={isOpen} onOpenChange={setIsOpen}>
 <DialogContent>
 <form onSubmit={handleSubmit}>
 <DialogHeader>
 <DialogTitle>{editId ? 'Edit Delivery Order' : 'New Delivery Order'}</DialogTitle>
 <DialogDescription>{editId ? 'Update delivery order details.' : 'Create a new delivery order to track shipment.'}</DialogDescription>
 </DialogHeader>
 <div className="grid gap-4 py-4">
 <div className="grid gap-2">
 <Label htmlFor="doNumber">DO Number *</Label>
 <Input 
 id="doNumber" 
 placeholder="e.g. DO-2026-001" 
 value={formData.doNumber}
 onChange={(e) => setFormData({...formData, doNumber: e.target.value})}
 required 
 />
 </div>
 <div className="grid gap-2">
 <Label htmlFor="origin">Origin *</Label>
 <Input 
 id="origin" 
 placeholder="e.g. Central Warehouse" 
 value={formData.origin}
 onChange={(e) => setFormData({...formData, origin: e.target.value})}
 required 
 />
 </div>
  <div className="grid gap-2">
    <Label htmlFor="originCoords">Origin Coordinates (Optional)</Label>
    <Input 
      id="originCoords" 
      placeholder="e.g. -6.228637, 106.857384" 
      value={formData.originCoords}
      onChange={(e) => setFormData({...formData, originCoords: e.target.value})}
    />
    <p className="text-xs text-muted-foreground">Latitude and longitude separated by comma.</p>
  </div>
  <div className="grid gap-2">
    <Label htmlFor="destination">Destination (Warehouse) *</Label>
    <select 
      id="destination" 
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      value={formData.destination}
      onChange={(e) => setFormData({...formData, destination: e.target.value})}
      required 
    >
      <option value="">Select destination warehouse...</option>
      {warehouses.map(w => (
        <option key={w.id} value={w.id}>
          {w.name} ({w.code})
        </option>
      ))}
    </select>
  </div>
  <div className="grid gap-2">
    <Label htmlFor="poId">Approved PO *</Label>
    <Popover open={poPopoverOpen} onOpenChange={setPoPopoverOpen}>
      <PopoverTrigger 
        className="flex min-h-10 h-auto w-full max-w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent hover:text-accent-foreground"
        aria-expanded={poPopoverOpen}
      >
        <span className="text-left flex-1 pr-2 break-words whitespace-normal">
          {formData.poId
            ? pos.find((po) => po.id === formData.poId)?.poNumber
            : "Select approved PO..."}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="Search PO number or vendor..."
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
            value={poSearch}
            onChange={(e) => setPoSearch(e.target.value)}
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1">
          {pos.filter(po => `${po.poNumber} ${po.vendor}`.toLowerCase().includes(poSearch.toLowerCase())).length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No PO found.</div>
          ) : (
            pos.filter(po => `${po.poNumber} ${po.vendor}`.toLowerCase().includes(poSearch.toLowerCase())).map(po => (
              <div
                key={po.id}
                className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${formData.poId === po.id ? 'bg-accent text-accent-foreground' : ''}`}
                onClick={() => {
                  setFormData({ ...formData, poId: po.id });
                  setPoPopoverOpen(false);
                }}
              >
                {formData.poId === po.id && (
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    <Check className="h-4 w-4" />
                  </span>
                )}
                {po.poNumber} - {po.vendor}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  </div>
 <div className="grid gap-2">
 <Label htmlFor="shippingDate">Shipping Date</Label>
 <DatePicker 
 value={formData.shippingDate}
 onChange={(value) => setFormData({...formData, shippingDate: value})}
 />
 </div>
 <div className="grid gap-2">
 <Label htmlFor="notes">Notes</Label>
 <Input 
 id="notes" 
 placeholder="Optional notes" 
 value={formData.notes}
 onChange={(e) => setFormData({...formData, notes: e.target.value})}
 />
 </div>
 </div>
 <DialogFooter>
 <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
 Cancel
 </Button>
 <Button type="submit" disabled={isSubmitting}>
 {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
 Save DO
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 </div>
 );
}
