
import React, { useState, useEffect } from 'react';
import { Product, Role } from '../types';
import { Search, Edit2, Trash2, AlertCircle, Image as ImageIcon, AlertTriangle, Loader2, ChevronLeft, ChevronRight, RefreshCw, X } from 'lucide-react';
import { getProductsPaginated, getProductsCount } from '../services/storage';

interface ProductListProps {
  userRole: Role;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

export const ProductList: React.FC<ProductListProps> = ({ userRole, onEdit, onDelete }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination State
  const ITEMS_PER_PAGE = 100;
  const [totalItems, setTotalItems] = useState(0);
  const [pageStack, setPageStack] = useState<any[]>([null]); // Stack of 'lastDoc' for previous pages
  const [currentPage, setCurrentPage] = useState(1);
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProducts = async (pageIdx: number, lastDoc: any = null, search: string = '') => {
    setLoading(true);
    try {
        const result = await getProductsPaginated(ITEMS_PER_PAGE, lastDoc, search);
        setProducts(result.products);
        
        // Update Stack if going forward
        if (pageIdx >= pageStack.length) {
            setPageStack(prev => [...prev, result.lastDoc]);
        }
    } catch (error) {
        console.error("Failed to fetch products", error);
    } finally {
        setLoading(false);
    }
  };

  const fetchCount = async () => {
      try {
          const count = await getProductsCount();
          setTotalItems(count);
      } catch (e) {
          console.error("Failed to get count", e);
      }
  };

  useEffect(() => {
    fetchCount();
    fetchProducts(0, null, '');
  }, []);

  // Search Handler
  const handleSearch = (e: React.FormEvent) => {
      e.preventDefault();
      // Reset pagination
      setPageStack([null]);
      setCurrentPage(1);
      setActiveSearch(searchTerm);
      fetchProducts(1, null, searchTerm);
  };

  const clearSearch = () => {
      setSearchTerm('');
      setActiveSearch('');
      setPageStack([null]);
      setCurrentPage(1);
      fetchProducts(1, null, '');
      fetchCount();
  };

  const handleNextPage = () => {
      const nextPageIndex = currentPage; // 0-based index for stack is currentPage
      const lastDoc = pageStack[nextPageIndex];
      if (lastDoc || (products.length === ITEMS_PER_PAGE)) {
          setCurrentPage(prev => prev + 1);
          fetchProducts(nextPageIndex + 1, lastDoc, activeSearch);
      }
  };

  const handlePrevPage = () => {
      if (currentPage > 1) {
          const prevPageIndex = currentPage - 2; // Target index in stack
          const lastDoc = pageStack[prevPageIndex];
          setCurrentPage(prev => prev - 1);
          // Truncate stack forward history to avoid stale cursors if data changed? 
          // Firestore cursors are snapshot based, usually fine.
          fetchProducts(prevPageIndex + 1, lastDoc, activeSearch);
      }
  };
  
  const handleRefresh = () => {
      const lastDoc = pageStack[currentPage - 1];
      fetchProducts(currentPage, lastDoc, activeSearch);
      fetchCount();
  };

  const confirmDelete = async () => {
      if (productToDelete) {
          setIsDeleting(true);
          await onDelete(productToDelete.id);
          setIsDeleting(false);
          setProductToDelete(null);
          handleRefresh(); // Reload current page
      }
  };

  const canEdit = userRole === 'admin' || userRole === 'editor';
  const canDelete = userRole === 'admin';

  const getUnitLabel = (u?: string) => {
    switch(u) {
      case 'kg': return 'კგ';
      case 'm': return 'მეტრი';
      case 'l': return 'ლიტრი';
      default: return 'ცალი';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                საწყობის მარაგები
                {loading && <Loader2 size={20} className="ml-3 animate-spin text-gray-400" />}
            </h2>
            <p className="text-sm text-gray-500">სულ: {activeSearch ? 'ნაპოვნია...' : `${totalItems} ჩანაწერი`}</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <form onSubmit={handleSearch} className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="ძებნა ნომენკლატურით..." 
                    className="w-full pl-10 pr-10 py-2 border border-gray-200 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm font-mono"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <button type="button" onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X size={16} />
                    </button>
                )}
            </form>
            <button onClick={handleSearch} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                ძებნა
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {activeSearch && (
            <div className="bg-blue-50 px-4 py-2 text-sm text-blue-700 flex justify-between items-center">
                <span>ძებნის შედეგები: <strong>"{activeSearch}"</strong></span>
                <button onClick={clearSearch} className="text-xs underline hover:text-blue-900">გასუფთავება</button>
            </div>
        )}
        
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold">
                <th className="p-4 w-16">#</th>
                <th className="p-4 w-16">ფოტო</th>
                <th className="p-4">ნომენკლატურა</th>
                <th className="p-4">დასახელება</th>
                <th className="p-4">კატეგორია</th>
                <th className="p-4">საწყობი / სტელაჟი</th>
                <th className="p-4 text-center">რაოდენობა</th>
                {(canEdit || canDelete) && <th className="p-4 text-center">მოქმედება</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                 <tr>
                     <td colSpan={8} className="p-12 text-center text-gray-400">
                         <div className="flex flex-col items-center">
                             <Loader2 size={32} className="animate-spin mb-2" />
                             იტვირთება მონაცემები...
                         </div>
                     </td>
                 </tr>
              ) : products.length > 0 ? (
                products.map((product, index) => {
                  const isLowStock = product.isLowStockTracked && (product.quantity <= product.minQuantity);
                  const hasImage = product.images && product.images.length > 0;
                  const globalIndex = ((currentPage - 1) * ITEMS_PER_PAGE) + index + 1;

                  return (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-xs text-gray-400 font-mono">{globalIndex}</td>
                      <td className="p-4">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center border border-gray-200">
                          {hasImage ? (
                            <img src={product.images[0]} alt="thumbnail" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={16} className="text-gray-400" />
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-sm text-gray-600 font-bold">{product.nomenclature}</td>
                      <td className="p-4 text-gray-800 font-medium">{product.name}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                          {product.category || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {product.warehouse ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-700">{product.warehouse}</span>
                            <span className="text-xs text-gray-500">{product.rack}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <span className={`font-semibold ${isLowStock ? 'text-red-600' : 'text-gray-700'}`}>
                            {product.quantity} <span className="text-xs font-normal text-gray-500 ml-1">{getUnitLabel(product.unit)}</span>
                          </span>
                          {isLowStock && (
                            <div className="group relative">
                              <AlertCircle size={16} className="text-red-500 cursor-help" />
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                მცირე მარაგი! (მინ: {product.minQuantity})
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      {(canEdit || canDelete) && (
                        <td className="p-4">
                          <div className="flex justify-center space-x-2">
                            {canEdit && (
                              <button 
                                onClick={() => onEdit(product)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="რედაქტირება"
                              >
                                <Edit2 size={16} />
                              </button>
                            )}
                            {canDelete && (
                              <button 
                                onClick={() => setProductToDelete(product)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="წაშლა"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={canEdit || canDelete ? 8 : 7} className="p-8 text-center text-gray-500">
                    {activeSearch ? 'ვერაფერი მოიძებნა' : 'საწყობი ცარიელია'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-4">
                <button onClick={handleRefresh} className="p-2 text-gray-500 hover:bg-white rounded border border-transparent hover:border-gray-200 transition" title="განახლება">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
                <span className="text-sm text-gray-500">
                    გვერდი {currentPage}
                </span>
            </div>
            
            <div className="flex items-center space-x-2">
                <button 
                    onClick={handlePrevPage}
                    disabled={currentPage === 1 || loading}
                    className="flex items-center px-4 py-2 rounded-lg border bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-gray-600 text-sm font-medium transition"
                >
                    <ChevronLeft size={16} className="mr-1" />
                    წინა
                </button>

                <button 
                    onClick={handleNextPage}
                    disabled={products.length < ITEMS_PER_PAGE || loading}
                    className="flex items-center px-4 py-2 rounded-lg border bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-gray-600 text-sm font-medium transition"
                >
                    შემდეგი
                    <ChevronRight size={16} className="ml-1" />
                </button>
            </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">ნამდვილად გსურთ წაშლა?</h3>
              <p className="text-gray-500 text-sm mb-6">
                პროდუქტი <strong>"{productToDelete.name}"</strong> და მისი მონაცემები სამუდამოდ წაიშლება.
              </p>
              
              <div className="flex space-x-3 justify-center">
                <button 
                  onClick={() => setProductToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                >
                  გაუქმება
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium flex items-center shadow-md"
                >
                  {isDeleting ? <Loader2 size={18} className="animate-spin mr-2"/> : <Trash2 size={18} className="mr-2" />}
                  წაშლა
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
