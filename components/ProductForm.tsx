import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { Save, X, Camera, Image as ImageIcon, ChevronDown, Calendar, Loader2 } from 'lucide-react';
import { getOptions } from '../services/storage';

interface ProductFormProps {
  initialData?: Product;
  onSubmit: (data: Omit<Product, 'id' | 'lastUpdated'>) => void;
  onCancel: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    nomenclature: '',
    name: '',
    category: '',
    quantity: 0,
    warehouse: '',
    rack: '',
    minQuantity: 5,
    dateAdded: new Date().toISOString().split('T')[0],
    images: [] as string[],
    isLowStockTracked: true
  });

  const [warehouseOptions, setWarehouseOptions] = useState<string[]>([]);
  const [rackOptions, setRackOptions] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadOptions = async () => {
        const w = await getOptions('warehouses');
        const r = await getOptions('racks');
        const c = await getOptions('categories');
        setWarehouseOptions(w);
        setRackOptions(r);
        setCategoryOptions(c);
    };
    loadOptions();

    if (initialData) {
      setFormData({
        nomenclature: initialData.nomenclature,
        name: initialData.name,
        category: initialData.category,
        quantity: initialData.quantity,
        warehouse: initialData.warehouse || '',
        rack: initialData.rack || '',
        minQuantity: initialData.minQuantity,
        dateAdded: initialData.dateAdded || new Date().toISOString().split('T')[0],
        images: initialData.images || [],
        isLowStockTracked: initialData.isLowStockTracked ?? true
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value)
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({
            ...prev,
            images: [...prev.images, reader.result as string]
          }));
        };
        reader.readAsDataURL(file as Blob);
      });
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
  };

  return (
    <div className="bg-white p-4 md:p-8 rounded-xl shadow-lg border border-gray-100 max-w-3xl mx-auto animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {initialData ? 'პროდუქტის რედაქტირება' : 'ახალი ნომენკლატურის დამატება'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">ნომენკლატურა (კოდი) *</label>
            <input
              required
              name="nomenclature"
              value={formData.nomenclature}
              onChange={handleChange}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition font-mono"
              placeholder="მაგ: 1000523"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">კატეგორია</label>
            <div className="relative">
                <input
                    list="category-options"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    placeholder="მაგ: ელექტრონიკა"
                />
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                <datalist id="category-options">
                    {categoryOptions.map((option) => (
                        <option key={option} value={option} />
                    ))}
                </datalist>
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-700">დასახელება *</label>
            <input
              required
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="პროდუქტის სრული სახელი"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">რაოდენობა *</label>
            <input
              required
              type="number"
              min="0"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
          </div>

          <div className="space-y-2">
             <label className="text-sm font-medium text-gray-700 flex items-center">
                <Calendar size={16} className="mr-1" />
                დამატების თარიღი
             </label>
             <input
               type="date"
               name="dateAdded"
               value={formData.dateAdded}
               onChange={handleChange}
               className="w-full p-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
             />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:col-span-2">
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">საწყობი</label>
                <div className="relative">
                  <input
                    list="warehouse-options"
                    name="warehouse"
                    value={formData.warehouse}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    placeholder="აირჩიეთ ან ჩაწერეთ..."
                  />
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  <datalist id="warehouse-options">
                    {warehouseOptions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">სტელაჟი</label>
                <div className="relative">
                  <input
                    list="rack-options"
                    name="rack"
                    value={formData.rack}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    placeholder="მაგ: 25 (ავტომატური ძებნა)"
                  />
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  <datalist id="rack-options">
                    {rackOptions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-3">
             <label className="text-sm font-medium text-gray-700">სურათები</label>
             <div className="flex flex-wrap gap-4">
               <div className="relative">
                 <input
                   type="file"
                   multiple
                   accept="image/*"
                   onChange={handleImageUpload}
                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                 />
                 <button type="button" className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition">
                   <ImageIcon size={20} className="mr-2" />
                   გალერეა
                 </button>
               </div>

               <div className="relative">
                 <input
                   type="file"
                   accept="image/*"
                   capture="environment"
                   onChange={handleImageUpload}
                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                 />
                 <button type="button" className="flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100 transition">
                   <Camera size={20} className="mr-2" />
                   კამერა
                 </button>
               </div>
             </div>

             {formData.images.length > 0 && (
               <div className="flex flex-wrap gap-3 mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                 {formData.images.map((img, idx) => (
                   <div key={idx} className="relative group w-24 h-24">
                     <img src={img} alt="Preview" className="w-full h-full object-cover rounded-md shadow-sm" />
                     <button
                       type="button"
                       onClick={() => removeImage(idx)}
                       className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition"
                     >
                       <X size={14} />
                     </button>
                   </div>
                 ))}
               </div>
             )}
          </div>

          <div className="md:col-span-2 bg-orange-50 p-4 rounded-lg border border-orange-100">
             <div className="flex items-center mb-3">
               <input
                 type="checkbox"
                 id="isLowStockTracked"
                 name="isLowStockTracked"
                 checked={formData.isLowStockTracked}
                 onChange={handleChange}
                 className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
               />
               <label htmlFor="isLowStockTracked" className="ml-2 text-sm font-bold text-gray-800 cursor-pointer">
                 ზღვარსქვემოთ აღსარიცხი (კონტროლი მარაგზე)
               </label>
             </div>
             
             {formData.isLowStockTracked && (
               <div className="space-y-2 pl-7 animate-fade-in">
                 <label className="text-sm font-medium text-gray-700">მინიმალური რაოდენობა (ზღვარი)</label>
                 <input
                   type="number"
                   min="0"
                   name="minQuantity"
                   value={formData.minQuantity}
                   onChange={handleChange}
                   className="w-full md:w-1/2 p-2.5 bg-white border border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                 />
                 <p className="text-xs text-gray-500">თუ რაოდენობა ჩამოცდება {formData.minQuantity}-ს, სისტემა გამოიტანს გაფრთხილებას.</p>
               </div>
             )}
          </div>

        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <X size={18} className="mr-2" />
            გაუქმება
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-md transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin mr-2" size={18}/> : <Save size={18} className="mr-2" />}
            შენახვა
          </button>
        </div>
      </form>
    </div>
  );
};