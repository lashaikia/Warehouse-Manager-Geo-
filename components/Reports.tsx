import React, { useState, useMemo, useEffect } from 'react';
import { Product, Transaction } from '../types';
import { Printer, X, Database, Upload, FileSpreadsheet, Package, History, ArchiveX, AlertOctagon, Filter, CheckCircle2, Box, MapPin, Tag, Calendar, User, AlertTriangle, ArrowDownCircle, ArrowUpCircle, Copy } from 'lucide-react';
import { getDatabaseJSON, importDatabaseJSON, getTransactions } from '../services/storage';

interface ReportsProps {
  products: Product[];
}

// Colors for duplicate grouping
const DUPLICATE_COLORS = [
  'bg-red-100',
  'bg-orange-100',
  'bg-yellow-100',
  'bg-blue-100',
  'bg-purple-100',
  'bg-pink-100',
  'bg-indigo-100',
  'bg-teal-100'
];

export const Reports: React.FC<ReportsProps> = ({ products }) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('inventory');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // View Modes
  const [showZeroStock, setShowZeroStock] = useState(false);
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  
  // Simple Filter State (Not modal based anymore, just dropdowns or toggle)
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [invFilters, setInvFilters] = useState({ category: '', warehouse: '', rack: '' });
  const [histFilters, setHistFilters] = useState({ type: '', isDebt: false });

  const loadTransactions = async () => {
    setLoadingHistory(true);
    const data = await getTransactions();
    setTransactions(data);
    setLoadingHistory(false);
  };

  useEffect(() => {
    if (activeTab === 'history') loadTransactions();
  }, [activeTab]);

  // Unique lists for simple dropdowns
  const uniqueCategories = useMemo(() => Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort(), [products]);
  const uniqueWarehouses = useMemo(() => Array.from(new Set(products.map(p => p.warehouse).filter(Boolean))).sort(), [products]);
  const uniqueRacks = useMemo(() => Array.from(new Set(products.map(p => p.rack).filter(Boolean))).sort(), [products]);

  // Calculate Duplicates Map (Nomenclature -> Color Class)
  const duplicateMap = useMemo(() => {
    const counts: Record<string, number> = {};
    // Count occurrences of each nomenclature (normalized)
    products.forEach(p => {
        const key = p.nomenclature.trim().toLowerCase();
        if(key) counts[key] = (counts[key] || 0) + 1;
    });

    // Filter only duplicates
    const duplicates = Object.keys(counts).filter(k => counts[k] > 1);
    
    // Assign colors
    const colorMap: Record<string, string> = {};
    duplicates.forEach((nom, index) => {
        colorMap[nom] = DUPLICATE_COLORS[index % DUPLICATE_COLORS.length];
    });

    return colorMap;
  }, [products]);

  const filteredProducts = useMemo(() => {
     let result = products;

     // Mode 1: Show Duplicates Only (Overrides Zero Stock logic)
     if (showDuplicatesOnly) {
         result = result.filter(p => duplicateMap.hasOwnProperty(p.nomenclature.trim().toLowerCase()));
     } else {
         // Mode 2: Standard Inventory View (Active vs Zero Stock)
         result = result.filter(p => showZeroStock ? p.quantity === 0 : p.quantity > 0);
     }

     // Apply Filters
     if (invFilters.category) result = result.filter(p => p.category === invFilters.category);
     if (invFilters.warehouse) result = result.filter(p => p.warehouse === invFilters.warehouse);
     if (invFilters.rack) result = result.filter(p => p.rack === invFilters.rack);
     
     // If showing duplicates, sort by nomenclature so they appear together
     if (showDuplicatesOnly) {
         result.sort((a, b) => a.nomenclature.localeCompare(b.nomenclature));
     }

     return result;
  }, [products, showZeroStock, showDuplicatesOnly, invFilters, duplicateMap]);

  const filteredTransactions = useMemo(() => {
      let result = transactions;
      if (histFilters.type) result = result.filter(t => t.type === histFilters.type);
      if (histFilters.isDebt) result = result.filter(t => t.isDebt);
      return result;
  }, [transactions, histFilters]);

  const totalProducts = filteredProducts.length;
  const totalQuantity = filteredProducts.reduce((acc, p) => acc + p.quantity, 0);

  const getUnitLabel = (u?: string) => {
    switch(u) {
      case 'kg': return 'კგ';
      case 'm': return 'მ';
      case 'l': return 'ლ';
      default: return 'ც';
    }
  };

  const handlePrint = () => {
      window.print();
  };

  const escapeCsv = (text: string | number) => {
    const str = String(text || '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleExportExcel = () => {
    let headers: string[] = [];
    let rows: (string|number)[][] = [];
    let filename = "";

    if (activeTab === 'inventory') {
        headers = ["ნომენკლატურა", "დასახელება", "კატეგორია", "საწყობი", "სტელაჟი", "რაოდენობა", "ერთეული", "თარიღი"];
        rows = filteredProducts.map(p => [
            p.nomenclature, p.name, p.category, p.warehouse, p.rack, p.quantity, getUnitLabel(p.unit), p.dateAdded
        ]);
        filename = "inventory_report";
    } else {
        headers = ["თარიღი", "ტიპი", "ნომენკლატურა", "პროდუქტი", "რაოდენობა", "ერთეული", "მიმღები/მომწოდებელი", "სტატუსი", "ვალის დახურვის თარიღი", "შენიშვნა"];
        rows = filteredTransactions.map(tx => [
            tx.date, 
            tx.type === 'inbound' ? 'მიღება' : 'გატანა', 
            tx.productNomenclature, 
            tx.productName, 
            tx.quantity,
            getUnitLabel(tx.unit),
            tx.receiver,
            tx.isDebt ? "მიმდინარე ვალი" : (tx.resolutionDate ? "დახურული ვალი" : "სტანდარტული"),
            tx.resolutionDate || '-',
            tx.notes
        ]);
        filename = "history_report";
    }

    const csvContent = [headers.join(','), ...rows.map(row => row.map(escapeCsv).join(','))].join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  const handleBackup = async () => {
    const json = await getDatabaseJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `backup_${new Date().toISOString().slice(0,10)}.json`;
    link.click();
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          if (importDatabaseJSON(content)) {
            alert('წარმატებით აღდგა! გვერდი გადაიტვირთება.');
            window.location.reload();
          } else {
            alert('შეცდომა.');
          }
        };
        reader.readAsText(file);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">ანგარიშგება</h2>
           <div className="flex space-x-4 mt-4 border-b border-gray-200">
             <button onClick={() => setActiveTab('inventory')} className={`pb-2 px-1 text-sm font-medium border-b-2 ${activeTab === 'inventory' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}><Package size={16} className="inline mr-2"/> მიმდინარე ნაშთი</button>
             <button onClick={() => setActiveTab('history')} className={`pb-2 px-1 text-sm font-medium border-b-2 ${activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}><History size={16} className="inline mr-2"/> მოძრაობის ისტორია</button>
           </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {activeTab === 'inventory' && (
            <>
                <button 
                    onClick={() => { setShowZeroStock(!showZeroStock); setShowDuplicatesOnly(false); }} 
                    className={`flex items-center px-4 py-2 rounded-lg transition shadow-sm border ${showZeroStock ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-300'}`}
                >
                    <ArchiveX size={18} className="mr-2" /> 
                    {showZeroStock ? "ნულოვანი ნაშთები (ჩართულია)" : "ნულოვანი ნაშთები"}
                </button>
                
                <button 
                    onClick={() => { setShowDuplicatesOnly(!showDuplicatesOnly); setShowZeroStock(false); }} 
                    className={`flex items-center px-4 py-2 rounded-lg transition shadow-sm border ${showDuplicatesOnly ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-300'}`}
                    title="აჩვენებს მხოლოდ იმ პროდუქტებს, რომელთა ნომენკლატურა მეორდება"
                >
                    <Copy size={18} className="mr-2" /> 
                    {showDuplicatesOnly ? "დუბლირებულები (ჩართულია)" : "დუბლირებული ნომენკლატურები"}
                </button>
            </>
          )}
          <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`flex items-center px-4 py-2 rounded-lg transition shadow-sm ${isFilterOpen ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}><Filter size={18} className="mr-2" /> ფილტრი</button>
          <button onClick={handleExportExcel} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-sm"><FileSpreadsheet size={18} className="mr-2" /> Excel</button>
          <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"><Printer size={18} className="mr-2" /> ბეჭდვა</button>
        </div>
      </div>

      {/* INLINE FILTER PANEL */}
      {isFilterOpen && (
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
              {activeTab === 'inventory' ? (
                  <>
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">კატეგორია</label>
                        <select value={invFilters.category} onChange={e => setInvFilters({...invFilters, category: e.target.value})} className="w-full p-2 text-sm border rounded">
                            <option value="">ყველა</option>
                            {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">საწყობი</label>
                        <select value={invFilters.warehouse} onChange={e => setInvFilters({...invFilters, warehouse: e.target.value})} className="w-full p-2 text-sm border rounded">
                            <option value="">ყველა</option>
                            {uniqueWarehouses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">სტელაჟი</label>
                        <select value={invFilters.rack} onChange={e => setInvFilters({...invFilters, rack: e.target.value})} className="w-full p-2 text-sm border rounded">
                            <option value="">ყველა</option>
                            {uniqueRacks.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                  </>
              ) : (
                  <>
                     <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">ოპერაციის ტიპი</label>
                        <select value={histFilters.type} onChange={e => setHistFilters({...histFilters, type: e.target.value})} className="w-full p-2 text-sm border rounded">
                            <option value="">ყველა</option>
                            <option value="inbound">მიღება</option>
                            <option value="outbound">გაცემა</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <div className="bg-white border p-2 rounded w-full flex items-center">
                            <input type="checkbox" checked={histFilters.isDebt} onChange={e => setHistFilters({...histFilters, isDebt: e.target.checked})} className="mr-2" />
                            <span className="text-sm font-medium">მხოლოდ ვალი</span>
                        </div>
                    </div>
                  </>
              )}
              <div className="md:col-span-3 flex justify-end">
                 <button onClick={() => { setInvFilters({category:'',warehouse:'',rack:''}); setHistFilters({type:'',isDebt:false}); }} className="text-sm text-red-500 hover:underline">ფილტრის გასუფთავება</button>
              </div>
          </div>
      )}

      {activeTab === 'inventory' ? (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
             <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">ნაპოვნია</p>
                    <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">ჯამური რაოდენობა</p>
                    <p className="text-2xl font-bold text-gray-900">{totalQuantity.toFixed(2)}</p>
                </div>
             </div>
             
             {showDuplicatesOnly && (
                 <div className="mb-4 p-3 bg-purple-50 text-purple-700 text-sm rounded-lg flex items-center">
                     <AlertTriangle size={18} className="mr-2" />
                     ნაჩვენებია მხოლოდ დუბლირებული ნომენკლატურები. ფერები აღნიშნავს იდენტური კოდების ჯგუფებს.
                 </div>
             )}

             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr className="bg-gray-100 border-b border-gray-200">
                            <th className="p-3 font-semibold text-gray-800">ნომენკლატურა</th>
                            <th className="p-3 font-semibold text-gray-800">დასახელება</th>
                            <th className="p-3 font-semibold text-gray-800">კატეგორია</th>
                            <th className="p-3 font-semibold text-gray-800">საწყობი</th>
                            <th className="p-3 font-semibold text-gray-800">სტელაჟი</th>
                            <th className="p-3 font-semibold text-gray-800 text-center">რაოდენობა</th>
                            <th className="p-3 font-semibold text-gray-800 text-right">თარიღი</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.length > 0 ? filteredProducts.map(p => {
                            // Check for duplicate color if mode is on, or if just highlighting logic is needed
                            const dupColor = duplicateMap[p.nomenclature.trim().toLowerCase()];
                            const rowClass = showDuplicatesOnly && dupColor 
                                ? `${dupColor} text-gray-900` 
                                : "border-b border-gray-50 hover:bg-gray-50 text-gray-900";

                            return (
                                <tr key={p.id} className={rowClass}>
                                    <td className="p-3 font-mono font-bold">{p.nomenclature}</td>
                                    <td className="p-3 font-medium">{p.name}</td>
                                    <td className="p-3">{p.category}</td>
                                    <td className="p-3">{p.warehouse}</td>
                                    <td className="p-3">{p.rack}</td>
                                    <td className="p-3 text-center font-bold">{p.quantity} <span className="text-xs font-normal text-gray-500">{getUnitLabel(p.unit)}</span></td>
                                    <td className="p-3 text-right">{p.dateAdded}</td>
                                </tr>
                            );
                        }) : (
                           <tr><td colSpan={7} className="text-center p-8 text-gray-500">მონაცემები ვერ მოიძებნა</td></tr>
                        )}
                    </tbody>
                </table>
             </div>
          </div>
      ) : (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr className="bg-gray-100 border-b border-gray-200">
                            <th className="p-3 font-semibold text-gray-800">თარიღი</th>
                            <th className="p-3 font-semibold text-gray-800">ტიპი</th>
                            <th className="p-3 font-semibold text-gray-800">კოდი</th>
                            <th className="p-3 font-semibold text-gray-800">პროდუქტი</th>
                            <th className="p-3 font-semibold text-gray-800">რაოდენობა</th>
                            <th className="p-3 font-semibold text-gray-800">მიმღები / მომწოდებელი</th>
                            <th className="p-3 font-semibold text-gray-800">სტატუსი</th>
                            <th className="p-3 font-semibold text-gray-800">შენიშვნა</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loadingHistory ? (
                             <tr><td colSpan={8} className="text-center p-4">იტვირთება...</td></tr>
                        ) : filteredTransactions.length > 0 ? (
                            filteredTransactions.map(tx => (
                                <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50 text-gray-900">
                                    <td className="p-3 whitespace-nowrap">{tx.date}</td>
                                    <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${tx.type === 'inbound' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{tx.type === 'inbound' ? 'მიღება' : 'გატანა'}</span></td>
                                    <td className="p-3 font-mono">{tx.productNomenclature}</td>
                                    <td className="p-3 font-medium">{tx.productName}</td>
                                    <td className="p-3 font-bold">{tx.quantity} <span className="text-xs font-normal text-gray-500">{getUnitLabel(tx.unit)}</span></td>
                                    <td className="p-3 text-gray-600">{tx.receiver || '-'}</td>
                                    <td className="p-3">{tx.isDebt ? <span className="flex items-center w-max px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700"><AlertOctagon size={10} className="mr-1" /> ვალი</span> : tx.resolutionDate ? <span className="flex items-center w-max px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700"><CheckCircle2 size={10} className="mr-1" /> დაიხურა</span> : '-'}</td>
                                    <td className="p-3 text-gray-500 max-w-xs truncate" title={tx.notes}>{tx.notes || '-'}</td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={8} className="text-center p-8 text-gray-400">ჩანაწერები ვერ მოიძებნა</td></tr>
                        )}
                    </tbody>
                </table>
             </div>
          </div>
      )}
      
      <div className="bg-white p-4 rounded-xl border border-gray-100 mt-6">
          <h4 className="font-bold mb-2">მონაცემთა ბაზა</h4>
          <div className="flex gap-4">
               <button onClick={handleBackup} className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"><Database size={16} className="mr-2"/> Backup</button>
               <div className="relative">
                   <input type="file" accept=".json" onChange={handleRestore} className="absolute inset-0 opacity-0 cursor-pointer" />
                   <button className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"><Upload size={16} className="mr-2"/> Restore</button>
               </div>
          </div>
      </div>
    </div>
  );
};