'use client';

import { useEffect, useState } from 'react';
import { Warehouse, Search, Plus, Loader2, Pencil, Trash2, MapPin, Upload, Image as ImageIcon, X, ExternalLink, Map, Globe, Check, ChevronsUpDown, MoreHorizontal, Eye, PackagePlus } from 'lucide-react';
import api from '@/lib/api';
import StatusBadge from '@/components/shared/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ExcelImportExport } from '@/components/ExcelImportExport';
import { toast } from 'sonner';
import { DataTablePagination } from '@/components/shared/DataTablePagination';
import { Badge } from '@/components/ui/badge';
import { ManualStockEntryModal } from '@/components/warehouse/ManualStockEntryModal';
import { useRouter } from 'next/navigation';

export default function WarehousePage() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('name-asc');
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Preview state
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Project Search State
  const [projectSearch, setProjectSearch] = useState('');

  // Manual Stock Entry State
  const [stockEntryOpen, setStockEntryOpen] = useState(false);
  const [stockEntryWarehouseId, setStockEntryWarehouseId] = useState('');

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    location: '',
    coordinates: '',
    evidence: '',
    type: 'MAIN',
    capacity: '',
    status: 'ACTIVE',
    picName: '',
    projectIds: [] as string[]
  });

  const [isUploading, setIsUploading] = useState(false);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/warehouse', { params: { search, type: filterType, status: filterStatus, sort: sortBy } });
      setWarehouses(data.data || []);
    } catch (e) { 
      console.error(e);
      toast.error('Failed to load warehouses');
    } finally { 
      setLoading(false); 
    }
  };

  const fetchProjects = async () => {
    try {
      const { data } = await api.get('/api/projects?limit=100');
      setProjectsList(data.data || []);
    } catch (e) {
      console.error('Failed to fetch projects', e);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchWarehouses();
    setPage(1);
    setSelectedIds([]);
  }, [search, filterType, filterStatus, sortBy]);

  const currentPageWarehouses = warehouses.slice((page - 1) * pageSize, page * pageSize);
  const currentPageIds = currentPageWarehouses.map(w => w.id);

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
    setFormData({ code: '', name: '', location: '', coordinates: '', evidence: '', type: 'MAIN', capacity: '', status: 'ACTIVE', picName: '', projectIds: [] });
    setProjectSearch('');
    setIsOpen(true);
  };

  const openEditDialog = (w: any) => {
    setEditId(w.id);
    setFormData({
      code: w.code,
      name: w.name,
      location: w.location || '',
      coordinates: w.coordinates || '',
      evidence: w.evidence || '',
      type: w.type || 'MAIN',
      capacity: w.capacity ? w.capacity.toString() : '',
      status: w.status || 'ACTIVE',
      picName: w.picName || '',
      projectIds: w.projects ? w.projects.map((p: any) => p.id) : []
    });
    setProjectSearch('');
    setIsOpen(true);
  };

  const openStockEntryDialog = (w: any) => {
    setStockEntryWarehouseId(w.id);
    setStockEntryOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const formDataObj = new FormData();
    formDataObj.append('file', file);
    
    setIsUploading(true);
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataObj,
      });
      const data = await response.json();
      if (response.ok && data.url) {
        setFormData({ ...formData, evidence: data.url });
      } else {
        toast.error(data.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('An error occurred while uploading.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editId) {
        await api.put('/api/warehouse', { id: editId, ...formData, capacity: parseInt(formData.capacity) || 0 });
      } else {
        await api.post('/api/warehouse', { ...formData, capacity: parseInt(formData.capacity) || 0 });
      }
      setIsOpen(false);
      fetchWarehouses();
      toast.success(`Warehouse ${editId ? 'updated' : 'created'} successfully`);
    } catch (error) {
      console.error('Error saving warehouse:', error);
      toast.error('Failed to save Warehouse');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/api/warehouse?id=${deleteId}`);
      setDeleteOpen(false);
      setSelectedIds(prev => prev.filter(id => id !== deleteId));
      fetchWarehouses();
      toast.success('Warehouse deleted successfully');
    } catch (error) {
      console.error('Failed to delete warehouse', error);
      toast.error('Failed to delete warehouse');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsSubmitting(true);
    try {
      await api.delete('/api/warehouse', { data: { ids: selectedIds } });
      toast.success(`Successfully deleted ${selectedIds.length} warehouses`);
      setSelectedIds([]);
      setBulkDeleteOpen(false);
      fetchWarehouses();
    } catch (error: any) {
      console.error('Failed to bulk delete warehouses', error);
      const errMsg = error.response?.data?.message || 'Failed to delete selected warehouses';
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImport = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/api/warehouse/excel', formData, {
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

      fetchWarehouses();
    } catch (e: any) {
      console.error(e);
      const errMsg = e.response?.data?.message || 'Failed to import Excel';
      toast.error(errMsg);
    }
  };

  const handleExport = async () => {
    window.location.href = '/api/warehouse/excel?action=export';
  };

  const handleDownloadTemplate = () => {
    window.location.href = '/api/warehouse/excel?action=template';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Warehouse Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage storage locations and capacity</p>
        </div>
        <div className="flex items-center gap-3 bg-card border rounded-xl px-4 py-3 shadow-sm shrink-0">
          <div className="bg-primary/10 p-2.5 rounded-lg">
            <Warehouse className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-0.5">Total Warehouses</p>
            <p className="text-2xl font-bold leading-none">{warehouses.length}</p>
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
              <Plus className="w-4 h-4" /> New Warehouse
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
                placeholder="Search warehouse code or name..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
          </div>
          <div className="w-[150px]">
            <Label className="text-xs mb-1.5 block text-muted-foreground">Filter by Type</Label>
            <Select value={filterType} onValueChange={(val) => setFilterType(val || "")}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="MAIN">Main Hub</SelectItem>
                <SelectItem value="SITE">Site Storage</SelectItem>
                <SelectItem value="TRANSIT">Transit Point</SelectItem>
              </SelectContent>
            </Select>
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
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
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
            {selectedIds.length} warehouse dipilih
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
            <p className="text-muted-foreground">Loading warehouses...</p>
          </div>
        ) : warehouses.length > 0 ? (
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
                  <TableHead className="w-[150px]">Code</TableHead>
                  <TableHead className="w-[250px]">Name</TableHead>
                  <TableHead className="w-[150px]">PIC</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[80px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentPageWarehouses.map((w) => {
                  const isSelected = selectedIds.includes(w.id);
                  return (
                    <TableRow 
                      key={w.id} 
                      className={`hover:bg-muted/30 ${isSelected ? 'bg-muted/50' : ''}`}
                    >
                      <TableCell className="w-[40px]">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectRow(w.id, !!checked)}
                          aria-label={`Select ${w.code}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-primary w-[150px] whitespace-normal break-words">
                        {w.code}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium whitespace-normal max-w-[250px]">
                          <span 
                            className="line-clamp-2 block leading-snug break-words"
                            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                            title={w.name}
                          >
                            {w.name}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[250px] mt-1" title={w.location}>
                          {w.location}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{w.picName || '-'}</div>
                      </TableCell>
                      <TableCell><StatusBadge status={w.status} /></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => router.push(`/warehouse/${w.id}`)} className="cursor-pointer">
                              <Eye className="mr-2 h-4 w-4" />
                              <span>Lihat Detil</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(w)} className="cursor-pointer">
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openStockEntryDialog(w)} className="cursor-pointer">
                              <PackagePlus className="mr-2 h-4 w-4" />
                              <span>Tambah Stok Manual</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setDeleteId(w.id); setDeleteOpen(true); }} className="cursor-pointer text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Hapus</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <DataTablePagination 
              totalItems={warehouses.length} 
              pageSize={pageSize} 
              currentPage={page} 
              onPageChange={setPage} 
              onPageSizeChange={setPageSize} 
            />
          </>
        ) : (
          <div className="text-center py-16 bg-card border rounded-xl ">
            <Warehouse className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No warehouses found</p>
            <Button variant="link" onClick={openCreateDialog} className="mt-2">
              Create your first Warehouse
            </Button>
          </div>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Warehouse' : 'New Warehouse'}</DialogTitle>
              <DialogDescription>{editId ? 'Update warehouse details.' : 'Add a new warehouse location.'}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="code">Warehouse Code *</Label>
                  <Input 
                    id="code" 
                    placeholder="e.g. WH-JKT-01" 
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    required 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Warehouse Name *</Label>
                  <Input 
                    id="name" 
                    placeholder="e.g. Jakarta Central Hub" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="location">Location / Address</Label>
                  <Input 
                    id="location" 
                    placeholder="e.g. Jl. Sudirman No. 123" 
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="coordinates">Coordinates (Lat, Long)</Label>
                  <Input 
                    id="coordinates" 
                    placeholder="e.g. -6.2234, 106.8463" 
                    value={formData.coordinates}
                    onChange={(e) => setFormData({...formData, coordinates: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val || "" })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MAIN">Main Hub</SelectItem>
                      <SelectItem value="SITE">Site Storage</SelectItem>
                      <SelectItem value="TRANSIT">Transit Point</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="capacity">Capacity (CBM)</Label>
                  <Input 
                    id="capacity" 
                    type="number"
                    placeholder="e.g. 5000" 
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="picName">PIC (Person In Charge)</Label>
                  <Input 
                    id="picName" 
                    placeholder="e.g. John Doe" 
                    value={formData.picName}
                    onChange={(e) => setFormData({...formData, picName: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {editId ? (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val || "" })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                        <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : <div className="hidden md:block" />}
                
                <div className="flex flex-col gap-2 min-w-0">
                  <Label>Warehouse Evidence (Photo)</Label>
                  <div className="flex flex-col gap-3 min-w-0">
                    {!formData.evidence && (
                      <Button variant="outline" type="button" className="relative overflow-hidden cursor-pointer w-full sm:w-fit">
                        {isUploading ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                        ) : (
                          <><Upload className="w-4 h-4 mr-2" /> Select File</>
                        )}
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          onChange={handleFileUpload} 
                          disabled={isUploading}
                        />
                      </Button>
                    )}
                    {formData.evidence && (
                      <div className="flex items-center justify-between p-2.5 border rounded-xl bg-card w-full shadow-sm overflow-hidden">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border">
                            <img src={formData.evidence} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="text-sm font-medium truncate">{formData.evidence.split('/').pop()?.split('?')[0] || 'evidence_file'}</span>
                            <span className="text-xs text-muted-foreground uppercase">{formData.evidence.split('.').pop()?.split('?')[0] || 'IMG'} • File</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" type="button" onClick={() => setFormData({ ...formData, evidence: '' })} className="h-8 w-8 text-muted-foreground shrink-0">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2 pt-4 border-t">
                <Label>Assigned Projects</Label>
                <div className="text-sm text-muted-foreground mb-2">Pilih project yang menggunakan gudang ini.</div>
                
                <Popover>
                  <PopoverTrigger render={<Button variant="outline" role="combobox" className="w-full justify-between font-normal h-auto py-2.5" />}>
                    {formData.projectIds.length > 0 
                      ? `${formData.projectIds.length} project dipilih` 
                      : "Pilih project..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
                    <div className="flex items-center border-b px-3">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <Input 
                        placeholder="Cari project..." 
                        className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-[220px] overflow-y-auto p-2">
                      {projectsList
                        .filter(p => 
                          (p.projectName || p.name || '').toLowerCase().includes(projectSearch.toLowerCase()) || 
                          (p.projectCode || p.code || '').toLowerCase().includes(projectSearch.toLowerCase())
                        )
                        .map(p => (
                          <label key={p.id} className="flex items-start gap-2 cursor-pointer rounded-md p-2 hover:bg-muted/50">
                            <Checkbox 
                              checked={formData.projectIds.includes(p.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormData({...formData, projectIds: [...formData.projectIds, p.id]});
                                } else {
                                  setFormData({...formData, projectIds: formData.projectIds.filter(id => id !== p.id)});
                                }
                              }}
                            />
                            <div className="grid gap-0.5 min-w-0">
                              <span className="text-sm font-medium leading-none truncate">{p.projectCode || p.code}</span>
                              <span className="text-xs text-muted-foreground truncate">{p.projectName || p.name}</span>
                            </div>
                          </label>
                      ))}
                      {projectsList.filter(p => (p.projectName || p.name || '').toLowerCase().includes(projectSearch.toLowerCase()) || (p.projectCode || p.code || '').toLowerCase().includes(projectSearch.toLowerCase())).length === 0 && (
                        <div className="p-4 text-center text-sm text-muted-foreground">Tidak ada project ditemukan.</div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {formData.projectIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {projectsList.filter(p => formData.projectIds.includes(p.id)).map(p => (
                      <Badge key={p.id} variant="secondary" className="px-2 py-1 font-medium">
                        {p.projectCode || p.code}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editId ? 'Save Changes' : 'Save Warehouse'}
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
              Are you sure you want to delete this warehouse? This action cannot be undone.
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
              Apakah Anda yakin ingin menghapus <strong>{selectedIds.length} warehouse</strong> yang dipilih? Tindakan ini tidak dapat dibatalkan.
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

      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
              Evidence Preview
            </div>
            <div className="flex items-center gap-2">
              {previewImage && (
                <Button variant="outline" size="sm">
                  <a href={previewImage} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" /> Open in new tab
                  </a>
                </Button>
              )}
            </div>
          </div>
          <div className="bg-muted p-4 flex items-center justify-center min-h-[300px]">
            {previewImage && (
              <img src={previewImage} alt="Preview" className="max-w-full max-h-[70vh] rounded-md shadow-sm border bg-background" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="sm:max-w-3xl p-1 bg-transparent border-none shadow-none">
          {previewImage && (
            <img src={previewImage} alt="Preview Evidence" className="w-full h-auto rounded-xl object-contain max-h-[80vh]" />
          )}
        </DialogContent>
      </Dialog>



      <ManualStockEntryModal 
        isOpen={stockEntryOpen}
        onClose={() => setStockEntryOpen(false)}
        warehouseId={stockEntryWarehouseId}
        onSuccess={() => {
          fetchWarehouses();
        }}
      />
    </div>
  );
}
