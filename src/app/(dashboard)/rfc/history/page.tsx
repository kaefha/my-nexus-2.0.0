'use client';

import { useEffect, useState } from 'react';
import { FileText, Search, MapPin, Calendar, Clock, Loader2, Printer, History, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import StatusBadge from '@/components/shared/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { DataTablePagination } from '@/components/shared/DataTablePagination';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function RfcHistoryPage() {
 const { user } = useAuth();
 const [rfcs, setRfcs] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [startDate, setStartDate] = useState('');
 const [endDate, setEndDate] = useState('');
 const [sort, setSort] = useState('desc');
 
 const [page, setPage] = useState(1);
 const [pageSize, setPageSize] = useState(10);

 useEffect(() => {
   fetchRfcs();
   setPage(1);
 }, [search, startDate, endDate, sort]);

 const fetchRfcs = async () => {
   setLoading(true);
   try {
     const { data } = await api.get('/api/rfc', { params: { search, status: 'HISTORY', startDate, endDate, sort, limit: 100 } });
     setRfcs(data.data || []);
 } catch (error) {
 console.error(error);
 } finally {
 setLoading(false);
 }
 };

 const handleDeleteRfc = async (id: string) => {
   if (!confirm('Are you sure you want to delete this RFC? This action cannot be undone.')) return;
   try {
     await api.delete(`/api/rfc/${id}`);
     toast.success('RFC deleted successfully');
     fetchRfcs();
   } catch (error) {
     console.error('Failed to delete RFC:', error);
     toast.error('Failed to delete RFC');
   }
 };

 return (
 <div className="space-y-6">
 <div className="animate-fade-in">
        <h1 className="text-3xl font-bold tracking-tight">RFC History</h1>
 <p className="text-sm text-muted-foreground mt-1">View approved and rejected Request for Consumption (RFC) records</p>
      </div>

      <div className="flex flex-col gap-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search RFC history..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="flex items-center gap-1.5">
              <DatePicker 
                value={startDate} 
                onChange={setStartDate} 
                className="w-[130px] h-9 bg-background"
              />
              <span className="text-muted-foreground">-</span>
              <DatePicker 
                value={endDate} 
                onChange={setEndDate} 
                className="w-[130px] h-9 bg-background"
              />
            </div>

            <Select value={sort} onValueChange={(val) => setSort(val || "")}>
              <SelectTrigger className="w-[160px] h-9 bg-background">
                <SelectValue>
                  Sort by: {sort === 'desc' ? 'Newest' : 'Oldest'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Sort by: Newest</SelectItem>
                <SelectItem value="asc">Sort by: Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

 <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
 {loading ? (
 <div className="p-8 text-center flex flex-col items-center bg-card border rounded-xl ">
 <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
 <p className="text-muted-foreground">Loading RFC history...</p>
 </div>
 ) : rfcs.length > 0 ? (
 <>
 <Table className="whitespace-nowrap">
 <TableHeader>
 <TableRow>
 <TableHead className="w-[140px]">RFC Number</TableHead>
 <TableHead className="w-[250px]">Project</TableHead>
 <TableHead className="w-[200px]">Location</TableHead>
 <TableHead className="w-[150px]">Requestor</TableHead>
 <TableHead className="w-[100px]">Items</TableHead>
 <TableHead className="w-[120px]">Status</TableHead>
 <TableHead className="w-[150px] text-right">Action</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {rfcs.slice((page - 1) * pageSize, page * pageSize).map((rfc) => (
 <TableRow key={rfc.id} className="hover:bg-muted/30">
 <TableCell className="font-medium text-primary">
 {rfc.rfcNumber}
 </TableCell>
 <TableCell>
 <div className="font-medium">{rfc.project?.projectName}</div>
 <div className="text-[10px] text-muted-foreground">{rfc.project?.customer}</div>
 </TableCell>
 <TableCell className="whitespace-normal max-w-[300px]">
 <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
 <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
 <span>{rfc.location}</span>
 </div>
 </TableCell>
 <TableCell>
 <div className="flex items-center gap-2">
 <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
 {rfc.requestor?.name?.charAt(0) || 'U'}
 </div>
 <span className="text-sm">{rfc.requestor?.name || 'Unknown'}</span>
 </div>
 </TableCell>
 <TableCell>
 <Badge variant="outline" className="text-xs">
 {rfc._count?.items || 0} items
 </Badge>
 </TableCell>
 <TableCell>
 <StatusBadge status={rfc.status} />
 </TableCell>
  <TableCell className="text-right">
   <div className="flex items-center justify-end gap-3 text-xs">
     {rfc.signedDocument ? (
       <a 
         href={rfc.signedDocument} 
         target="_blank" 
         rel="noreferrer"
         className="text-blue-600 hover:underline flex items-center gap-1"
         title="View Approved Document"
       >
         <FileText className="w-3.5 h-3.5" /> Signed Doc
       </a>
     ) : (
       <Link href={`/print/rfc/${rfc.id}`} target="_blank" className="text-gray-600 hover:text-black hover:underline flex items-center gap-1 border border-gray-300 rounded px-2 py-0.5" title="Print Request PDF">
         <Printer className="w-3 h-3" /> Print PDF
       </Link>
     )}
     {user?.role === 'ADMIN' && (
       <button
         onClick={() => handleDeleteRfc(rfc.id)}
         className="text-destructive hover:bg-destructive/10 rounded p-1 transition-colors ml-1"
         title="Delete RFC"
       >
         <Trash2 className="w-4 h-4" />
       </button>
     )}
     <div className="text-muted-foreground flex items-center gap-1.5">
       <Calendar className="w-3 h-3" />
       {formatDate(rfc.createdAt)}
     </div>
   </div>
  </TableCell>
  </TableRow>
 ))}
 </TableBody>
 </Table>
 <DataTablePagination 
    totalItems={rfcs.length} 
    pageSize={pageSize} 
    currentPage={page} 
    onPageChange={setPage} 
    onPageSizeChange={setPageSize} 
 />
 </>
 ) : (
 <div className="text-center py-16 bg-card border rounded-xl ">
 <History className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
 <p className="text-muted-foreground">No RFC history found</p>
 </div>
 )}
 </div>
 </div>
 );
}
