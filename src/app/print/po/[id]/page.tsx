'use client';

import 'paper-css/paper.min.css';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Loader2, Printer } from 'lucide-react';

export default function PoPrintPage() {
  const params = useParams();
  const id = params?.id as string;
  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    document.title = `Print_DO_${id}`;
    document.body.classList.add('A4');
    
    api.get(`/api/procurement/${id}`)
      .then(res => {
        setPo(res.data.data);
      })
      .catch(err => {
        console.error('Failed to fetch PO', err);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => document.body.classList.remove('A4');
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Preparing Delivery Order...</p>
        </div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Delivery Order Not Found</h2>
          <p className="text-muted-foreground">The requested document could not be loaded.</p>
        </div>
      </div>
    );
  }

  // Format the item names for the Perihal/Subject
  const itemNames = po.items && po.items.length > 0 
    ? po.items.map((item: any) => `${item.materialName} (${item.quantity} ${item.unit || 'Batang'})`).join(', ')
    : 'Material';

  const dateNowStr = formatDate(new Date().toISOString());
  // In a real app we might parse this from po.createdAt, but let's use current date for printing
  
  // Custom date formatter for "Jakarta, 29 Agustus 2025" style
  const dateObj = new Date();
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const formattedLocalDate = `${dateObj.getDate()} ${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

  // Get roman month for the letter number
  const romanMonths = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const romanMonth = romanMonths[dateObj.getMonth()];

  const defaultPoNumber = po.poNumber || '___/MAI/...';
  // Attempt to parse out PO number formatting if they used something similar
  const docNumber = defaultPoNumber; 

  return (
    <>
      <div className="fixed top-4 right-4 z-50 print:hidden">
        <button 
          onClick={() => window.print()} 
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span>Print Document</span>
        </button>
      </div>

      <section className="sheet padding-10mm font-serif text-sm leading-relaxed" style={{ backgroundColor: 'white', color: 'black' }}>
        {/* Header / Kop Surat */}
        <div className="border-b-2 border-black pb-4 mb-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 shrink-0">
              <img src="/logo.png" alt="MAI Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-blue-900 tracking-wide">PT. MITRA AKSES INSANI</h1>
              <h2 className="text-sm font-semibold tracking-widest text-gray-700 mb-1">CONTRACTOR & SUPPLIER</h2>
              <p className="text-xs">Jl. Tebet Timur Dalam III G No. 5 RT.002 RW.003 Tebet, Jakarta Selatan 12820</p>
              <p className="text-xs mt-0.5">
                <span className="inline-block mr-4">✉ pt.mai@mitraaksesinsani.com</span>
                <span>☎ (021) 8285 0362</span>
              </p>
            </div>
          </div>
        </div>

        {/* Info Surat */}
        <div className="mb-8">
          <div className="flex">
            <div className="w-[100px]">No.</div>
            <div className="w-4 mr-2">:</div>
            <div className="flex-1 font-semibold">{docNumber}</div>
          </div>
          <div className="flex">
            <div className="w-[100px]">Lampiran</div>
            <div className="w-4 mr-2">:</div>
            <div className="flex-1">-</div>
          </div>
          <div className="flex">
            <div className="w-[100px]">Perihal</div>
            <div className="w-4 mr-2">:</div>
            <div className="flex-1 font-semibold underline">{po.subject || 'Delivery Order'}</div>
          </div>
        </div>

        {/* Tujuan */}
        <div className="mb-6">
          <p>Kepada Yth.:</p>
          <p className="font-bold">Bapak/Ibu {po.driverName || po.transporter || '....................'} </p>
          {po.vehicleNumber && <p>Kendaraan: {po.vehicleNumber}</p>}
          <p>Di Tempat</p>
        </div>

        {/* Isi Surat */}
        <div className="mb-4">
          <p className="mb-2">Dengan hormat,</p>
          <p className="mb-4 text-justify">
            Sesuai dengan konfirmasi yang telah diberikan, dengan ini kami memberitahukan kepada Saudara untuk pengambilan dan pengantaran material milik PT. Mitra Akses Insani dengan rincian sebagai berikut:
          </p>

          <table className="w-full mb-4 align-top">
            <tbody>
              <tr>
                <td className="w-6 align-top">1.</td>
                <td className="w-[180px] align-top">Jenis Barang/Material</td>
                <td className="w-4 align-top">:</td>
                <td className="align-top font-medium">{itemNames}</td>
              </tr>
              <tr>
                <td className="w-6 align-top">2.</td>
                <td className="w-[180px] align-top">Alamat Pengambilan</td>
                <td className="w-4 align-top">:</td>
                <td className="align-top">
                  <span className="font-medium">Gudang {po.vendor || 'Vendor Pengirim'}</span>
                </td>
              </tr>
              <tr>
                <td className="w-6 align-top">3.</td>
                <td className="w-[180px] align-top">Alamat Pengiriman</td>
                <td className="w-4 align-top">:</td>
                <td className="align-top font-medium">
                  {po.deliverTo || '...................................................'}
                </td>
              </tr>
            </tbody>
          </table>

          {po.items && po.items.length > 0 && (
            <div className="mt-6 mb-6">
              <p className="font-semibold underline mb-2">Rincian material:</p>
              <ul className="list-disc pl-5">
                {po.items.map((item: any, i: number) => (
                  <li key={i} className="mb-1">
                    {item.materialName} ({item.quantity} {item.unit || 'Batang'}) 
                    {item.notes ? ` - ${item.notes}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {po.notes && (
            <div className="mt-4 mb-4">
              <p className="font-semibold underline mb-1">Catatan Tambahan:</p>
              <p>{po.notes}</p>
            </div>
          )}
        </div>

        {/* Penutup */}
        <div className="mb-12">
          <p className="text-justify">
            Demikian Delivery Order ini kami sampaikan. Atas perhatian dan kerja samanya kami ucapkan terima kasih.
          </p>
        </div>

        {/* Tanda Tangan */}
        <div className="flex justify-between items-end">
          <div className="w-[30%]">
            <p className="font-semibold underline mb-1">Tembusan:</p>
            <p>1. {po.vendor || 'Vendor Terkait'}</p>
            <p>2. Arsip PT. MAI</p>
          </div>
          
          <div className="w-[35%] text-center">
            <p className="mb-20">Jakarta, {formattedLocalDate}</p>
            <div className="border-b border-black font-semibold mx-auto uppercase">
              {po.approverName || 'MANAJEMEN PT. MAI'}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
