'use client';

import { useEffect, useState } from 'react';
import { Building2, Search, Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExcelImportExport } from '@/components/ExcelImportExport';
import { toast } from 'sonner';
import { DataTablePagination } from '@/components/shared/DataTablePagination';

export default function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('name-asc');
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const [formData, setFormData] = useState({
    vendorCode: '',
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    isActive: true
  });

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/vendors', { params: { search, status: filterStatus, sort: sortBy } });
      setVendors(data.data || []);
    } catch (e) { 
      console.error(e);
      toast.error('Failed to load vendors');
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchVendors();
    setPage(1);
    setSelectedIds([]);
  }, [search, filterStatus, sortBy]);

  const currentPageVendors = vendors.slice((page - 1) * pageSize, page * pageSize);
  const currentPageIds = currentPageVendors.map(v => v.id);

  const isAllCurrentPageSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.includes(id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(Array.from(new Set([...selectedIds, ...currentPageIds])));
    } else {
      setSelectedIds(selectedIds.filter(id => !currentPageIds.includes(id)));
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const openCreateDialog = () => {
    setEditId(null);
    setFormData({ vendorCode: '', name: '', contactPerson: '', email: '', phone: '', address: '', isActive: true });
    setIsOpen(true);
  };

  const openEditDialog = (vendor: any) => {
    setEditId(vendor.id);
    setFormData({
      vendorCode: vendor.vendorCode,
      name: vendor.name,
      contactPerson: vendor.contactPerson || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      address: vendor.address || '',
      isActive: vendor.isActive,
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editId) {
        await api.put('/api/vendors', { id: editId, ...formData });
      } else {
        await api.post('/api/vendors', formData);
      }
      setIsOpen(false);
      fetchVendors();
      toast.success(`Vendor ${editId ? 'updated' : 'created'} successfully`);
    } catch (error) {
      console.error('Error saving vendor:', error);
      toast.error('Failed to save Vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/api/vendors?id=${deleteId}`);
      setDeleteOpen(false);
      setSelectedIds(prev => prev.filter(id => id !== deleteId));
      fetchVendors();
      toast.success('Vendor deleted successfully');
    } catch (error) {
      console.error('Failed to delete vendor', error);
      toast.error('Failed to delete vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsSubmitting(true);
    try {
      await api.delete('/api/vendors', { data: { ids: selectedIds } });
      toast.success(`Successfully deleted ${selectedIds.length} vendors`);
      setSelectedIds([]);
      setBulkDeleteOpen(false);
      fetchVendors();
    } catch (error: any) {
      console.error('Failed to bulk delete vendors', error);
      const errMsg = error.response?.data?.message || 'Failed to delete selected vendors';
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImport = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/api/vendors/excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const { count, createdCount, updatedCount, errors } = res.data;
      let msg = `Import succeeded. ${count} item(s) processed.`;
      if (createdCount !== undefined && updatedCount !== undefined) {
        msg = `Import berhasil: ${createdCount} baru dibuat, ${updatedCount} diperbarui.`;
      }
      toast.success(msg);

      if (errors && errors.length > 0) {
        toast.warning(`${errors.length} item ada catatan/peringatan`, {
          description: errors.slice(0, 3).join(', ')
        });
      }

      fetchVendors();
    } catch (e: any) {
      console.error(e);
      const errMsg = e.response?.data?.message || 'Failed to import Excel';
      toast.error(errMsg);
    }
  };

  const handleExport = async () => {
    window.location.href = '/api/vendors/excel?action=export';
  };

  const handleDownloadTemplate = () => {
    window.location.href = '/api/vendors/excel?action=template';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Vendor Master Data</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your network of suppliers and partners</p>
        </div>
        <div className="flex items-center gap-3 bg-card border rounded-xl px-4 py-3 shadow-sm shrink-0">
          <div className="bg-primary/10 p-2.5 rounded-lg">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-0.5">Total Vendors</p>
            <p className="text-2xl font-bold leading-none">{vendors.length}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="flex flex-wrap justify-between items-center gap-3">
          <ExcelImportExport 
            onImport={handleImport} 
            onExport={handleExport} 
            onDownloadTemplate={handleDownloadTemplate} 
            isLoading={loading} 
          />
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                className="gap-2 h-9"
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="w-4 h-4" />
                Hapus Terpilih ({selectedIds.length})
              </Button>
            )}
            <Button onClick={openCreateDialog} className="gap-2 shrink-0 h-9">
              <Plus className="w-4 h-4" /> Add Vendor
            </Button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 items-end bg-card p-4 rounded-xl border border-border">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs mb-1.5 block text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search vendor code or name..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
          </div>
          <div className="w-[150px]">
            <Label className="text-xs mb-1.5 block text-muted-foreground">Filter by Status</Label>
            <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val || "")}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-[180px]">
            <Label className="text-xs mb-1.5 block text-muted-foreground">Sort By</Label>
            <Select value={sortBy} onValueChange={(val) => setSortBy(val || "")}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="code-asc">Code (A-Z)</SelectItem>
                <SelectItem value="code-desc">Code (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Selected Items Notification Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-primary/10 border border-primary/20 p-3 rounded-lg animate-fade-in">
          <span className="text-sm font-medium text-primary">
            {selectedIds.length} vendor dipilih
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds([])}
            >
              Batal Pilih
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="w-4 h-4" />
              Hapus ({selectedIds.length})
            </Button>
          </div>
        </div>
      )}

      <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
        {loading ? (
          <div className="p-8 text-center flex flex-col items-center bg-card border rounded-xl ">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading vendors...</p>
          </div>
        ) : vendors.length > 0 ? (
          <>
            <Table className="whitespace-nowrap">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={isAllCurrentPageSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all on current page"
                    />
                  </TableHead>
                  <TableHead className="w-[150px]">Vendor Code</TableHead>
                  <TableHead className="w-[350px]">Vendor Name</TableHead>
                  <TableHead className="w-[200px]">Contact Person</TableHead>
                  <TableHead className="w-[200px]">Contact Info</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[80px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentPageVendors.map((v) => {
                  const isSelected = selectedIds.includes(v.id);
                  return (
                    <TableRow 
                      key={v.id} 
                      className={`hover:bg-muted/30 ${isSelected ? 'bg-muted/50' : ''}`}
                    >
                      <TableCell className="w-[40px]">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectRow(v.id, !!checked)}
                          aria-label={`Select ${v.vendorCode}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-primary w-[150px] whitespace-normal break-words">
                        {v.vendorCode}
                      </TableCell>
                      <TableCell className="font-medium whitespace-normal max-w-[350px]">
                        <span 
                          className="line-clamp-2 block leading-snug break-words"
                          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                          title={v.name}
                        >
                          {v.name}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-normal max-w-[200px]">
                        <span 
                          className="line-clamp-2 block leading-snug break-words"
                          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                          title={v.contactPerson || '-'}
                        >
                          {v.contactPerson || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {v.email && <div className="truncate max-w-[200px]" title={v.email}>{v.email}</div>}
                          {v.phone && <div className="text-muted-foreground truncate max-w-[200px]" title={v.phone}>{v.phone}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {v.isActive ? (
                          <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 font-normal">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500 bg-gray-50 border-gray-200 font-normal">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEditDialog(v)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { setDeleteId(v.id); setDeleteOpen(true); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <DataTablePagination 
              totalItems={vendors.length} 
              pageSize={pageSize} 
              currentPage={page} 
              onPageChange={setPage} 
              onPageSizeChange={setPageSize} 
            />
          </>
        ) : (
          <div className="text-center py-16 bg-card border rounded-xl ">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No vendors found</p>
            <Button variant="link" onClick={openCreateDialog} className="mt-2">
              Register your first vendor
            </Button>
          </div>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
              <DialogDescription>{editId ? 'Update vendor information.' : 'Register a new supplier or partner.'}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="vendorCode">Vendor Code *</Label>
                  <Input 
                    id="vendorCode" 
                    placeholder="e.g. VND-001" 
                    value={formData.vendorCode}
                    onChange={(e) => setFormData({...formData, vendorCode: e.target.value})}
                    required 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Vendor Name *</Label>
                  <Input 
                    id="name" 
                    placeholder="e.g. PT Maju Jaya" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required 
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input 
                  id="contactPerson" 
                  placeholder="e.g. Budi Santoso" 
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email"
                    placeholder="e.g. contact@majujaya.com" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    placeholder="e.g. 021-1234567" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="address">Address</Label>
                <Textarea 
                  id="address" 
                  placeholder="Vendor's full address..." 
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
              {editId && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.isActive ? "ACTIVE" : "INACTIVE"} onValueChange={(val) => setFormData({...formData, isActive: val === "ACTIVE"})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editId ? 'Save Changes' : 'Save Vendor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Single Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this vendor? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus Banyak ({selectedIds.length} item)</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus <strong>{selectedIds.length} vendor</strong> yang dipilih? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setBulkDeleteOpen(false)}>
              Batal
            </Button>
            <Button type="button" variant="destructive" onClick={confirmBulkDelete} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hapus Semua ({selectedIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
