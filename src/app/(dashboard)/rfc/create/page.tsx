'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, Plus, Trash2, Download, Search, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';

export default function CreateRfcPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingRequirements, setLoadingRequirements] = useState(false);
  
  // Data for dropdowns
  const [projects, setProjects] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    projectId: '',
    location: '',
    requestorId: '',
    requestDate: '',
    approvalDestination: '',
    notes: '',
  });
  
  const [projectSearch, setProjectSearch] = useState('');
  const [projectPopoverOpen, setProjectPopoverOpen] = useState(false);
  const [approverSearch, setApproverSearch] = useState('');
  const [approverPopoverOpen, setApproverPopoverOpen] = useState(false);

  const [materialSearchState, setMaterialSearchState] = useState<Record<number, string>>({});
  const [materialPopoverOpenState, setMaterialPopoverOpenState] = useState<Record<number, boolean>>({});

  const [requestDocument, setRequestDocument] = useState<File | null>(null);

  const [items, setItems] = useState<any[]>([
    { materialId: '', requestQty: 1, notes: '' }
  ]);

  useEffect(() => {
    Promise.all([
      api.get('/api/projects').then(res => setProjects(res.data.data)),
      api.get('/api/materials').then(res => setMaterials(res.data.data)),
      api.get('/api/users').then(res => setUsers(res.data.data))
    ]).catch(err => console.error('Failed to load initial data', err));
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    setFormData(prev => ({ ...prev, requestDate: today }));
  }, []);

  useEffect(() => {
    if (user?.id) {
      setFormData(prev => ({ ...prev, requestorId: user.id }));
    }
  }, [user]);

  const handleAddItem = () => {
    setItems([...items, { materialId: '', requestQty: 1, notes: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleLoadRequirements = async () => {
    if (!formData.projectId) return;
    setLoadingRequirements(true);
    try {
      const res = await api.get(`/api/projects/requirements?projectId=${formData.projectId}`);
      const reqs = res.data.data;
      if (reqs && reqs.length > 0) {
        const newItems = reqs.map((r: any) => ({
          materialId: r.materialId,
          requestQty: r.estimatedQty || 1,
          notes: r.notes || ''
        }));
        setItems(newItems);
        toast.success('Material requirements loaded successfully');
      } else {
        toast.error('No material requirements found for this project.');
      }
    } catch (err) {
      console.error('Failed to load requirements', err);
      toast.error('Failed to load project requirements.');
    } finally {
      setLoadingRequirements(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let requestDocumentUrl = null;
      if (requestDocument) {
        const uploadData = new FormData();
        uploadData.append('file', requestDocument);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadData,
        });
        
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          requestDocumentUrl = url;
        } else {
          throw new Error('Failed to upload document');
        }
      }

      await api.post('/api/rfc', {
        ...formData,
        requestDocument: requestDocumentUrl,
        items: items.filter(item => item.materialId) // Only submit valid items
      });
      toast.success('RFC submitted successfully');
      router.push('/rfc');
    } catch (error) {
      console.error('Error submitting RFC', error);
      toast.error('Failed to submit RFC');
    } finally {
      setLoading(false);
    }
  };

  const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link href="/rfc">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create New RFC</h1>
          <p className="text-sm text-muted-foreground">Request materials for consumption in a project</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
            <CardDescription>Select the project and provide delivery details.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="projectId">Project</Label>
                <Popover open={projectPopoverOpen} onOpenChange={setProjectPopoverOpen}>
                  <PopoverTrigger
                      className="flex min-h-10 h-auto w-full max-w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="text-left flex-1 pr-2 break-words whitespace-normal">
                      {formData.projectId
                        ? (() => {
                            const selectedProj = projects.find((p) => p.id === formData.projectId);
                            return selectedProj 
                              ? `${selectedProj.projectCode ? `[${selectedProj.projectCode}] ` : ''}${selectedProj.projectName}` 
                              : "Select a project...";
                          })()
                        : "Select a project..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </PopoverTrigger>
                  <PopoverContent className="w-(--anchor-width) min-w-[300px] p-0" align="start">
                    <div className="flex items-center border-b px-3">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <Input
                        placeholder="Search project ID or name..."
                        className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1">
                      {projects.filter(p => `${p.projectCode || ''} ${p.projectName} ${p.customer || ''}`.toLowerCase().includes(projectSearch.toLowerCase())).length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">No project found.</div>
                      ) : (
                        projects.filter(p => `${p.projectCode || ''} ${p.projectName} ${p.customer || ''}`.toLowerCase().includes(projectSearch.toLowerCase())).map(p => (
                          <div
                            key={p.id}
                            className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${formData.projectId === p.id ? 'bg-accent text-accent-foreground' : ''}`}
                            onClick={() => {
                              setFormData({...formData, projectId: p.id});
                              setProjectPopoverOpen(false);
                            }}
                          >
                            {formData.projectId === p.id && (
                              <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                <Check className="h-4 w-4" />
                              </span>
                            )}
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-primary text-xs font-mono">{p.projectCode || '-'}</span>
                                <span className="font-medium text-sm">{p.projectName}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{p.customer} • {p.region}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="requestorId">Requestor (PIC)</Label>
                <Input 
                  id="requestorId" 
                  value={user?.name || ''} 
                  disabled 
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requestDate">Request Date</Label>
                <DatePicker 
                  value={formData.requestDate}
                  onChange={(value) => setFormData({...formData, requestDate: value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="approvalDestination">Approval Destination</Label>
                <Popover open={approverPopoverOpen} onOpenChange={setApproverPopoverOpen}>
                  <PopoverTrigger
                      className="flex min-h-10 h-auto w-full max-w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="text-left flex-1 pr-2 break-words whitespace-normal">
                      {formData.approvalDestination
                        ? (() => {
                            const u = users.find((u) => u.id === formData.approvalDestination);
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
                      {users.filter(u => ['PROCUREMENT', 'ADMIN', 'OWNER'].includes(u.role) && u.name.toLowerCase().includes(approverSearch.toLowerCase())).length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">No approver found.</div>
                      ) : (
                        users.filter(u => ['PROCUREMENT', 'ADMIN', 'OWNER'].includes(u.role) && u.name.toLowerCase().includes(approverSearch.toLowerCase())).map(u => (
                          <div
                            key={u.id}
                            className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${formData.approvalDestination === u.id ? 'bg-accent text-accent-foreground' : ''}`}
                            onClick={() => {
                              setFormData({...formData, approvalDestination: u.id});
                              setApproverPopoverOpen(false);
                            }}
                          >
                            {formData.approvalDestination === u.id && (
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
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="location">Delivery Location(s)</Label>
                <Textarea 
                  id="location" 
                  placeholder="e.g. Segment 1, Segment 2, or full address" 
                  required 
                  className="min-h-[116px]"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requestDocument">Supporting Document (Optional)</Label>
                <Input 
                  id="requestDocument" 
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setRequestDocument(e.target.files[0]);
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">Upload the original scanned document for the approver to review.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes / Purpose</Label>
                <Input 
                  id="notes" 
                  placeholder="Optional notes for this request" 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Material Items</CardTitle>
              <CardDescription>Add materials needed for this RFC.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {formData.projectId && (
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleLoadRequirements} 
                  disabled={loadingRequirements} 
                  className="gap-2"
                >
                  {loadingRequirements ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
                  Auto-fill from Project
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="gap-2">
                <Plus className="w-4 h-4" /> Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => {
              const selectedMaterial = materials.find(m => m.id === item.materialId);
              const uom = selectedMaterial ? selectedMaterial.unit : '-';
              
              return (
                <div key={index} className="flex items-start gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1">
                    <div className="space-y-2 md:col-span-4">
                      <Label>Material</Label>
                      <Popover 
                        open={materialPopoverOpenState[index] || false} 
                        onOpenChange={(open) => setMaterialPopoverOpenState(prev => ({...prev, [index]: open}))}
                      >
                        <PopoverTrigger
                            className="flex min-h-10 h-auto w-full max-w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent hover:text-accent-foreground"
                          >
                            <span className="text-left flex-1 pr-2 break-words whitespace-normal">
                            {item.materialId
                              ? (() => {
                                  const m = materials.find((m) => m.id === item.materialId);
                                  return m ? `[${m.materialCode}] - ${m.materialName}` : "Select material...";
                                })()
                              : "Select material..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </PopoverTrigger>
                        <PopoverContent className="w-[600px] max-w-[90vw] p-0" align="start">
                          <div className="flex items-center border-b px-3">
                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                            <Input
                              placeholder="Search material code or name..."
                              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                              value={materialSearchState[index] || ''}
                              onChange={(e) => setMaterialSearchState(prev => ({...prev, [index]: e.target.value}))}
                            />
                          </div>
                          <div className="max-h-[300px] overflow-y-auto p-1">
                            {(() => {
                              const srch = (materialSearchState[index] || '').toLowerCase();
                              const filtered = materials.filter(m => 
                                m.materialCode.toLowerCase().includes(srch) || 
                                m.materialName.toLowerCase().includes(srch)
                              );
                              if (filtered.length === 0) return <div className="py-6 text-center text-sm text-muted-foreground">No material found.</div>;
                              return filtered.map(m => (
                                <div
                                  key={m.id}
                                  className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${item.materialId === m.id ? 'bg-accent text-accent-foreground' : ''}`}
                                  onClick={() => {
                                    handleItemChange(index, 'materialId', m.id);
                                    setMaterialPopoverOpenState(prev => ({...prev, [index]: false}));
                                  }}
                                >
                                  {item.materialId === m.id && (
                                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                      <Check className="h-4 w-4" />
                                    </span>
                                  )}
                                  [{m.materialCode}] - {m.materialName}
                                </div>
                              ));
                            })()}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="space-y-2 md:col-span-1">
                      <Label>Satuan</Label>
                      <div className="flex h-10 w-full items-center justify-center rounded-md border border-input bg-muted/50 text-sm font-medium text-muted-foreground">
                        {uom}
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>Vol. Minta</Label>
                      <Input 
                        type="number" 
                        min="1" 
                        required 
                        value={item.requestQty}
                        onChange={(e) => handleItemChange(index, 'requestQty', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2 md:col-span-2">
                      <Label>Vol. Beri</Label>
                      <Input 
                        type="number" 
                        disabled 
                        placeholder="0"
                        title="Diisi oleh Approver"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-3">
                      <Label>SN / Keterangan</Label>
                      <Input 
                        placeholder="e.g. SN12345 or Notes" 
                        value={item.notes}
                        onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                      />
                    </div>
                  </div>
                  {items.length > 1 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="mt-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/rfc">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Submit RFC
          </Button>
        </div>
      </form>
    </div>
  );
}
