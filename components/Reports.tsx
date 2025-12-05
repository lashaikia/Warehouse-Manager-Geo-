import React, { useState, useMemo, useEffect } from 'react';
import { Product, Transaction } from '../types';
import { Printer, Settings, X, Database, Upload, FileSpreadsheet, Package, History, ArchiveX, AlertOctagon, Filter, CheckCircle2, Calendar, Tag, MapPin, Box, Hash, User, AlertTriangle, Scale, ArrowDownCircle, ArrowUpCircle, Trash2 } from 'lucide-react';
import { getDatabaseJSON, importDatabaseJSON, getTransactions } from '../services/storage';

interface ReportsProps {
  products: Product[];
}

// Updated Filter Types
type FilterType = 
  | 'inventory_category' | 'inventory_warehouse' | 'inventory_rack' | 'inventory_quantity' | 'inventory_date' | 'inventory_unit' // Inventory specific
  | 'inboundDate' | 'outboundDate' | 'unit' | 'supplier' | 'receiver' | 'debt' | 'category' | 'warehouse' | 'rack' | 'quantity'; // History specific

type ReportTab = 'inventory' | 'history';

interface ActiveFilter {
  id: string;
  type: FilterType;
  value: any; 
}

export const Reports: React.FC<ReportsProps> = ({ products }) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('inventory');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showZeroStock, setShowZeroStock] = useState(false);

  // Common Filter State
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  // Reset filters when tab changes
  useEffect(() => {
    setActiveFilters([]);
    if (activeTab === 'history') {
        loadTransactions();
    }
  }, [activeTab]);

  const loadTransactions = async () => {
    setLoadingHistory(true);
    const data = await getTransactions();
    setTransactions(data);
    setLoadingHistory(false);
  };

  // Extract unique values for dropdowns
  const uniqueCategories = useMemo(() => Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort(), [products]);
  const uniqueWarehouses = useMemo(() => Array.from(new Set(products.map(p => p.warehouse).filter(Boolean))).sort(), [products]);
  const uniqueRacks = useMemo(() => Array.from(new Set(products.map(p => p.rack).filter(Boolean))).sort(), [products]);

  // --- FILTERING LOGIC ---

  // 1. Inventory Filtering
  const filteredProducts = useMemo(() => {
    if (activeTab !== 'inventory') return [];

    let result = products.filter(p => showZeroStock ? p.quantity === 0 : p.quantity > 0);

    if (activeFilters.length > 0) {
      result = result.filter(p => {
        return activeFilters.every(filter => {
          switch (filter.type) {
            case 'inventory_category': return !filter.value || p.category === filter.value;
            case 'inventory_warehouse': return !filter.value || p.warehouse === filter.value;
            case 'inventory_rack': return !filter.value || p.rack === filter.value;
            case 'inventory_quantity':
              const qty = p.quantity;
              const min = filter.value.min !== '' ? Number(filter.value.min) : Number.MIN_SAFE_INTEGER;
              const max = filter.value.max !== '' ? Number(filter.value.max) : Number.MAX_SAFE_INTEGER;
              return qty >= min && qty <= max;
            case 'inventory_date':
               if (!filter.value) return true;
               return p.dateAdded === filter.value;
            case 'inventory_unit':
               return !filter.value || p.unit === filter.value;
            default: return true;
          }
        });
      });
    }
    return result;
  }, [products, activeFilters, showZeroStock, activeTab]);

  // 2. History Filtering
  const filteredTransactions = useMemo(() => {
    if (activeTab !== 'history') return [];

    let result = transactions;

    if (activeFilters.length > 0) {
      result = result.filter(tx => {
        return activeFilters.every(filter => {
          // Helper to find related product for attribute filtering
          const relatedProduct = products.find(p => p.id === tx.productId);

          switch (filter.type) {
            case 'inboundDate':
                return tx.type === 'inbound' && tx.date === filter.value;
            case 'outboundDate':
                return tx.type === 'outbound' && tx.date === filter.value;
            case 'unit':
                return tx.unit === filter.value;
            case 'supplier':
                // Supplier implies INBOUND type + match receiver/supplier text
                return tx.type === 'inbound' && (tx.receiver || '').toLowerCase().includes((filter.value || '').toLowerCase());
            case 'receiver':
                // Receiver implies OUTBOUND type + match receiver text
                return tx.type === 'outbound' && (tx.receiver || '').toLowerCase().includes((filter.value || '').toLowerCase());
            case 'debt':
                return tx.isDebt === true;
            case 'quantity':
                const qty = tx.quantity;
                const min = filter.value.min !== '' ? Number(filter.value.min) : Number.MIN_SAFE_INTEGER;
                const max = filter.value.max !== '' ? Number(filter.value.max) : Number.MAX_SAFE_INTEGER;
                return qty >= min && qty <= max;
            
            // Product Attribute Lookups
            case 'category':
                return !filter.value || (relatedProduct && relatedProduct.category === filter.value);
            case 'warehouse':
                return !filter.value || (relatedProduct && relatedProduct.warehouse === filter.value);
            case 'rack':
                return !filter.value || (relatedProduct && relatedProduct.rack === filter.value);
            
            default: return true;
          }
        });
      });
    }
    return result;
  }, [transactions, activeFilters, activeTab, products]);

  const totalProducts = filteredProducts.length;
  const totalQuantity = filteredProducts.reduce((acc, p) => acc + p.quantity, 0);

  // --- MODAL HELPERS ---

  const addFilter = (type: FilterType) => {
    // Prevent duplicates for specific single-instance filters
    if (['debt'].includes(type) && activeFilters.some(f => f.type === type)) return;

    const newId = Math.random().toString(36).substr(2, 9);
    let initialValue: any = '';
    
    if (type === 'quantity' || type === 'inventory_quantity') initialValue = { min: '', max: '' };
    if (type === 'debt') initialValue = true;
    if (type === 'unit' || type === 'inventory_unit') initialValue = 'pcs';

    setActiveFilters([...activeFilters, { id: newId, type, value: initialValue }]);
  };

  const updateFilterValue = (id: string, newValue: any) => {
    setActiveFilters(prev => prev.map(f => f.id === id ? { ...f, value: newValue } : f));
  };

  const removeFilter = (id: string) => {
    setActiveFilters(activeFilters.filter(f => f.id !== id));
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
  };

  const FilterButton = ({ label, icon: Icon, type, colorClass = 'indigo' }: any) => (
    <button
      onClick={() => addFilter(type)}
      className={`flex items-center justify-center px-3 py-2 bg-${colorClass}-50 text-${colorClass}-700 border border-${colorClass}-200 rounded-lg hover:bg-${colorClass}-100 transition text-sm font-medium whitespace-nowrap`}
    >
      <Icon size={16} className="mr-2" />
      {label}
    </button>
  );

  // CSV Export Helper
  const escapeCsv = (text: string | number) => {
      const str = String(text || '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
  };

  const getUnitLabel = (u?: string) => {
    switch(u) {
      case 'kg': return 'კგ';
      case 'm': return 'მ';
      case 'l': return 'ლ';
      default: return 'ც';
    }
  };

  const handleExportExcel = () => {
    if (activeTab === 'inventory') {
        const headers = ["ნომენკლატურა", "დასახელება", "კატეგორია", "საწყობი", "სტელაჟი", "რაოდენობა", "ერთეული", "თარიღი"];
        const rows = filteredProducts.map(p => [
            p.nomenclature, p.name, p.category, p.warehouse, p.rack, p.quantity, getUnitLabel(p.unit), p.dateAdded
        ]);
        downloadCSV(headers, rows, showZeroStock ? "zero_stock_report" : "inventory_report");
    } else {
        const headers = ["თარიღი", "ტიპი", "ნომენკლატურა", "პროდუქტი", "რაოდენობა", "ერთეული", "მიმღები/მომწოდებელი", "სტატუსი", "ვალის დახურვის თარიღი", "შენიშვნა"];
        const rows = filteredTransactions.map(tx => [
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
        downloadCSV(headers, rows, "history_report");
    }
  };

  const downloadCSV = (headers: string[], rows: (string|number)[][], filename: string) => {
    const csvContent = [
        headers.join(','), 
        ...rows.map(row => row.map(escapeCsv).join(','))
    ].join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Logic
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Pop-ups დაბლოკილია.");
        return;
    }
    const dateStr = new Date().toLocaleString('ka-GE');
    
    // Generate Table HTML based on active tab
    let tableHtml = '';
    if (activeTab === 'inventory') {
        const title = showZeroStock ? "ნულოვანი ნაშთები" : "საწყობის ნაშთი";
        tableHtml = `
          <h1>${title}</h1>
          <p>გენერირების დრო: ${dateStr}</p>
          <table>
            <thead>
              <tr><th>ნომენკლატურა</th><th>დასახელება</th><th>კატეგორია</th><th>საწყობი</th><th>სტელაჟი</th><th>რაოდენობა</th><th>ერთეული</th><th>თარიღი</th></tr>
            </thead>
            <tbody>
              ${filteredProducts.map(p => `<tr><td>${p.nomenclature}</td><td>${p.name}</td><td>${p.category}</td><td>${p.warehouse}</td><td>${p.rack}</td><td>${p.quantity}</td><td>${getUnitLabel(p.unit)}</td><td>${p.dateAdded}</td></tr>`).join('')}
            </tbody>
          </table>`;
    } else {
        tableHtml = `
          <h1>მოძრაობის ისტორია</h1>
          <p>გენერირების დრო: ${dateStr}</p>
          <table>
            <thead>
              <tr><th>თარიღი</th><th>ტიპი</th><th>კოდი</th><th>პროდუქტი</th><th>რაოდენობა</th><th>ერთეული</th><th>მიმღები</th><th>სტატუსი</th><th>შენიშვნა</th></tr>
            </thead>
            <tbody>
              ${filteredTransactions.map(tx => {
                let statusText = 'OK';
                if (tx.isDebt) statusText = 'ვალი (აქტიური)';
                if (tx.resolutionDate) statusText = `დახურული (${tx.resolutionDate})`;

                return `
                <tr>
                    <td>${tx.date}</td>
                    <td>${tx.type === 'inbound' ? 'მიღება' : 'გატანა'}</td>
                    <td>${tx.productNomenclature}</td>
                    <td>${tx.productName}</td>
                    <td>${tx.quantity}</td>
                    <td>${getUnitLabel(tx.unit)}</td>
                    <td>${tx.receiver || '-'}</td>
                    <td>${statusText}</td>
                    <td>${tx.notes || '-'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>`;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ka">
      <head>
        <title>Report</title>
        <style>
          body { font-family: 'Arial', sans-serif; padding: 20px; }
          h1 { margin-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        ${tableHtml}
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleBackup = async () => {
    const json = await getDatabaseJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `warehouse_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (importDatabaseJSON(content)) {
          alert('მონაცემები წარმატებით აღდგა! გთხოვთ დააჭიროთ OK გვერდის გასაახლებლად.');
          window.location.reload();
        } else {
          alert('შეცდომა ფაილის კითხვისას.');
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
             <button 
                onClick={() => setActiveTab('inventory')}
                className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === 'inventory' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
             >
                <div className="flex items-center"><Package size={16} className="mr-2" /> მიმდინარე ნაშთი</div>
             </button>
             <button 
                onClick={() => setActiveTab('history')}
                className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
             >
                <div className="flex items-center"><History size={16} className="mr-2" /> მოძრაობის ისტორია</div>
             </button>
           </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {activeTab === 'inventory' && (
            <button 
                onClick={() => setShowZeroStock(!showZeroStock)}
                className={`flex items-center px-4 py-2 rounded-lg transition shadow-sm ${showZeroStock ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
                <ArchiveX size={18} className="mr-2" /> {showZeroStock ? "ნულოვანი ნაშთები (ჩართულია)" : "ნულოვანი ნაშთები"}
            </button>
          )}

          <button 
              onClick={() => setIsFilterModalOpen(true)}
              className={`flex items-center px-4 py-2 rounded-lg transition shadow-sm ${activeFilters.length > 0 ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
          >
              <Filter size={18} className="mr-2" /> დეტალური ფილტრი
          </button>
          
          <button 
            onClick={handleExportExcel}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-sm"
          >
            <FileSpreadsheet size={18} className="mr-2" /> Excel
          </button>
          
          <button 
            onClick={handlePrint}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <Printer size={18} className="mr-2" /> ბეჭდვა
          </button>
        </div>
      </div>

      {activeTab === 'inventory' ? (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
             {/* ... Inventory Stats ... */}
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

             {/* ... Active Filters Display (Outside Modal) ... */}
             {activeFilters.length > 0 && (
                 <div className="mb-6 flex flex-wrap gap-2">
                     {activeFilters.map(f => {
                         let display = f.value;
                         if (f.type === 'inventory_quantity') display = `${f.value.min}-${f.value.max}`;
                         return (
                            <span key={f.id} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                                {f.type.replace('inventory_', '')}: {String(display)}
                                <button onClick={() => removeFilter(f.id)} className="ml-2 hover:text-red-500"><X size={14} /></button>
                            </span>
                         );
                     })}
                     <button onClick={() => setActiveFilters([])} className="text-xs text-red-600 hover:underline ml-2">გასუფთავება</button>
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
                        {filteredProducts.length > 0 ? filteredProducts.map(p => (
                            <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 text-gray-900">
                                <td className="p-3 font-mono">{p.nomenclature}</td>
                                <td className="p-3 font-medium">{p.name}</td>
                                <td className="p-3">{p.category}</td>
                                <td className="p-3">{p.warehouse}</td>
                                <td className="p-3">{p.rack}</td>
                                <td className="p-3 text-center font-bold">
                                  {p.quantity} <span className="text-xs font-normal text-gray-500">{getUnitLabel(p.unit)}</span>
                                </td>
                                <td className="p-3 text-right">{p.dateAdded}</td>
                            </tr>
                        )) : (
                           <tr><td colSpan={7} className="text-center p-8 text-gray-500">მონაცემები ვერ მოიძებნა</td></tr>
                        )}
                    </tbody>
                </table>
             </div>
          </div>
      ) : (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
             
             {/* History Stats */}
             <div className="mb-4 flex flex-col space-y-4">
                 <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex justify-between items-center">
                    <span className="text-gray-600 text-sm">ნაპოვნია ჩანაწერი: <span className="font-bold text-gray-900">{filteredTransactions.length}</span></span>
                 </div>
                 
                 {activeFilters.length > 0 ? (
                     <div className="flex flex-wrap gap-2">
                         {activeFilters.map(f => {
                             let display = f.value;
                             if(f.type === 'debt') display = 'უსაბუთოდ (ვალი)';
                             if(f.type === 'quantity') display = `${f.value.min} - ${f.value.max}`;
                             return (
                                <span key={f.id} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                    {f.type}: {String(display)}
                                    <button onClick={() => removeFilter(f.id)} className="ml-2 hover:text-red-500"><X size={14} /></button>
                                </span>
                             );
                         })}
                         <button onClick={() => setActiveFilters([])} className="text-xs text-red-600 hover:underline ml-2">გასუფთავება</button>
                     </div>
                 ) : (
                    <p className="text-xs text-gray-400 italic">ფილტრი არ არის არჩეული. ნაჩვენებია ყველა მონაცემი.</p>
                 )}
             </div>

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
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${tx.type === 'inbound' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {tx.type === 'inbound' ? 'მიღება' : 'გატანა'}
                                        </span>
                                    </td>
                                    <td className="p-3 font-mono">{tx.productNomenclature}</td>
                                    <td className="p-3 font-medium">{tx.productName}</td>
                                    <td className="p-3 font-bold">
                                      {tx.quantity} <span className="text-xs font-normal text-gray-500">{getUnitLabel(tx.unit)}</span>
                                    </td>
                                    <td className="p-3 text-gray-600">{tx.receiver || '-'}</td>
                                    <td className="p-3">
                                        {tx.isDebt ? (
                                            <span className="flex items-center w-max px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                                                <AlertOctagon size={10} className="mr-1" /> ვალი
                                            </span>
                                        ) : tx.resolutionDate ? (
                                            <span className="flex items-center w-max px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-200" title={`დაიხურა: ${tx.resolutionDate}`}>
                                                <CheckCircle2 size={10} className="mr-1" /> დაიხურა
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 text-xs">-</span>
                                        )}
                                    </td>
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

      {/* --- REIMAGINED FILTER MODAL --- */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl animate-fade-in overflow-hidden max-h-[90vh] flex flex-col">
             <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <Settings size={20} className="mr-2 text-indigo-600" />
                {activeTab === 'inventory' ? 'ნაშთის ფილტრი' : 'ისტორიის ფილტრი'}
              </h3>
              <div className="flex items-center space-x-2">
                  <button 
                    onClick={clearAllFilters}
                    className="flex items-center text-sm font-medium text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition"
                    title="ყველა ფილტრის წაშლა"
                  >
                    <Trash2 size={16} className="mr-1.5" />
                    გასუფთავება
                  </button>
                  <div className="w-px h-6 bg-gray-200 mx-2"></div>
                  <button onClick={() => setIsFilterModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition"><X size={24} /></button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
                 
                 {/* 1. Quick Filter Buttons */}
                 <div className="mb-6">
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">დაამატე ფილტრი</h4>
                    
                    {activeTab === 'inventory' ? (
                        <div className="flex flex-wrap gap-3">
                                <FilterButton label="თარიღი" icon={Calendar} type="inventory_date" />
                                <FilterButton label="საზომი ერთეული" icon={Scale} type="inventory_unit" />
                                <FilterButton label="კატეგორია" icon={Tag} type="inventory_category" />
                                <FilterButton label="საწყობი" icon={Box} type="inventory_warehouse" />
                                <FilterButton label="სტელაჟი" icon={MapPin} type="inventory_rack" />
                                <FilterButton label="რაოდენობა" icon={Hash} type="inventory_quantity" />
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-3">
                                <FilterButton label="მიღების თარიღი" icon={ArrowDownCircle} type="inboundDate" colorClass="green" />
                                <FilterButton label="გაცემის თარიღი" icon={ArrowUpCircle} type="outboundDate" colorClass="orange" />
                                <FilterButton label="საზომი ერთეული" icon={Scale} type="unit" />
                                <FilterButton label="მომწოდებელი" icon={User} type="supplier" />
                                <FilterButton label="მიმღები" icon={User} type="receiver" />
                                <FilterButton label="უსაბუთოდ / ვალი" icon={AlertTriangle} type="debt" colorClass="red" />
                                <FilterButton label="კატეგორია" icon={Tag} type="category" colorClass="gray" />
                                <FilterButton label="საწყობი" icon={Box} type="warehouse" colorClass="gray" />
                                <FilterButton label="სტელაჟი" icon={MapPin} type="rack" colorClass="gray" />
                                <FilterButton label="რაოდენობა" icon={Hash} type="quantity" colorClass="gray" />
                        </div>
                    )}
                 </div>

                 {/* 2. Active Filters List */}
                 <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">არჩეული ფილტრები</h4>
                    {activeFilters.length === 0 && <p className="text-gray-400 text-sm italic">ჯერ არაფერია არჩეული</p>}
                    
                    {activeFilters.map((filter) => (
                        <div key={filter.id} className="flex items-end gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 animate-fade-in">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-600 mb-1 capitalize">
                                    {filter.type === 'debt' ? 'სტატუსი' : 
                                     filter.type === 'inboundDate' ? 'მიღების თარიღი' :
                                     filter.type === 'outboundDate' ? 'გაცემის თარიღი' :
                                     filter.type === 'supplier' ? 'მომწოდებელი' :
                                     filter.type === 'receiver' ? 'მიმღები' :
                                     filter.type === 'inventory_quantity' ? 'რაოდენობა' :
                                     filter.type === 'inventory_date' ? 'თარიღი' :
                                     filter.type === 'inventory_category' ? 'კატეგორია' :
                                     filter.type === 'inventory_warehouse' ? 'საწყობი' :
                                     filter.type === 'inventory_rack' ? 'სტელაჟი' :
                                     filter.type === 'inventory_unit' ? 'ერთეული' :
                                     filter.type === 'unit' ? 'ერთეული' :
                                     filter.type}
                                </label>
                                
                                {/* Render Input Based on Type */}
                                {(filter.type === 'category' || filter.type === 'inventory_category') && (
                                    <select 
                                        value={filter.value} 
                                        onChange={(e) => updateFilterValue(filter.id, e.target.value)}
                                        className="w-full p-2 bg-white border border-gray-300 text-black rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">აირჩიეთ...</option>
                                        {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                )}
                                {(filter.type === 'warehouse' || filter.type === 'inventory_warehouse') && (
                                    <select 
                                        value={filter.value} 
                                        onChange={(e) => updateFilterValue(filter.id, e.target.value)}
                                        className="w-full p-2 bg-white border border-gray-300 text-black rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">აირჩიეთ...</option>
                                        {uniqueWarehouses.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                )}
                                {(filter.type === 'rack' || filter.type === 'inventory_rack') && (
                                    <select 
                                        value={filter.value} 
                                        onChange={(e) => updateFilterValue(filter.id, e.target.value)}
                                        className="w-full p-2 bg-white border border-gray-300 text-black rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">აირჩიეთ...</option>
                                        {uniqueRacks.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                )}
                                {(filter.type === 'unit' || filter.type === 'inventory_unit') && (
                                    <select 
                                        value={filter.value} 
                                        onChange={(e) => updateFilterValue(filter.id, e.target.value)}
                                        className="w-full p-2 bg-white border border-gray-300 text-black rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="pcs">ცალი (pcs)</option>
                                        <option value="kg">წონა (kg)</option>
                                        <option value="m">სიგრძე (m)</option>
                                        <option value="l">მოცულობა (l)</option>
                                    </select>
                                )}
                                {(filter.type === 'inboundDate' || filter.type === 'outboundDate' || filter.type === 'inventory_date') && (
                                    <input 
                                        type="date" 
                                        value={filter.value}
                                        onChange={(e) => updateFilterValue(filter.id, e.target.value)}
                                        className="w-full p-2 bg-white border border-gray-300 text-black rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                )}
                                {(filter.type === 'receiver' || filter.type === 'supplier') && (
                                    <input 
                                        type="text" 
                                        placeholder="ჩაწერეთ სახელი..."
                                        value={filter.value}
                                        onChange={(e) => updateFilterValue(filter.id, e.target.value)}
                                        className="w-full p-2 bg-white border border-gray-300 text-black rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                )}
                                {(filter.type === 'quantity' || filter.type === 'inventory_quantity') && (
                                    <div className="flex gap-2">
                                        <input type="number" placeholder="Min" value={filter.value.min} onChange={(e) => updateFilterValue(filter.id, {...filter.value, min: e.target.value})} className="w-1/2 p-2 bg-white border border-gray-300 text-black rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                                        <input type="number" placeholder="Max" value={filter.value.max} onChange={(e) => updateFilterValue(filter.id, {...filter.value, max: e.target.value})} className="w-1/2 p-2 bg-white border border-gray-300 text-black rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                )}
                                {filter.type === 'debt' && (
                                    <input 
                                        type="text" 
                                        disabled 
                                        value="უსაბუთოდ გაცემული (ვალი)"
                                        className="w-full p-2 bg-red-50 border border-red-200 text-red-900 font-bold rounded text-sm outline-none cursor-not-allowed"
                                    />
                                )}
                            </div>
                            <button 
                                onClick={() => removeFilter(filter.id)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    ))}
                 </div>

                 <div className="space-y-4 pt-6 mt-6 border-t border-gray-100">
                    <h4 className="text-sm font-bold text-gray-900 uppercase">მონაცემთა ბაზა</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={handleBackup} className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-xl hover:bg-gray-50"><Database size={24} className="mb-2 text-gray-500" /><span className="text-xs">Backup</span></button>
                        <div className="relative">
                            <input type="file" accept=".json" onChange={handleRestore} className="absolute inset-0 opacity-0 cursor-pointer" />
                            <button className="w-full h-full flex flex-col items-center justify-center p-3 border border-gray-200 rounded-xl hover:bg-gray-50"><Upload size={24} className="mb-2 text-gray-500" /><span className="text-xs">Restore</span></button>
                        </div>
                    </div>
                 </div>
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end sticky bottom-0">
                <button onClick={() => setIsFilterModalOpen(false)} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow">
                    შედეგის ნახვა
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};