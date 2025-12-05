import React, { useState, useEffect } from 'react';
import { Product, Transaction } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Package, AlertTriangle, Layers, Wifi, X, Maximize2, List, Gamepad2, ClipboardList, CheckCircle, Camera, Image as ImageIcon, Save, Loader2 } from 'lucide-react';
import { SnakeGame } from './SnakeGame';
import { getTransactions, updateTransaction } from '../services/storage';

interface DashboardProps {
  products: Product[];
}

export const Dashboard: React.FC<DashboardProps> = ({ products }) => {
  // Fetch transactions for Debt calculation
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  useEffect(() => {
    getTransactions().then(setTransactions);
  }, [products]); // Reload when products change

  // Filter for active products (quantity > 0)
  const activeProducts = products.filter(p => p.quantity > 0);

  const totalProducts = activeProducts.length;
  const lowStockProducts = activeProducts.filter(p => p.isLowStockTracked && (p.quantity <= p.minQuantity));
  const lowStockCount = lowStockProducts.length;

  const debtTransactions = transactions.filter(t => t.isDebt);
  const debtCount = debtTransactions.length;

  const [expandedChart, setExpandedChart] = useState(false);
  const [showActiveList, setShowActiveList] = useState(false);
  const [showLowStockList, setShowLowStockList] = useState(false);
  const [showCategoryList, setShowCategoryList] = useState(false);
  const [showDebtList, setShowDebtList] = useState(false);
  const [showSnakeGame, setShowSnakeGame] = useState(false);

  // Resolution Modal State
  const [resolvingTransaction, setResolvingTransaction] = useState<Transaction | null>(null);
  const [resolutionImage, setResolutionImage] = useState<string>('');
  const [isResolving, setIsResolving] = useState(false);

  // Logic Change: Count products per category (assortment size), not sum of quantities
  const categoryData = activeProducts.reduce((acc, curr) => {
    const existing = acc.find(item => item.name === curr.category);
    if (existing) {
      existing.value += 1; // Increment count of products
    } else {
      acc.push({ name: curr.category || 'სხვა', value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);
  
  const activeCategoriesCount = categoryData.length;

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const getUnitLabel = (u?: string) => {
    switch(u) {
      case 'kg': return 'კგ';
      case 'm': return 'მეტრი';
      case 'l': return 'ლიტრი';
      default: return 'ცალი';
    }
  };

  const handleResolveClick = (tx: Transaction) => {
    setResolvingTransaction(tx);
    setResolutionImage('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setResolutionImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitResolution = async () => {
    if (!resolvingTransaction) return;
    setIsResolving(true);
    
    // Update the transaction in DB
    const updatedTransactions = await updateTransaction(resolvingTransaction.id, {
        isDebt: false,
        resolutionImage: resolutionImage,
        resolutionDate: new Date().toISOString().split('T')[0]
    });
    
    setTransactions(updatedTransactions);
    setIsResolving(false);
    setResolvingTransaction(null);
    setResolutionImage('');
    
    // Close debt list if empty, or keep open
    // setShowDebtList(false); // Optional: close list automatically
  };

  // Generic List Modal
  const ListModal = ({ title, items, onClose, type }: { title: string, items: any[], onClose: () => void, type: 'product' | 'transaction' }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col text-gray-800" onClick={e => e.stopPropagation()}>
         <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="text-lg font-bold text-gray-800">{title}</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition"><X size={20} /></button>
         </div>
         <div className="p-0 overflow-y-auto flex-1 bg-white">
            {items.length > 0 ? (
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 text-gray-600 sticky top-0 z-10">
                        <tr>
                            {type === 'product' ? (
                                <>
                                    <th className="p-3">კოდი</th>
                                    <th className="p-3">დასახელება</th>
                                    <th className="p-3 text-center">რაოდენობა</th>
                                    <th className="p-3">საწყობი</th>
                                    <th className="p-3 text-right">თარიღი</th>
                                </>
                            ) : (
                                <>
                                    <th className="p-3">თარიღი</th>
                                    <th className="p-3">კოდი</th>
                                    <th className="p-3">პროდუქტი</th>
                                    <th className="p-3 text-center">რაოდენობა</th>
                                    <th className="p-3">მიმღები</th>
                                    <th className="p-3">შენიშვნა</th>
                                    {/* Action Column for Debt List */}
                                    {items[0]?.isDebt && <th className="p-3 text-center">მოქმედება</th>}
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-800">
                        {items.sort((a,b) => new Date(b.date || b.dateAdded).getTime() - new Date(a.date || a.dateAdded).getTime()).map(item => (
                            <tr key={item.id} className="hover:bg-gray-50">
                                {type === 'product' ? (
                                    <>
                                        <td className="p-3 font-mono text-gray-600">{item.nomenclature}</td>
                                        <td className="p-3 font-medium text-gray-900">{item.name}</td>
                                        <td className="p-3 text-center font-bold text-gray-900">
                                            {item.quantity} <span className="text-xs font-normal text-gray-500">{getUnitLabel(item.unit)}</span>
                                        </td>
                                        <td className="p-3 text-gray-600">{item.warehouse}</td>
                                        <td className="p-3 text-right text-gray-500">{item.dateAdded}</td>
                                    </>
                                ) : (
                                    <>
                                        <td className="p-3 text-gray-500 whitespace-nowrap">{item.date}</td>
                                        <td className="p-3 font-mono text-gray-600">{item.productNomenclature}</td>
                                        <td className="p-3 font-medium text-gray-900">{item.productName}</td>
                                        <td className="p-3 text-center font-bold text-gray-900">
                                            {item.quantity} <span className="text-xs font-normal text-gray-500">{getUnitLabel(item.unit)}</span>
                                        </td>
                                        <td className="p-3 text-gray-900 font-bold">{item.receiver}</td>
                                        <td className="p-3 text-gray-500 max-w-xs truncate">{item.notes}</td>
                                        {/* Resolve Button */}
                                        {item.isDebt && (
                                            <td className="p-3 text-center">
                                                <button 
                                                    onClick={() => handleResolveClick(item)}
                                                    className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full hover:bg-green-200 transition border border-green-200"
                                                >
                                                    <CheckCircle size={14} className="mr-1" />
                                                    საბუთის მიღება
                                                </button>
                                            </td>
                                        )}
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p className="text-center p-8 text-gray-500">სია ცარიელია</p>
            )}
         </div>
      </div>
    </div>
  );

  // Category List Modal
  const CategoryListModal = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col text-gray-800" onClick={e => e.stopPropagation()}>
         <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="text-lg font-bold text-gray-800">კატეგორიები</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition"><X size={20} /></button>
         </div>
         <div className="p-0 overflow-y-auto flex-1 bg-white">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-600 sticky top-0">
                    <tr>
                        <th className="p-3">კატეგორია</th>
                        <th className="p-3 text-right">დასახელების რაოდენობა</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-800">
                    {categoryData.sort((a,b) => b.value - a.value).map((cat, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                            <td className="p-3 font-medium text-gray-900">{cat.name}</td>
                            <td className="p-3 text-right font-bold text-gray-900">{cat.value}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
         </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">მიმოხილვა</h2>
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-100 text-sm font-medium">
             <Wifi size={16} />
             <span>Cloud Connected</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
            onClick={() => setShowActiveList(true)}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 cursor-pointer hover:shadow-md transition group"
        >
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full group-hover:bg-blue-600 group-hover:text-white transition">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">აქტიური პროდუქტები</p>
            <p className="text-2xl font-bold text-gray-800">{totalProducts}</p>
          </div>
        </div>

        {/* Active Categories */}
        <div 
            onClick={() => setShowCategoryList(true)}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 cursor-pointer hover:shadow-md transition group"
        >
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full group-hover:bg-emerald-600 group-hover:text-white transition">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">აქტიური კატეგორიები</p>
            <p className="text-2xl font-bold text-gray-800">{activeCategoriesCount}</p>
          </div>
        </div>

        {/* Debt Card */}
        <div 
            onClick={() => debtCount > 0 && setShowDebtList(true)}
            className={`p-6 rounded-xl shadow-sm border flex items-center space-x-4 transition ${debtCount > 0 ? 'bg-purple-50 border-purple-100 cursor-pointer hover:shadow-md' : 'bg-white border-gray-100'}`}
        >
          <div className={`p-3 rounded-full ${debtCount > 0 ? 'bg-purple-200 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
            <ClipboardList size={24} />
          </div>
          <div>
            <p className={`text-sm ${debtCount > 0 ? 'text-purple-700 font-medium' : 'text-gray-500'}`}>მოლოდინში (ვალი)</p>
            <p className={`text-2xl font-bold ${debtCount > 0 ? 'text-purple-800' : 'text-gray-800'}`}>{debtCount}</p>
          </div>
        </div>

        <div 
            onClick={() => lowStockCount > 0 && setShowLowStockList(true)}
            className={`p-6 rounded-xl shadow-sm border flex items-center space-x-4 transition ${lowStockCount > 0 ? 'bg-red-50 border-red-100 cursor-pointer hover:shadow-md' : 'bg-white border-gray-100'}`}
        >
          <div className={`p-3 rounded-full ${lowStockCount > 0 ? 'bg-red-200 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className={`text-sm ${lowStockCount > 0 ? 'text-red-700 font-medium' : 'text-gray-500'}`}>ყურადღება (ზღვარი)</p>
            <p className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-red-800' : 'text-gray-800'}`}>{lowStockCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative group">
        <div className="flex justify-between items-center mb-4">
             <h3 className="text-lg font-semibold text-gray-700">ასორტიმენტი კატეგორიების მიხედვით (დასახელება)</h3>
             <button onClick={() => setExpandedChart(true)} className="text-gray-400 hover:text-blue-600 transition"><Maximize2 size={20} /></button>
        </div>
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} /> 
                <Tooltip 
                formatter={(value) => [`${value} დასახელება`, 'რაოდენობა']}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
                </Bar>
            </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Fun Button */}
      <div className="flex justify-center mt-8">
        <button 
          onClick={() => setShowSnakeGame(true)}
          className="group flex items-center space-x-2 px-5 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
        >
          <Gamepad2 size={20} className="group-hover:rotate-12 transition-transform" />
          <span className="font-bold tracking-wide text-sm">გართობა</span>
        </button>
      </div>

      {/* Expanded Chart Modal */}
      {expandedChart && (
        <div className="fixed inset-0 bg-white z-50 p-8 flex flex-col animate-fade-in text-gray-800">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">დეტალური სტატისტიკა</h2>
                <button onClick={() => setExpandedChart(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={24}/></button>
            </div>
            <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip formatter={(value) => [`${value} დასახელება`, 'რაოდენობა']} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      )}

      {/* Active List Modal */}
      {showActiveList && (
        <ListModal 
            title="აქტიური მარაგები (რაოდენობა > 0)" 
            items={activeProducts} 
            onClose={() => setShowActiveList(false)} 
            type="product"
        />
      )}
      
      {/* Category List Modal */}
      {showCategoryList && (
          <CategoryListModal onClose={() => setShowCategoryList(false)} />
      )}

      {/* Debt List Modal */}
      {showDebtList && (
          <ListModal 
            title="უსაბუთოდ გაცემული საქონელი (ვალები)"
            items={debtTransactions}
            onClose={() => setShowDebtList(false)}
            type="transaction"
          />
      )}

      {/* Low Stock Modal */}
      {showLowStockList && (
        <ListModal 
            title="მცირე მარაგები (ზღვარს ქვემოთ)" 
            items={lowStockProducts} 
            onClose={() => setShowLowStockList(false)} 
            type="product"
        />
      )}

      {/* Snake Game Modal */}
      {showSnakeGame && (
        <SnakeGame onClose={() => setShowSnakeGame(false)} />
      )}

      {/* Resolution Modal */}
      {resolvingTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-fade-in overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center">
                        <CheckCircle size={20} className="mr-2 text-green-600" />
                        ვალის დახურვა / საბუთის მიღება
                    </h3>
                    <button onClick={() => setResolvingTransaction(null)} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      {/* Added text-gray-800 to ensure readability */}
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 text-sm space-y-2 text-gray-800">
                          <p><strong className="text-gray-900">პროდუქტი:</strong> {resolvingTransaction.productName} ({resolvingTransaction.productNomenclature})</p>
                          <p><strong className="text-gray-900">გამტანი:</strong> {resolvingTransaction.receiver}</p>
                          <p><strong className="text-gray-900">რაოდენობა:</strong> {resolvingTransaction.quantity} {getUnitLabel(resolvingTransaction.unit)}</p>
                          <p><strong className="text-gray-900">თარიღი:</strong> {resolvingTransaction.date}</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 block">მიამაგრეთ საბუთის ფოტო (სურვილისამებრ)</label>
                        <div className="flex gap-4">
                            <div className="relative flex-1">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <button type="button" className="w-full flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-200 transition">
                                    <ImageIcon size={20} className="mr-2" />
                                    გალერეა
                                </button>
                            </div>
                            <div className="relative flex-1">
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleImageUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <button type="button" className="w-full flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-200 transition">
                                    <Camera size={20} className="mr-2" />
                                    კამერა
                                </button>
                            </div>
                        </div>

                        {resolutionImage && (
                            <div className="mt-4 relative group w-full h-48 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                <img src={resolutionImage} alt="Resolution Proof" className="w-full h-full object-contain" />
                                <button 
                                    onClick={() => setResolutionImage('')}
                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full shadow hover:bg-red-600"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                      </div>

                      <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100 mt-4">
                        <button
                            onClick={() => setResolvingTransaction(null)}
                            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                        >
                            გაუქმება
                        </button>
                        <button
                            onClick={submitResolution}
                            disabled={isResolving}
                            className="px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 shadow-md transition flex items-center disabled:opacity-50"
                        >
                            {isResolving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save size={18} className="mr-2" />}
                            დადასტურება
                        </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};