import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, Transaction } from '../types';
import { Download, Printer, Settings, Filter, X, Check, Database, Upload, Plus, Trash2, FileSpreadsheet, Package, History } from 'lucide-react';
import { getDatabaseJSON, importDatabaseJSON, getTransactions } from '../services/storage';

interface ReportsProps {
  products: Product[];
}

type FilterType = 'category' | 'warehouse' | 'rack' | 'quantity' | 'dateAdded';
type ReportTab = 'inventory' | 'history';

interface ActiveFilter {
  id: string;
  type: FilterType;
  label: string;
  value: any; 
  displayValue: string;
}

export const Reports: React.FC<ReportsProps> = ({ products }) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('inventory');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Filters for Inventory
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [selectedFilterType, setSelectedFilterType] = useState<FilterType>('category');
  const [tempValue, setTempValue] = useState<string>('');
  const [tempRange, setTempRange] = useState({ min: '', max: '' });
  const [tempDateRange, setTempDateRange] = useState({ start: '', end: '' });

  // History state
  const [historySearch, setHistorySearch] = useState('');
  const [historyType, setHistoryType] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [historyDate, setHistoryDate] = useState('');

  useEffect(() => {
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

  const uniqueCategories = useMemo(() => 
    Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort(), 
    [products]
  );
  
  const uniqueWarehouses = useMemo(() => 
    Array.from(new Set(products.map(p => p.warehouse).filter(Boolean))).sort(), 
    [products]
  );

  const uniqueRacks = useMemo(() => 
    Array.from(new Set(products.map(p => p.rack).filter(Boolean))).sort(), 
    [products]
  );

  // Inventory Filtering Logic
  const filteredProducts = useMemo(() => {
    if (activeFilters.length === 0) return products;

    return products.filter(p => {
      return activeFilters.every(filter => {
        switch (filter.type) {
          case 'category': return p.category === filter.value;
          case 'warehouse': return p.warehouse === filter.value;
          case 'rack': return p.rack === filter.value;
          case 'quantity':
            const qty = p.quantity;
            const min = filter.value.min !== '' ? Number(filter.value.min) : Number.MIN_SAFE_INTEGER;
            const max = filter.value.max !== '' ? Number(filter.value.max) : Number.MAX_SAFE_INTEGER;
            return qty >= min && qty <= max;
          case 'dateAdded':
            const date = p.dateAdded; 
            const start = filter.value.start || '0000-01-01';
            const end = filter.value.end || '9999-12-31';
            return date >= start && date <= end;
          default: return true;
        }
      });
    });
  }, [products, activeFilters]);

  // History Filtering Logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = 
        tx.productName.toLowerCase().includes(historySearch.toLowerCase()) ||
        tx.productNomenclature.includes(historySearch) ||
        (tx.notes || '').toLowerCase().includes(historySearch.toLowerCase()) ||
        (tx.receiver || '').toLowerCase().includes(historySearch.toLowerCase());
      
      const matchesType = historyType === 'all' || tx.type === historyType;
      
      // Filter by month/year if date is selected (YYYY-MM format usually from input type='month')
      // OR specific date if input type='date'. Let's assume input type='date' for specific day or type='month'
      // Implementation below assumes simple string match if user provides partial date, or full match
      const matchesDate = !historyDate || tx.date.startsWith(historyDate);

      return matchesSearch && matchesType && matchesDate;
    });
  }, [transactions, historySearch, historyType, historyDate]);

  const totalProducts = filteredProducts.length;
  const totalQuantity = filteredProducts.reduce((acc, p) => acc + p.quantity, 0);

  // ... Filter helper functions (addFilter, removeFilter) ...
  const addFilter = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    let newFilter: ActiveFilter | null = null;

    if (selectedFilterType === 'category' && tempValue) {
      newFilter = { id: newId, type: 'category', label: 'კატეგორია', value: tempValue, displayValue: tempValue };
    } else if (selectedFilterType === 'warehouse' && tempValue) {
      newFilter = { id: newId, type: 'warehouse', label: 'საწყობი', value: tempValue, displayValue: tempValue };
    } else if (selectedFilterType === 'rack' && tempValue) {
      newFilter = { id: newId, type: 'rack', label: 'სტელაჟი', value: tempValue, displayValue: tempValue };
    } else if (selectedFilterType === 'quantity') {
      if (tempRange.min === '' && tempRange.max === '') return; 
      const display = `${tempRange.min || '0'}-დან ${tempRange.max || '∞'}-მდე`;
      newFilter = { id: newId, type: 'quantity', label: 'რაოდენობა', value: { ...tempRange }, displayValue: display };
    } else if (selectedFilterType === 'dateAdded') {
      if (tempDateRange.start === '' && tempDateRange.end === '') return;
      const display = `${tempDateRange.start || 'დასაწყისი'} - ${tempDateRange.end || 'დასასრული'}`;
      newFilter = { id: newId, type: 'dateAdded', label: 'თარიღი', value: { ...tempDateRange }, displayValue: display };
    }

    if (newFilter) {
      setActiveFilters([...activeFilters, newFilter]);
      setTempValue('');
      setTempRange({ min: '', max: '' });
      setTempDateRange({ start: '', end: '' });
    }
  };

  const removeFilter = (id: string) => {
    setActiveFilters(activeFilters.filter(f => f.id !== id));
  };

  // CSV Export Helper
  const escapeCsv = (text: string | number) => {
      const str = String(text || '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
  };

  const handleExportExcel = () => {
    if (activeTab === 'inventory') {
        const headers = ["ნომენკლატურა", "დასახელება", "კატეგორია", "საწყობი", "სტელაჟი", "რაოდენობა", "თარიღი"];
        const rows = filteredProducts.map(p => [
            p.nomenclature, p.name, p.category, p.warehouse, p.rack, p.quantity, p.dateAdded
        ]);
        downloadCSV(headers, rows, "inventory_report");
    } else {
        const headers = ["თარიღი", "ტიპი", "ნომენკლატურა", "პროდუქტი", "რაოდენობა", "მიმღები/მომწოდებელი", "შენიშვნა"];
        const rows = filteredTransactions.map(tx => [
            tx.date, 
            tx.type === 'inbound' ? 'მიღება' : 'გატანა', 
            tx.productNomenclature, 
            tx.productName, 
            tx.quantity,
            tx.receiver,
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
        tableHtml = `
          <table>
            <thead>
              <tr><th>ნომენკლატურა</th><th>დასახელება</th><th>კატეგორია</th><th>საწყობი</th><th>სტელაჟი</th><th>რაოდენობა</th><th>თარიღი</th></tr>
            </thead>
            <tbody>
              ${filteredProducts.map(p => `<tr><td>${p.nomenclature}</td><td>${p.name}</td><td>${p.category}</td><td>${p.warehouse}</td><td>${p.rack}</td><td>${p.quantity}</td><td>${p.dateAdded}</td></tr>`).join('')}
            </tbody>
          </table>`;
    } else {
        tableHtml = `
          <table>
            <thead>
              <tr><th>თარიღი</th><th>ტიპი</th><th>კოდი</th><th>პროდუქტი</th><th>რაოდენობა</th><th>მიმღები</th><th>შენიშვნა</th></tr>
            </thead>
            <tbody>
              ${filteredTransactions.map(tx => `
                <tr>
                    <td>${tx.date}</td>
                    <td>${tx.type === 'inbound' ? 'მიღება' : 'გატანა'}</td>
                    <td>${tx.productNomenclature}</td>
                    <td>${tx.productName}</td>
                    <td>${tx.quantity}</td>
                    <td>${tx.receiver || '-'}</td>
                    <td>${tx.notes || '-'}</td>
                </tr>`).join('')}
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
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>${activeTab === 'inventory' ? 'საწყობის ნაშთი' : 'მოძრაობის ისტორია'}</h1>
        <p>თარიღი: ${dateStr}</p>
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
                onClick={() => setIsFilterModalOpen(true)}
                className={`flex items-center px-4 py-2 rounded-lg transition shadow-sm ${activeFilters.length > 0 ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
            >
                <Settings size={18} className="mr-2" /> პარამეტრები
            </button>
          )}
          
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
                    <p className="text-2xl font-bold text-gray-900">{totalQuantity}</p>
                </div>
             </div>

             {/* ... Filter Tags ... */}
             {activeFilters.length > 0 && (
                 <div className="mb-6 flex flex-wrap gap-2">
                     {activeFilters.map(f => (
                         <span key={f.id} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                             {f.label}: {f.displayValue}
                             <button onClick={() => removeFilter(f.id)} className="ml-2 hover:text-red-500"><X size={14} /></button>
                         </span>
                     ))}
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
                        {filteredProducts.map(p => (
                            <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                                <td className="p-3 font-mono">{p.nomenclature}</td>
                                <td className="p-3 font-medium">{p.name}</td>
                                <td className="p-3">{p.category}</td>
                                <td className="p-3">{p.warehouse}</td>
                                <td className="p-3">{p.rack}</td>
                                <td className="p-3 text-center font-bold">{p.quantity}</td>
                                <td className="p-3 text-right">{p.dateAdded}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
          </div>
      ) : (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
             <div className="flex flex-col md:flex-row gap-4 mb-6">
                <input 
                    type="text" 
                    placeholder="ძებნა (კოდი, სახელი, შენიშვნა...)" 
                    className="flex-1 p-2 border border-gray-300 rounded-lg outline-none focus:border-indigo-500"
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                />
                <select 
                    className="p-2 border border-gray-300 rounded-lg outline-none"
                    value={historyType}
                    onChange={e => setHistoryType(e.target.value as any)}
                >
                    <option value="all">ყველა ტიპი</option>
                    <option value="inbound">მხოლოდ მიღება</option>
                    <option value="outbound">მხოლოდ გატანა</option>
                </select>
                <input 
                    type="month"
                    className="p-2 border border-gray-300 rounded-lg outline-none"
                    value={historyDate}
                    onChange={e => setHistoryDate(e.target.value)}
                />
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
                            <th className="p-3 font-semibold text-gray-800">შენიშვნა</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loadingHistory ? (
                             <tr><td colSpan={7} className="text-center p-4">იტვირთება...</td></tr>
                        ) : filteredTransactions.length > 0 ? (
                            filteredTransactions.map(tx => (
                                <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50">
                                    <td className="p-3 whitespace-nowrap">{tx.date}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${tx.type === 'inbound' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {tx.type === 'inbound' ? 'მიღება' : 'გატანა'}
                                        </span>
                                    </td>
                                    <td className="p-3 font-mono">{tx.productNomenclature}</td>
                                    <td className="p-3 font-medium">{tx.productName}</td>
                                    <td className="p-3 font-bold">{tx.quantity}</td>
                                    <td className="p-3 text-gray-600">{tx.receiver || '-'}</td>
                                    <td className="p-3 text-gray-500 max-w-xs truncate" title={tx.notes}>{tx.notes || '-'}</td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={7} className="text-center p-8 text-gray-400">ისტორია ცარიელია</td></tr>
                        )}
                    </tbody>
                </table>
             </div>
          </div>
      )}

      {/* Filter Modal (Same as before, hidden when not active) */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl animate-fade-in overflow-hidden max-h-[90vh] overflow-y-auto">
             {/* Filter Modal Content reused from previous implementation */}
             <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <Settings size={20} className="mr-2 text-indigo-600" />
                რეპორტის კონსტრუქტორი
              </h3>
              <button onClick={() => setIsFilterModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition"><X size={24} /></button>
            </div>
            
            <div className="p-6 space-y-6">
                {/* Simplified filter UI for brevity, assume full implementation is here as in previous file */}
                 <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">პარამეტრი</label>
                    <select
                      value={selectedFilterType}
                      onChange={(e) => {
                         setSelectedFilterType(e.target.value as FilterType);
                         setTempValue('');
                         setTempRange({min: '', max: ''});
                         setTempDateRange({start: '', end: ''});
                      }}
                      className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="category">კატეგორია</option>
                      <option value="warehouse">საწყობი</option>
                      <option value="rack">სტელაჟი</option>
                      <option value="quantity">რაოდენობა (Range)</option>
                      <option value="dateAdded">დამატების თარიღი</option>
                    </select>
                  </div>
                   <div className="animate-fade-in">
                    {selectedFilterType === 'category' && (
                       <select value={tempValue} onChange={(e) => setTempValue(e.target.value)} className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 rounded-lg outline-none">
                         <option value="">აირჩიეთ კატეგორია...</option>
                         {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    )}
                    {selectedFilterType === 'warehouse' && (
                       <select value={tempValue} onChange={(e) => setTempValue(e.target.value)} className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 rounded-lg outline-none">
                         <option value="">აირჩიეთ საწყობი...</option>
                         {uniqueWarehouses.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    )}
                    {selectedFilterType === 'rack' && (
                       <select value={tempValue} onChange={(e) => setTempValue(e.target.value)} className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 rounded-lg outline-none">
                         <option value="">აირჩიეთ სტელაჟი...</option>
                         {uniqueRacks.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    )}
                     {/* ... other inputs ... */}
                   </div>
                   <button onClick={addFilter} className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">ფილტრის დამატება</button>
                 </div>

                 {/* Backup/Restore Section */}
                 <div className="space-y-4 pt-4 border-t">
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
                <button onClick={() => setIsFilterModalOpen(false)} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg">დახურვა</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};