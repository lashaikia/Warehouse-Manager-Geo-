import React, { useState, useMemo, useEffect } from 'react';
import { Product, Transaction } from '../types';
import { Printer, FileSpreadsheet, Package, History, CheckCircle2, AlertOctagon, ArrowRight, Loader2 } from 'lucide-react';
import { getTransactions } from '../services/storage';

interface CustomReportProps {
  products: Product[];
}

export const CustomReport: React.FC<CustomReportProps> = ({ products }) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('inventory');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter States
  const [filters, setFilters] = useState({
      inboundDateFrom: '',
      inboundDateTo: '',
      outboundDateFrom: '',
      outboundDateTo: '',
      unit: '',
      supplier: '',
      receiver: '',
      category: '',
      warehouse: '',
      rack: '',
      qtyMin: '',
      qtyMax: '',
      isDebt: false,
      useRange: true
  });

  useEffect(() => {
    const load = async () => {
        setLoading(true);
        const txs = await getTransactions();
        setTransactions(txs);
        setLoading(false);
    };
    load();
  }, []);

  // Unique options for dropdowns
  const uniqueCategories = useMemo(() => Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort(), [products]);
  const uniqueWarehouses = useMemo(() => Array.from(new Set(products.map(p => p.warehouse).filter(Boolean))).sort(), [products]);
  const uniqueRacks = useMemo(() => Array.from(new Set(products.map(p => p.rack).filter(Boolean))).sort(), [products]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      const checked = (e.target as HTMLInputElement).checked;
      setFilters(prev => ({
          ...prev,
          [name]: type === 'checkbox' ? checked : value
      }));
  };

  const clearFilters = () => {
      setFilters({
        inboundDateFrom: '',
        inboundDateTo: '',
        outboundDateFrom: '',
        outboundDateTo: '',
        unit: '',
        supplier: '',
        receiver: '',
        category: '',
        warehouse: '',
        rack: '',
        qtyMin: '',
        qtyMax: '',
        isDebt: false,
        useRange: true
      });
  };

  // --- FILTERING LOGIC ---

  const filteredData = useMemo(() => {
    if (activeTab === 'inventory') {
        // Inventory Filtering (with cross-referencing transactions)
        return products.filter(p => {
             // 1. Basic Product Filters
             if (filters.category && p.category !== filters.category) return false;
             if (filters.warehouse && p.warehouse !== filters.warehouse) return false;
             if (filters.rack && p.rack !== filters.rack) return false;
             if (filters.unit && p.unit !== filters.unit) return false;
             if (filters.qtyMin && p.quantity < Number(filters.qtyMin)) return false;
             if (filters.qtyMax && p.quantity > Number(filters.qtyMax)) return false;

             // 2. Cross-referencing logic (Check related transactions)
             const productTxs = transactions.filter(t => t.productId === p.id);

             // Supplier (Inbound Receiver/Source)
             if (filters.supplier) {
                 const hasSupplier = productTxs.some(t => t.type === 'inbound' && (t.receiver || '').toLowerCase().includes(filters.supplier.toLowerCase()));
                 if (!hasSupplier) return false;
             }

             // Receiver (Outbound Receiver)
             if (filters.receiver) {
                 const hasReceiver = productTxs.some(t => t.type === 'outbound' && (t.receiver || '').toLowerCase().includes(filters.receiver.toLowerCase()));
                 if (!hasReceiver) return false;
             }

             // Debt
             if (filters.isDebt) {
                 const hasDebt = productTxs.some(t => t.isDebt);
                 if (!hasDebt) return false;
             }

             // Inbound Date
             if (filters.inboundDateFrom) {
                 const pDate = p.dateAdded;
                 const hasInboundTx = productTxs.some(t => {
                     if (t.type !== 'inbound') return false;
                     if (filters.useRange && filters.inboundDateTo) {
                         return t.date >= filters.inboundDateFrom && t.date <= filters.inboundDateTo;
                     }
                     return t.date === filters.inboundDateFrom;
                 });
                 // Match creation date OR inbound transaction date
                 let dateMatch = false;
                 if (filters.useRange && filters.inboundDateTo) {
                     dateMatch = pDate >= filters.inboundDateFrom && pDate <= filters.inboundDateTo;
                 } else {
                     dateMatch = pDate === filters.inboundDateFrom;
                 }
                 if (!dateMatch && !hasInboundTx) return false;
             }

             // Outbound Date
             if (filters.outboundDateFrom) {
                 const hasOutboundTx = productTxs.some(t => {
                     if (t.type !== 'outbound') return false;
                     if (filters.useRange && filters.outboundDateTo) {
                         return t.date >= filters.outboundDateFrom && t.date <= filters.outboundDateTo;
                     }
                     return t.date === filters.outboundDateFrom;
                 });
                 if (!hasOutboundTx) return false;
             }

             return true;
        });
    } else {
        // History Filtering
        return transactions.filter(tx => {
            const relatedProduct = products.find(p => p.id === tx.productId);

            // Basic Transaction Filters
            if (filters.unit && tx.unit !== filters.unit) return false;
            if (filters.qtyMin && tx.quantity < Number(filters.qtyMin)) return false;
            if (filters.qtyMax && tx.quantity > Number(filters.qtyMax)) return false;
            if (filters.isDebt && !tx.isDebt) return false;

            // Attribute Filters (via Product)
            if (filters.category && relatedProduct && relatedProduct.category !== filters.category) return false;
            if (filters.warehouse && relatedProduct && relatedProduct.warehouse !== filters.warehouse) return false;
            if (filters.rack && relatedProduct && relatedProduct.rack !== filters.rack) return false;

            // Inbound Specifics
            if (filters.supplier) {
                // Supplier filter applies to Inbound transactions
                if (tx.type !== 'inbound') return false; 
                if (!(tx.receiver || '').toLowerCase().includes(filters.supplier.toLowerCase())) return false;
            }
            if (filters.inboundDateFrom) {
                 if (tx.type !== 'inbound') return false;
                 if (filters.useRange && filters.inboundDateTo) {
                     if (tx.date < filters.inboundDateFrom || tx.date > filters.inboundDateTo) return false;
                 } else {
                     if (tx.date !== filters.inboundDateFrom) return false;
                 }
            }

            // Outbound Specifics
            if (filters.receiver) {
                // Receiver filter applies to Outbound transactions
                if (tx.type !== 'outbound') return false;
                if (!(tx.receiver || '').toLowerCase().includes(filters.receiver.toLowerCase())) return false;
            }
            if (filters.outboundDateFrom) {
                 if (tx.type !== 'outbound') return false;
                 if (filters.useRange && filters.outboundDateTo) {
                     if (tx.date < filters.outboundDateFrom || tx.date > filters.outboundDateTo) return false;
                 } else {
                     if (tx.date !== filters.outboundDateFrom) return false;
                 }
            }

            return true;
        });
    }
  }, [products, transactions, activeTab, filters]);


  // Helpers
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

  const handleExport = () => {
    let headers: string[] = [];
    let rows: (string|number)[][] = [];
    let filename = "";

    if (activeTab === 'inventory') {
        headers = ["ნომენკლატურა", "დასახელება", "კატეგორია", "საწყობი", "სტელაჟი", "რაოდენობა", "ერთეული", "თარიღი"];
        rows = (filteredData as Product[]).map(p => [
            p.nomenclature, p.name, p.category, p.warehouse, p.rack, p.quantity, getUnitLabel(p.unit), p.dateAdded
        ]);
        filename = "custom_inventory_report";
    } else {
        headers = ["თარიღი", "ტიპი", "ნომენკლატურა", "პროდუქტი", "რაოდენობა", "ერთეული", "მიმღები/მომწოდებელი", "სტატუსი", "ვალის დახურვის თარიღი", "შენიშვნა"];
        rows = (filteredData as Transaction[]).map(tx => [
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
        filename = "custom_history_report";
    }
    
    const csvContent = [headers.join(','), ...rows.map(row => row.map(escapeCsv).join(','))].join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
             <h2 className="text-2xl font-bold text-gray-800">რეპორტის კონსტრუქტორი</h2>
             <p className="text-gray-500 text-sm">დეტალური ძებნა ბაზაში</p>
           </div>
           
           <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                    onClick={() => setActiveTab('inventory')}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'inventory' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                >
                    <Package size={16} className="mr-2" /> მიმდინარე ნაშთი
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                >
                    <History size={16} className="mr-2" /> მოძრაობის ისტორია
                </button>
           </div>
        </div>

        {/* CONTROLS (Always Visible) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
            
            {/* Row 1: Dates & Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2 p-3 bg-green-50 rounded-lg border border-green-100">
                    <label className="text-xs font-bold text-green-800 uppercase block mb-2">მიღების თარიღი</label>
                    <div className="flex items-center gap-2">
                        <input 
                            type="date" 
                            name="inboundDateFrom" 
                            value={filters.inboundDateFrom} 
                            onChange={handleChange} 
                            lang="ka"
                            className="w-full p-2.5 bg-white border border-gray-300 text-black rounded-lg text-sm outline-none focus:ring-1 focus:ring-green-500" 
                        />
                        {filters.useRange && (
                           <>
                             <ArrowRight size={16} className="text-green-400" />
                             <input 
                                type="date" 
                                name="inboundDateTo" 
                                value={filters.inboundDateTo} 
                                onChange={handleChange} 
                                lang="ka"
                                className="w-full p-2.5 bg-white border border-gray-300 text-black rounded-lg text-sm outline-none focus:ring-1 focus:ring-green-500" 
                            />
                           </>
                        )}
                    </div>
                </div>

                <div className="space-y-2 p-3 bg-orange-50 rounded-lg border border-orange-100">
                    <label className="text-xs font-bold text-orange-800 uppercase block mb-2">გაცემის თარიღი</label>
                    <div className="flex items-center gap-2">
                        <input 
                            type="date" 
                            name="outboundDateFrom" 
                            value={filters.outboundDateFrom} 
                            onChange={handleChange} 
                            lang="ka"
                            className="w-full p-2.5 bg-white border border-gray-300 text-black rounded-lg text-sm outline-none focus:ring-1 focus:ring-orange-500" 
                        />
                        {filters.useRange && (
                           <>
                             <ArrowRight size={16} className="text-orange-400" />
                             <input 
                                type="date" 
                                name="outboundDateTo" 
                                value={filters.outboundDateTo} 
                                onChange={handleChange} 
                                lang="ka"
                                className="w-full p-2.5 bg-white border border-gray-300 text-black rounded-lg text-sm outline-none focus:ring-1 focus:ring-orange-500" 
                             />
                           </>
                        )}
                    </div>
                </div>

                <div className="flex items-center p-3 h-full">
                     <input type="checkbox" id="useRange" name="useRange" checked={filters.useRange} onChange={handleChange} className="w-5 h-5 text-indigo-600 rounded cursor-pointer" />
                     <label htmlFor="useRange" className="ml-2 text-sm font-medium text-gray-700 cursor-pointer">თარიღის ინტერვალის გამოყენება (დან - მდე)</label>
                </div>
            </div>

            {/* Row 2: Text Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">მომწოდებელი</label>
                    <input 
                        type="text" 
                        name="supplier" 
                        value={filters.supplier} 
                        onChange={handleChange} 
                        placeholder="სახელი..." 
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 text-black rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500" 
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">მიმღები</label>
                    <input 
                        type="text" 
                        name="receiver" 
                        value={filters.receiver} 
                        onChange={handleChange} 
                        placeholder="სახელი..." 
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 text-black rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500" 
                    />
                </div>
                <div>
                     <label className="text-xs font-medium text-gray-500 block mb-1">საზომი ერთეული</label>
                     <select name="unit" value={filters.unit} onChange={handleChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 text-black rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500">
                         <option value="">ყველა</option>
                         <option value="pcs">ცალი (pcs)</option>
                         <option value="kg">წონა (kg)</option>
                         <option value="m">სიგრძე (m)</option>
                         <option value="l">მოცულობა (l)</option>
                     </select>
                </div>
                <div className="flex items-end">
                     <div className="bg-red-50 p-2.5 rounded-lg border border-red-100 flex items-center w-full">
                        <input type="checkbox" id="isDebt" name="isDebt" checked={filters.isDebt} onChange={handleChange} className="w-4 h-4 text-red-600 rounded cursor-pointer" />
                        <label htmlFor="isDebt" className="ml-2 text-sm font-bold text-red-700 cursor-pointer">მხოლოდ ვალი</label>
                     </div>
                </div>
            </div>

            {/* Row 3: Dropdowns & Quantity */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <div>
                     <label className="text-xs font-medium text-gray-500 block mb-1">კატეგორია</label>
                     <select name="category" value={filters.category} onChange={handleChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 text-black rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500">
                         <option value="">ყველა</option>
                         {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                </div>
                <div>
                     <label className="text-xs font-medium text-gray-500 block mb-1">საწყობი</label>
                     <select name="warehouse" value={filters.warehouse} onChange={handleChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 text-black rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500">
                         <option value="">ყველა</option>
                         {uniqueWarehouses.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                </div>
                <div>
                     <label className="text-xs font-medium text-gray-500 block mb-1">სტელაჟი</label>
                     <select name="rack" value={filters.rack} onChange={handleChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 text-black rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500">
                         <option value="">ყველა</option>
                         {uniqueRacks.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                </div>
                <div className="flex gap-2">
                     <div className="w-1/2">
                        <label className="text-xs font-medium text-gray-500 block mb-1">რაოდ. Min</label>
                        <input type="number" name="qtyMin" value={filters.qtyMin} onChange={handleChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 text-black rounded-lg text-sm outline-none" placeholder="0" />
                     </div>
                     <div className="w-1/2">
                        <label className="text-xs font-medium text-gray-500 block mb-1">Max</label>
                        <input type="number" name="qtyMax" value={filters.qtyMax} onChange={handleChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 text-black rounded-lg text-sm outline-none" placeholder="∞" />
                     </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                 <button onClick={clearFilters} className="px-4 py-2 text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition text-sm">გასუფთავება</button>
                 <button onClick={handleExport} className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition text-sm flex items-center"><FileSpreadsheet size={16} className="mr-2"/> Excel</button>
                 <button onClick={handlePrint} className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition text-sm flex items-center"><Printer size={16} className="mr-2"/> ბეჭდვა</button>
            </div>
        </div>

        {/* RESULTS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[300px]">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                 <h3 className="font-bold text-gray-700">შედეგები ({filteredData.length})</h3>
                 {loading && <Loader2 className="animate-spin text-indigo-600" size={20} />}
            </div>
            
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse text-sm">
                   <thead>
                       {activeTab === 'inventory' ? (
                          <tr className="bg-gray-50 text-gray-600">
                            <th className="p-3">ნომენკლატურა</th>
                            <th className="p-3">დასახელება</th>
                            <th className="p-3">კატეგორია</th>
                            <th className="p-3">საწყობი</th>
                            <th className="p-3">სტელაჟი</th>
                            <th className="p-3 text-center">რაოდენობა</th>
                            <th className="p-3 text-right">თარიღი</th>
                          </tr>
                       ) : (
                          <tr className="bg-gray-50 text-gray-600">
                            <th className="p-3">თარიღი</th>
                            <th className="p-3">ტიპი</th>
                            <th className="p-3">კოდი</th>
                            <th className="p-3">პროდუქტი</th>
                            <th className="p-3 text-center">რაოდენობა</th>
                            <th className="p-3">მიმღები/მომწოდებელი</th>
                            <th className="p-3">სტატუსი</th>
                            <th className="p-3">შენიშვნა</th>
                          </tr>
                       )}
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                       {filteredData.length > 0 ? filteredData.map((item: any) => (
                           <tr key={item.id} className="hover:bg-gray-50 text-gray-800">
                               {activeTab === 'inventory' ? (
                                   <>
                                    <td className="p-3 font-mono">{item.nomenclature}</td>
                                    <td className="p-3 font-medium">{item.name}</td>
                                    <td className="p-3">{item.category}</td>
                                    <td className="p-3">{item.warehouse}</td>
                                    <td className="p-3">{item.rack}</td>
                                    <td className="p-3 text-center font-bold">{item.quantity} {getUnitLabel(item.unit)}</td>
                                    <td className="p-3 text-right">{item.dateAdded}</td>
                                   </>
                               ) : (
                                   <>
                                    <td className="p-3 whitespace-nowrap">{item.date}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${item.type === 'inbound' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {item.type === 'inbound' ? 'მიღება' : 'გატანა'}
                                        </span>
                                    </td>
                                    <td className="p-3 font-mono">{item.productNomenclature}</td>
                                    <td className="p-3 font-medium">{item.productName}</td>
                                    <td className="p-3 text-center font-bold">{item.quantity} {getUnitLabel(item.unit)}</td>
                                    <td className="p-3">{item.receiver || '-'}</td>
                                    <td className="p-3">
                                        {item.isDebt ? <span className="text-xs font-bold text-purple-600 flex items-center"><AlertOctagon size={12} className="mr-1"/> ვალი</span> : item.resolutionDate ? <span className="text-xs font-bold text-green-600 flex items-center"><CheckCircle2 size={12} className="mr-1"/> დაიხურა</span> : '-'}
                                    </td>
                                    <td className="p-3 text-gray-500 max-w-xs truncate">{item.notes || '-'}</td>
                                   </>
                               )}
                           </tr>
                       )) : (
                           <tr><td colSpan={8} className="text-center p-8 text-gray-400">მონაცემები არ მოიძებნა</td></tr>
                       )}
                   </tbody>
               </table>
            </div>
        </div>
    </div>
  );
};