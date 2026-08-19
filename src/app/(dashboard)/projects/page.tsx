'use client';

import { useEffect, useState } from 'react';
import { FolderKanban, Plus, Search, MapPin, Calendar, Users, Loader2, Pencil, Trash2, History, GitCommit, FileText, CheckCircle2, PlayCircle, PauseCircle, Phone, MoreHorizontal, Eye, Hash } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { DataTablePagination } from '@/components/shared/DataTablePagination';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    projectCode: '',
    projectName: '',
    customer: '',
    region: '',
    startDate: '',
    pic: '',
    whatsappNumber: '',
    projectType: '',
    status: 'PLANNING'
  });

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // View State
  const [viewProject, setViewProject] = useState<any | null>(null);

  // Activity Log State
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [selectedProjectName, setSelectedProjectName] = useState('');

  useEffect(() => {
    fetchProjects();
    setPage(1); // Reset page on filter change
  }, [search, filterStartDate, filterEndDate, sortBy]);

  const fetchProjects = async () => {
    try {
      const { data } = await api.get('/api/projects', { params: { search, limit: 5000, startDate: filterStartDate, endDate: filterEndDate, sort: sortBy } });
      setProjects(data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openActivityLog = async (project: any) => {
    setSelectedProjectName(project.projectName);
    setIsLogOpen(true);
    setLoadingActivities(true);
    setActivities([]);
    try {
      const { data } = await api.get(`/api/projects/activities/${project.id}`);
      setActivities(data.data || []);
    } catch (error) {
      console.error('Failed to load activities', error);
    } finally {
      setLoadingActivities(false);
    }
  };

  const getActivityIcon = (action: string, statusText: string = '') => {
    if (action === 'CREATED') return <FileText className="w-4 h-4" />;
    if (action === 'STATUS_CHANGED') {
      const st = statusText.toLowerCase();
      if (st.includes('completed')) return <CheckCircle2 className="w-4 h-4" />;
      if (st.includes('progress') || st.includes('start')) return <PlayCircle className="w-4 h-4" />;
      if (st.includes('hold')) return <PauseCircle className="w-4 h-4" />;
    }
    return <GitCommit className="w-4 h-4" />;
  };

  const renderActivityDetails = (details: string) => {
    const match = details.match(/Status changed from (.*) to (.*)/);
    if (match) {
      return (
        <span className="flex items-center flex-wrap gap-x-1.5 gap-y-1 mt-1">
          Status changed from <StatusBadge status={match[1]} /> to <StatusBadge status={match[2]} />
        </span>
      );
    }
    return details;
  };

  const openCreateDialog = () => {
    setEditId(null);
    setFormData({ projectCode: '', projectName: '', customer: '', region: '', startDate: '', pic: '', whatsappNumber: '', projectType: '', status: 'PLANNING' });
    setIsOpen(true);
  };

  const openEditDialog = (project: any) => {
    setEditId(project.id);
    setFormData({
      projectCode: project.projectCode || '',
      projectName: project.projectName,
      customer: project.customer,
      region: project.region,
      startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
      pic: project.pic,
      whatsappNumber: project.whatsappNumber || '',
      projectType: project.projectType || '',
      status: project.status || 'PLANNING'
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editId) {
        await api.put('/api/projects', { id: editId, ...formData });
        toast.success('Project updated successfully');
      } else {
        await api.post('/api/projects', formData);
        toast.success('Project created successfully');
      }
      setIsOpen(false);
      fetchProjects();
    } catch (error: any) {
      console.error('Failed to save project:', error);
      const errMsg = error.response?.data?.message || 'Failed to save project';
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/api/projects?id=${deleteId}`);
      toast.success('Project deleted successfully');
      setDeleteId(null);
      fetchProjects();
    } catch (error: any) {
      console.error('Failed to delete project:', error);
      const errMsg = error.response?.data?.message || 'Failed to delete project';
      toast.error(errMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your network infrastructure projects and core Project IDs</p>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Project' : 'Create Project'}</DialogTitle>
            <DialogDescription>
              {editId ? 'Update the details of this project.' : 'Add a new project to your inventory management system.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="projectCode">Project ID / Code (Auto-generated if empty)</Label>
              <Input
                id="projectCode"
                placeholder="e.g. PRJ-2026-001"
                value={formData.projectCode}
                onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name *</Label>
              <Input
                id="projectName"
                placeholder="e.g. Fiber Optic Jkt-Bdg"
                required
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer">Customer / Client</Label>
              <Input
                id="customer"
                placeholder="e.g. PT Telkom"
                required
                value={formData.customer}
                onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Region / Area</Label>
              <Input
                id="region"
                placeholder="e.g. Jawa Barat"
                required
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <DatePicker
                value={formData.startDate}
                onChange={(value) => setFormData({ ...formData, startDate: value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pic">PIC (Person in Charge)</Label>
              <Input
                id="pic"
                placeholder="e.g. John Doe"
                required
                value={formData.pic}
                onChange={(e) => setFormData({ ...formData, pic: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
              <Input
                id="whatsappNumber"
                placeholder="e.g. 628123456789"
                value={formData.whatsappNumber}
                onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectType">Project Type</Label>
              <Select value={formData.projectType} onValueChange={(val) => setFormData({ ...formData, projectType: val || "" })}>
                <SelectTrigger id="projectType" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FTTx">FTTx</SelectItem>
                  <SelectItem value="OSP">OSP</SelectItem>
                  <SelectItem value="ISP">ISP</SelectItem>
                  <SelectItem value="Tower">Tower</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editId && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val || "" })}>
                  <SelectTrigger id="status" className="w-full">
                    {formData.status ? (
                      <span>
                        {formData.status === 'PLANNING' && 'Planning'}
                        {formData.status === 'IN_PROGRESS' && 'In Progress'}
                        {formData.status === 'COMPLETED' && 'Completed'}
                        {formData.status === 'ON_HOLD' && 'On Hold'}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Select status</span>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANNING">Planning</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editId ? 'Save Changes' : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This will permanently delete this project and all of its data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Search and Action */}
      <div className="flex flex-col gap-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="flex justify-end items-center">
          <Button className="gap-2 w-full sm:w-auto" onClick={openCreateDialog}>
            <Plus className="w-4 h-4" /> New Project
          </Button>
        </div>

        <div className="flex flex-wrap gap-4 items-end bg-card p-4 rounded-xl border border-border">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs mb-1.5 block text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search project ID, name, or client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
          </div>
          <div className="w-[160px]">
            <Label className="text-xs mb-1.5 block text-muted-foreground">Start Date From</Label>
            <DatePicker
              value={filterStartDate}
              onChange={(value) => setFilterStartDate(value)}
            />
          </div>
          <div className="w-[160px]">
            <Label className="text-xs mb-1.5 block text-muted-foreground">Start Date To</Label>
            <DatePicker
              value={filterEndDate}
              onChange={(value) => setFilterEndDate(value)}
            />
          </div>
          <div className="w-[180px]">
            <Label className="text-xs mb-1.5 block text-muted-foreground">Sort By</Label>
            <Select value={sortBy} onValueChange={(val) => setSortBy(val || "")}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
        {loading ? (
          <div className="p-8 text-center flex flex-col items-center bg-card border rounded-xl ">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading projects...</p>
          </div>
        ) : projects.length > 0 ? (
          <>
            <Table className="whitespace-nowrap">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Project ID</TableHead>
                  <TableHead className="w-[250px]">Project Name</TableHead>
                  <TableHead className="w-[200px]">Customer</TableHead>
                  <TableHead className="w-[200px]">Region</TableHead>
                  <TableHead className="w-[150px]">Start Date</TableHead>
                  <TableHead className="w-[200px]">PIC</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[80px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.slice((page - 1) * pageSize, page * pageSize).map((project) => (
                  <TableRow key={project.id} className="hover:bg-muted/30 group">
                    <TableCell className="font-medium text-primary w-[150px]">
                      <div className="flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-primary opacity-70" />
                        <span>{project.projectCode || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <FolderKanban className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          {project.projectName}
                        </div>
                        {project.projectType && (
                          <Badge variant="outline" className="w-fit mt-1 text-[10px] h-4 px-1.5 font-normal">
                            {project.projectType}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{project.customer}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {project.region}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatDate(project.startDate)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="w-3 h-3" />
                          {project.pic}
                        </div>
                        {project.whatsappNumber && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3 text-green-600" />
                            <a href={`https://wa.me/${project.whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-green-600 transition-colors">
                              {project.whatsappNumber}
                            </a>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={project.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 shadow-lg">
                          <DropdownMenuItem onClick={() => setViewProject(project)} className="cursor-pointer">
                            <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                            Lihat Detil
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openActivityLog(project)} className="cursor-pointer">
                            <History className="mr-2 h-4 w-4 text-muted-foreground" />
                            Activity Log
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(project)} className="cursor-pointer">
                            <Pencil className="mr-2 h-4 w-4 text-muted-foreground" />
                            Edit Project
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeleteId(project.id)} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <DataTablePagination 
              totalItems={projects.length} 
              pageSize={pageSize} 
              currentPage={page} 
              onPageChange={setPage} 
              onPageSizeChange={setPageSize} 
            />
          </>
        ) : (
          <div className="text-center py-16 bg-card border rounded-xl ">
            <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No projects found</p>
            <Button variant="link" onClick={openCreateDialog} className="mt-2">
              Create your first project
            </Button>
          </div>
        )}
      </div>
      
      <Sheet open={isLogOpen} onOpenChange={setIsLogOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Activity Log</SheetTitle>
            <SheetDescription>History of changes for {selectedProjectName}</SheetDescription>
          </SheetHeader>
          
          <div className="relative border-l ml-6 pl-6 space-y-6">
            {loadingActivities ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : activities.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No activities found.</p>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="relative">
                  <div className="absolute -left-[37px] bg-background border p-1 rounded-full text-muted-foreground shadow-sm">
                    {getActivityIcon(act.action, act.details)}
                  </div>
                  <div className="pt-0.5">
                    <div className="text-sm text-foreground leading-relaxed">{renderActivityDetails(act.details)}</div>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(act.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!viewProject} onOpenChange={(open) => !open && setViewProject(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-primary" />
              {viewProject?.projectName}
            </DialogTitle>
            <DialogDescription>
              Detailed project information
            </DialogDescription>
          </DialogHeader>
          
          {viewProject && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Project ID</span>
                <p className="font-medium text-sm text-primary font-mono">{viewProject.projectCode || '-'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Customer</span>
                <p className="font-medium text-sm">{viewProject.customer}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Region</span>
                <p className="font-medium text-sm flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {viewProject.region}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Type</span>
                <p className="font-medium text-sm">{viewProject.projectType || '-'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Status</span>
                <div><StatusBadge status={viewProject.status} /></div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Start Date</span>
                <p className="font-medium text-sm flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {viewProject.startDate ? formatDate(viewProject.startDate) : '-'}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">PIC</span>
                <p className="font-medium text-sm flex items-center gap-1">
                  <Users className="w-3 h-3" /> {viewProject.pic}
                </p>
              </div>
              {viewProject.whatsappNumber && (
                <div className="space-y-1 col-span-2">
                  <span className="text-xs text-muted-foreground">WhatsApp</span>
                  <p className="font-medium text-sm flex items-center gap-1">
                    <Phone className="w-3 h-3 text-green-600" />
                    <a href={`https://wa.me/${viewProject.whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-green-600 transition-colors">
                      {viewProject.whatsappNumber}
                    </a>
                  </p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setViewProject(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
