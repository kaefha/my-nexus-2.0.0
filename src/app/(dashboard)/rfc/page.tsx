'use client';

import { useEffect, useState } from 'react';
import { FileText, Plus, Search, Calendar, Filter, Eye } from 'lucide-react';
import api from '@/lib/api';
import StatusBadge from '@/components/shared/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataTablePagination } from '@/components/shared/DataTablePagination';
import Link from 'next/link';

export default function ConsumptionRfcPage() {
 const [rfcs, setRfcs] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [status, setStatus] = useState('ALL');
 const [startDate, setStartDate] = useState('');
 const [endDate, setEndDate] = useState('');
 const [sort, setSort] = useState('desc');
 const [page, setPage] = useState(1);
 const [pageSize, setPageSize] = useState(10);

 useEffect(() => {
   fetchRfcs();
   setPage(1);
 }, [search, status, startDate, endDate, sort]);

 const fetchRfcs = async () => {
   setLoading(true);
   try {
     const { data } = await api.get('/api/rfc', { params: { search, status, startDate, endDate, sort, limit: 100 } });
     setRfcs(data.data || []);
   } catch (error) {
     console.error('Failed to fetch consumption RFCs', error);
   } finally {
     setLoading(false);
   }
 };

 const resetFilters = () => {
   setSearch('');
   setStatus('ALL');
   setStartDate('');
   setEndDate('');
   setSort('desc');
 };

 return (
   <div className="space-y-6">
     <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
       <div>
         <h1 className="text-3xl font-bold tracking-tight">Request for Consumption (RFC)</h1>
         <p className="text-muted-foreground mt-1">Manage and track material consumption requests.</p>
       </div>
       <div className="flex items-center gap-2">
         <Link href="/rfc/create">
           <Button className="gap-2">
             <Plus className="h-4 w-4" />
             New RFC
           </Button>
         </Link>
       </div>
     </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search RFC number, project..."
                className="pl-8 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="md:col-span-3">
              <Select value={status} onValueChange={(val) => setStatus(val || 'ALL')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="WAITING_APPROVAL">Waiting Approval</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-5 flex flex-wrap sm:flex-nowrap gap-2 w-full">
              <div className="flex-1 w-full min-w-[120px]">
                <DatePicker
                  value={startDate || undefined}
                  onChange={(d: any) => setStartDate(d ? new Date(d).toISOString() : '')}
                />
              </div>
              <div className="flex-1 w-full min-w-[120px]">
                <DatePicker
                  value={endDate || undefined}
                  onChange={(d: any) => setEndDate(d ? new Date(d).toISOString() : '')}
                />
              </div>
              <Button variant="outline" onClick={resetFilters} className="shrink-0 gap-2 w-full sm:w-auto">
                <Filter className="h-4 w-4" />
                <span className="sm:hidden">Reset Filter</span>
              </Button>
            </div>
          </div>


         <Table>
           <TableHeader>
             <TableRow className="bg-muted/50">
               <TableHead className="w-[180px]">RFC Number</TableHead>
               <TableHead>Project</TableHead>
               <TableHead>Warehouse</TableHead>
               <TableHead>Requestor</TableHead>
               <TableHead>Items</TableHead>
               <TableHead>Date</TableHead>
               <TableHead>Status</TableHead>
               <TableHead className="text-right">Actions</TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {loading ? (
               <TableRow>
                 <TableCell colSpan={8} className="h-24 text-center">
                   <div className="flex justify-center"><div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div></div>
                 </TableCell>
               </TableRow>
             ) : rfcs.length > 0 ? (
               rfcs.slice((page - 1) * pageSize, page * pageSize).map((rfc) => (
                 <TableRow key={rfc.id} className="hover:bg-muted/30">
                   <TableCell className="font-medium text-primary">
                     <Link href={`/rfc/${rfc.id}`} className="hover:underline">
                       {rfc.rfcNumber}
                     </Link>
                   </TableCell>
                   <TableCell>
                     <div className="font-medium">{rfc.projectName}</div>
                   </TableCell>
                   <TableCell>
                     {rfc.warehouseName || '-'}
                   </TableCell>
                   <TableCell>
                     <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                         {rfc.requestorName?.charAt(0) || 'U'}
                       </div>
                       <span className="text-sm">{rfc.requestorName || 'Unknown'}</span>
                     </div>
                   </TableCell>
                   <TableCell>
                     <div className="text-sm">{rfc.itemsCount || 0} items</div>
                   </TableCell>
                   <TableCell>
                     <div className="flex items-center text-sm text-muted-foreground">
                       <Calendar className="mr-2 h-3 w-3" />
                       {formatDate(rfc.createdAt)}
                     </div>
                   </TableCell>
                   <TableCell>
                     <StatusBadge status={rfc.status} />
                   </TableCell>
                   <TableCell className="text-right">
                     <Link href={`/rfc/${rfc.id}`}>
                       <Button variant="ghost" size="icon" title="View Details">
                         <Eye className="h-4 w-4" />
                       </Button>
                     </Link>
                   </TableCell>
                 </TableRow>
               ))
             ) : (
               <TableRow>
                 <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                   No RFCs found.
                 </TableCell>
               </TableRow>
             )}
           </TableBody>
         </Table>
       
       <div className="p-4">
         <DataTablePagination 
           currentPage={page} 
           pageSize={pageSize} 
           totalItems={rfcs.length} 
           onPageChange={setPage} 
           onPageSizeChange={setPageSize} 
         />
       </div>
    </div>
 );
}
