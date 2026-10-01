import React from 'react';
import { RequestItem } from '../types/request';
import { getStatusLabelTh, getPriorityLabelTh } from '../utils/storage';
import { REQUEST_CATEGORIES } from '../data/categories';
import { Printer, Download, X, ShieldCheck, FileSpreadsheet, QrCode } from 'lucide-react';

interface OfficerPdfReportModalProps {
  requests: RequestItem[];
  filterLabel: string;
  onClose: () => void;
}

export const OfficerPdfReportModal: React.FC<OfficerPdfReportModalProps> = ({
  requests,
  filterLabel,
  onClose
}) => {
  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['Tracking ID', 'Category', 'Title', 'Applicant', 'Citizen ID', 'Phone', 'Department', 'Status', 'Priority', 'Date'];
    const rows = requests.map((r) => [
      r.id,
      r.category,
      `"${r.title.replace(/"/g, '""')}"`,
      `"${r.applicant.fullName}"`,
      r.applicant.citizenIdOrCode,
      r.applicant.phone,
      `"${r.applicant.department}"`,
      getStatusLabelTh(r.status),
      getPriorityLabelTh(r.priority),
      new Date(r.createdAt).toLocaleDateString('th-TH')
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `official_requests_summary_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Date Formatting
  const now = new Date();
  const formattedPrintDate = now.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const docRefNo = `สร. ${now.getFullYear() + 543}/${String(now.getMonth() + 1).padStart(2, '0')}-${requests.length}`;

  // Statistics calculation
  const totalCount = requests.length;
  const pendingCount = requests.filter(r => r.status === 'submitted' || r.status === 'under_review').length;
  const actionCount = requests.filter(r => r.status === 'action_required').length;
  const approvedCount = requests.filter(r => r.status === 'approved' || r.status === 'completed').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  // Category counts
  const categoryStats = REQUEST_CATEGORIES.map(cat => ({
    title: cat.titleTh,
    count: requests.filter(r => r.category === cat.id).length
  }));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-300 my-4 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Top Floating Control Bar (Hidden on Print) */}
        <div className="no-print bg-slate-900 text-white p-4 px-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/30">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                พรีวิวรายงานสรุป PDF ทางการ (Official PDF Summary Report)
              </h3>
              <p className="text-xs text-slate-400">
                เอกสารสรุปผลการรับเรื่องร้องเรียนและงานสารบรรณอิเล็กทรอนิกส์
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs px-3 py-2 rounded-xl font-medium transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              ส่งออก CSV
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-xl font-bold shadow-lg shadow-blue-600/30 transition-all"
            >
              <Printer className="w-4 h-4" />
              พิมพ์เอกสาร / บันทึกเป็น PDF
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Body */}
        <div className="overflow-y-auto p-4 sm:p-8 md:p-12 bg-slate-100 flex-1">
          {/* Printable Official Paper Container */}
          <div className="bg-white p-8 md:p-12 rounded-xl border border-slate-300 shadow-xl document-font text-slate-900 space-y-6 max-w-4xl mx-auto print-full-width">
            
            {/* Thai Official Header */}
            <div className="text-center space-y-2 border-b-2 border-slate-900 pb-6">
              <div className="w-16 h-16 mx-auto bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-2xl shadow">
                ครุฑ
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                รายงานสรุปผลการดำเนินงานรับคำร้องและบริการประชาชนออนไลน์
              </h1>
              <p className="text-sm font-semibold text-slate-700">
                ศูนย์บริการประชาชนและงานสารบรรณอิเล็กทรอนิกส์ (E-Service Center)
              </p>
              
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 pt-3 px-2 border-t border-slate-200 mt-3 font-mono">
                <div>
                  <strong>เลขที่เอกสารรายงาน:</strong> <span className="text-slate-900 font-bold">{docRefNo}</span>
                </div>
                <div>
                  <strong>เงื่อนไขรายงาน:</strong> <span className="text-blue-800 font-bold">{filterLabel}</span>
                </div>
                <div>
                  <strong>วันที่จัดทำ:</strong> <span className="text-slate-900">{formattedPrintDate} น.</span>
                </div>
              </div>
            </div>

            {/* Section 1: Executive Summary Statistics */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-300 pb-1 flex justify-between items-center">
                <span>๑. สรุปสถิติภาพรวมการดำเนินงาน (Executive Summary)</span>
                <span className="text-xs font-normal text-slate-500">รวมทั้งหมด {totalCount} รายการ</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-300">
                  <span className="text-xs text-slate-600 block">คำร้องทั้งหมด</span>
                  <span className="text-xl font-bold text-slate-900">{totalCount}</span>
                  <span className="text-[10px] text-slate-500 block">รายการ</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-300">
                  <span className="text-xs text-amber-800 block">รอดำเนินการ</span>
                  <span className="text-xl font-bold text-amber-700">{pendingCount + actionCount}</span>
                  <span className="text-[10px] text-slate-500 block">รายการ</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-300">
                  <span className="text-xs text-emerald-800 block">อนุมัติ/เสร็จสิ้น</span>
                  <span className="text-xl font-bold text-emerald-700">{approvedCount}</span>
                  <span className="text-[10px] text-slate-500 block">รายการ</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-300">
                  <span className="text-xs text-rose-800 block">ไม่อนุมัติ</span>
                  <span className="text-xl font-bold text-rose-700">{rejectedCount}</span>
                  <span className="text-[10px] text-slate-500 block">รายการ</span>
                </div>
              </div>

              {/* Category Breakdown Table */}
              <div className="pt-2">
                <p className="text-xs font-bold text-slate-800 mb-1.5">จำแนกตามประเภทภารกิจงานบริการ:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {categoryStats.map((cat, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-50 px-3 py-1.5 rounded border border-slate-200">
                      <span className="text-slate-700">{cat.title}</span>
                      <span className="font-bold text-slate-900">{cat.count} เรื่อง</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 2: Detailed Requests Register */}
            <div className="space-y-3 pt-2">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-300 pb-1">
                ๒. ทะเบียนรายการคำร้องและสถานะการพิจารณา (Request Register)
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                      <th className="p-2 border-r border-slate-300 text-center w-8">ลำดับ</th>
                      <th className="p-2 border-r border-slate-300 w-24">Tracking ID</th>
                      <th className="p-2 border-r border-slate-300">หัวข้อเรื่องคำร้อง</th>
                      <th className="p-2 border-r border-slate-300">ผู้ยื่นคำร้อง / หน่วยงาน</th>
                      <th className="p-2 border-r border-slate-300 text-center w-20">เบอร์โทร</th>
                      <th className="p-2 border-r border-slate-300 w-20 text-center">วันที่ยื่น</th>
                      <th className="p-2 border-r border-slate-300 w-16 text-center">ความเร่งด่วน</th>
                      <th className="p-2 border-r border-slate-300 w-20 text-center">สถานะ</th>
                      <th className="p-2 w-24">ผู้รับเรื่อง</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {requests.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-4 text-center text-slate-500 italic">
                          - ไม่พบรายการคำร้องตามเงื่อนไขที่เลือก -
                        </td>
                      </tr>
                    ) : (
                      requests.map((req, index) => (
                        <tr key={req.id} className="hover:bg-slate-50">
                          <td className="p-2 border-r border-slate-300 text-center font-mono text-[11px]">{index + 1}</td>
                          <td className="p-2 border-r border-slate-300 font-mono font-bold text-slate-900 text-[11px] whitespace-nowrap">
                            {req.id}
                          </td>
                          <td className="p-2 border-r border-slate-300 font-medium text-slate-800">
                            <div>{req.title}</div>
                            {req.details?.cameraLocation && (
                              <div className="text-[10px] text-slate-500 font-mono">📍 {req.details.cameraLocation}</div>
                            )}
                          </td>
                          <td className="p-2 border-r border-slate-300">
                            <div className="font-semibold text-slate-900">{req.applicant.prefix}{req.applicant.fullName}</div>
                            <div className="text-[10px] text-slate-500">{req.applicant.department || req.applicant.positionOrMajor || '-'}</div>
                          </td>
                          <td className="p-2 border-r border-slate-300 text-center font-mono text-[11px]">
                            {req.applicant.phone}
                          </td>
                          <td className="p-2 border-r border-slate-300 text-center whitespace-nowrap text-slate-600 text-[11px]">
                            {new Date(req.createdAt).toLocaleDateString('th-TH')}
                          </td>
                          <td className="p-2 border-r border-slate-300 text-center font-semibold text-slate-800 text-[11px]">
                            {getPriorityLabelTh(req.priority)}
                          </td>
                          <td className="p-2 border-r border-slate-300 text-center font-bold text-slate-900 whitespace-nowrap text-[11px]">
                            {getStatusLabelTh(req.status)}
                          </td>
                          <td className="p-2 text-slate-700 text-[10px]">
                            {req.assignedOfficer || 'เจ้าหน้าที่รับเรื่อง'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 3: Official Signatures & Approval Block */}
            <div className="pt-8 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-center text-xs">
              {/* Left: Report Preparer Officer */}
              <div className="space-y-8">
                <div>
                  <p className="font-bold text-slate-900">ผู้จัดทำรายงานสรุป</p>
                  <p className="text-slate-500 text-[11px]">เจ้าหน้าที่งานสารบรรณและรับเรื่องร้องเรียน</p>
                </div>
                
                <div className="space-y-1">
                  <div className="border-b border-dotted border-slate-400 w-48 mx-auto h-8 flex items-end justify-center pb-1 font-semibold text-slate-800">
                    นางสาวจิราพร ใจดี
                  </div>
                  <p className="font-semibold">( นางสาวจิราพร ใจดี )</p>
                  <p className="text-slate-500 text-[11px]">เจ้าหน้าที่ปฏิบัติงานสารบรรณดิจิทัล</p>
                  <p className="text-slate-500 text-[11px]">วันที่ {formattedPrintDate.split(' ')[0]} {formattedPrintDate.split(' ')[1]} {formattedPrintDate.split(' ')[2]}</p>
                </div>
              </div>

              {/* Right: Department Supervisor / Approver */}
              <div className="space-y-8">
                <div>
                  <p className="font-bold text-slate-900">ผู้รับรองและเสนอรายงาน</p>
                  <p className="text-slate-500 text-[11px]">หัวหน้าศูนย์บริการประชาชนและสารบรรณอิเล็กทรอนิกส์</p>
                </div>

                <div className="space-y-1">
                  <div className="border-b border-dotted border-slate-400 w-48 mx-auto h-8 flex items-end justify-center pb-1 font-semibold text-slate-800">
                    นายณัฐวุฒิ สมบูรณ์
                  </div>
                  <p className="font-semibold">( นายณัฐวุฒิ สมบูรณ์ )</p>
                  <p className="text-slate-500 text-[11px]">ผู้อำนวยการศูนย์บริการและสารบรรณกลาง</p>
                  <p className="text-slate-500 text-[11px]">วันที่ ..... / ..... / ..........</p>
                </div>
              </div>
            </div>

            {/* Verification Footer Notice */}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between text-[10px] text-slate-500 gap-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>รายงานสรุปฉบับนี้ถูกรับรองผ่านระบบสารบรรณอิเล็กทรอนิกส์ตามมาตรฐานธุรกรรมภาครัฐ</span>
              </div>
              <div className="flex items-center gap-1 font-mono">
                <QrCode className="w-3 h-3 text-slate-400" />
                <span>System Verification Hash: {docRefNo.replace(/\s/g, '')}-VERIFIED</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
