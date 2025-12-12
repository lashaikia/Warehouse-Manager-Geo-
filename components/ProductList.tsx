
import React, { useState, useEffect } from 'react';
import { Product, Role } from '../types';
import { Search, Edit2, Trash2, AlertCircle, Image as ImageIcon, AlertTriangle, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface ProductListProps {
  products: Product[];
  userRole: Role;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

export const ProductList: React.FC<ProductListProps> = ({ products, userRole, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.nomenclature.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.warehouse || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // Inventory usually shows everything including zero stock, but if you want only active:
    // return matchesSearch && product.quantity > 0;
    // Keeping it showing all for inventory management purposes:
    return matchesSearch;
  });

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Calculate Pagination
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);

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

  const confirmDelete = async () => {
      if (productToDelete) {
          setIsDeleting(true);
          await onDelete(productToDelete.id);
          setIsDeleting(false);
          setProductToDelete(null);
      }
  };

  // Pagination Handlers
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const firstPage = () => setCurrentPage(1);
  const lastPage = () => setCurrentPage(totalPages);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">საწყობის მარაგები</h2>
            <p className="text-sm text-gray-500">სულ: {totalItems} ჩანაწერი</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="ძებნა (სახელი, კოდი, საწყობი)..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-200 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
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
              {currentItems.length > 0 ? (
                currentItems.map((product, index) => {
                  const isLowStock = product.isLowStockTracked && (product.quantity <= product.minQuantity);
                  const hasImage = product.images && product.images.length > 0;
                  const globalIndex = indexOfFirstItem + index + 1;

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
                    {searchTerm ? 'მონაცემები ვერ მოიძებნა' : 'საწყობი ცარიელია'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <span className="text-sm text-gray-500">
                    ნაჩვენებია {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)} / {totalItems}
                </span>
                
                <div className="flex items-center space-x-2">
                    <button 
                        onClick={firstPage}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-gray-600"
                        title="პირველი გვერდი"
                    >
                        <ChevronsLeft size={16} />
                    </button>
                    <button 
                        onClick={prevPage}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-gray-600"
                        title="წინა"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    
                    <span className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg">
                        გვერდი {currentPage} / {totalPages}
                    </span>

                    <button 
                        onClick={nextPage}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-gray-600"
                        title="შემდეგი"
                    >
                        <ChevronRight size={16} />
                    </button>
                    <button 
                        onClick={lastPage}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-gray-600"
                        title="ბოლო გვერდი"
                    >
                        <ChevronsRight size={16} />
                    </button>
                </div>
            </div>
        )}
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
