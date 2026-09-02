'use client';

import 'paper-css/paper.min.css';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrintRfcPage() {
  const params = useParams();
  const id = params?.id as string;
  const [rfc, setRfc] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchRfc = async () => {
      try {
        const { data } = await api.get(`/api/pr/${id}`);
        setRfc(data.data);
      } catch (error) {
        console.error('Failed to fetch RFC for printing', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRfc();
  }, [id]);

  useEffect(() => {
    document.body.classList.add('A4');
    return () => document.body.classList.remove('A4');
  }, []);

  useEffect(() => {
    if (rfc) {
      // Auto-trigger print dialog after a slight delay to allow rendering
      setTimeout(() => {
        window.print();
      }, 800);
    }
  }, [rfc]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!rfc) {
    return <div className="p-8 text-center text-red-500">RFC not found.</div>;
  }

  return (
    <>
      {/* Non-printable header for actions */}
      <div className="mb-4 flex justify-end print:hidden max-w-4xl mx-auto pt-4">
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="w-4 h-4" /> Print Document
        </Button>
      </div>

      <section className="sheet padding-10mm font-sans text-[11px] leading-tight tracking-tight">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <img src="/logo.png" alt="MAI Logo" className="w-16 h-16 object-contain" />
          <div className="text-right">
            <h1 className="text-3xl font-bold">Request for Consumption</h1>
            <p className="text-sm mt-2 text-gray-800">No. {rfc.rfcNumber}</p>
          </div>
        </div>

        {/* Top Meta Table */}
        <table className="w-full border-collapse mb-6 text-xs">
          <tbody>
            <tr className="border-b border-gray-300">
              <td className="p-1 px-2 font-bold w-[25%] align-top">Nama Proyek</td>
              <td className="p-1 px-2">{rfc.project?.projectName || '-'}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="p-1 px-2 font-bold w-[25%] align-top">ID Proyek</td>
              <td className="p-1 px-2">{rfc.projectId ? rfc.projectId.split('-')[0].toUpperCase() : '-'}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="p-1 px-2 font-bold w-[25%] align-top">Lokasi Proyek</td>
              <td className="p-1 px-2">{rfc.location || '-'}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="p-1 px-2 font-bold w-[25%] align-top">Storage Location</td>
              <td className="p-1 px-2"></td>
            </tr>
          </tbody>
        </table>

        {/* Main Items Table */}
        <div className="mb-8">
          <table className="w-full border-collapse text-xs">
            <thead className="text-center font-bold">
              <tr className="border-b border-gray-300">
                <th className="p-1 w-[5%] align-middle text-left" rowSpan={2}>No</th>
                <th className="p-1 w-[15%] align-middle text-left" rowSpan={2}>Item ID</th>
                <th className="p-1 w-[30%] align-middle text-left" rowSpan={2}>Uraian Barang</th>
                <th className="p-1 w-[10%] align-middle" rowSpan={2}>Satuan</th>
                <th className="p-1 w-[15%] border-b border-gray-300" colSpan={2}>Volume</th>
                <th className="p-1 w-[25%] align-middle text-left" rowSpan={2}>SN/Keterangan</th>
              </tr>
              <tr className="border-b border-gray-300">
                <th className="p-0.5 w-[7.5%] font-normal">Minta</th>
                <th className="p-0.5 w-[7.5%] font-normal">Beri</th>
              </tr>
            </thead>
            <tbody>
              {/* Render 12 rows minimum for the form look */}
              {Array.from({ length: 12 }).map((_, i) => {
                const item = rfc.items?.[i];
                return (
                  <tr key={i} className="h-4 border-b border-gray-200">
                    <td className="p-0.5 px-1 text-left">{i + 1}</td>
                    <td className="p-0.5 px-1 text-left">{item?.materialCode || ''}</td>
                    <td className="p-0.5 px-1 text-left">{item?.materialName || ''}</td>
                    <td className="p-0.5 px-1 text-center">{item?.unit || ''}</td>
                    <td className="p-0.5 px-1 text-center">{item?.requestQty || ''}</td>
                    <td className="p-0.5 px-1"></td>
                    <td className="p-0.5 px-1 text-left">{item?.notes ? `- ${item.notes}` : (item ? '-' : '')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="flex justify-between text-xs mt-6 px-16">
          {/* Dibuat block */}
          <div className="w-[40%]">
            <p className="mb-16">Dibuat Oleh</p>
            <div className="text-center w-48">
              <div className="border-b border-black w-full mx-auto"></div>
              <p className="font-bold leading-none mt-1">{rfc.requestor?.name || 'Nama'}</p>
              <p className="text-[10px] mt-0.5 leading-none">{rfc.requestor?.role?.replace('_', ' ') || 'Jabatan'}</p>
            </div>
          </div>

          {/* Menyetujui block */}
          <div className="w-[40%] text-right flex flex-col items-end">
            <p className="mb-16 text-left w-48">Disetujui Oleh</p>
            <div className="text-center w-48">
              <div className="border-b border-black w-full mx-auto"></div>
              <p className="font-bold leading-none mt-1">{rfc.financeApproverName || rfc.siteApproverName || 'Approver'}</p>
              <p className="text-[10px] mt-0.5 leading-none">
                {rfc.financeApproverRole 
                  ? rfc.financeApproverRole.replace('_', ' ') 
                  : (rfc.siteApproverRole ? rfc.siteApproverRole.replace('_', ' ') : 'APPROVER')}
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
