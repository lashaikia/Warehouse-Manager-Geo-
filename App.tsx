import React, { useState, useEffect } from 'react';
import { Product, ViewState, Transaction, User } from './types';
import { getProducts, saveProduct, updateProduct, deleteProduct, logTransaction, getCurrentUser, logout } from './services/storage';
import { Dashboard } from './components/Dashboard';
import { ProductList } from './components/ProductList';
import { ProductForm } from './components/ProductForm';
import { StockMovementForm } from './components/StockMovementForm';
import { Reports } from './components/Reports';
import { LoginForm } from './components/LoginForm';
import { UserManagement } from './components/UserManagement';
import { SettingsManagement } from './components/SettingsManagement';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { LayoutDashboard, Package, PlusCircle, Menu, X, Box, FileText, ArrowDownCircle, ArrowUpCircle, LogOut, UserCircle, Users, Key, Settings, Loader2 } from 'lucide-react';

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
        const data = await getProducts();
        setProducts(data);
    } catch (e) {
        console.error("Failed to load products", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      loadData();
    }
  }, []);

  const handleLogin = async (loggedInUser: User) => {
    setUser(loggedInUser);
    await loadData();
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setCurrentView('dashboard');
    setProducts([]);
  };

  const handleAddProduct = async (data: Omit<Product, 'id' | 'lastUpdated'>) => {
    setLoading(true);
    await saveProduct(data);
    await loadData();
    setLoading(false);
    setCurrentView('inventory');
  };

  const handleUpdateProduct = async (data: Omit<Product, 'id' | 'lastUpdated'>) => {
    if (editingProduct) {
      setLoading(true);
      await updateProduct(editingProduct.id, data);
      await loadData();
      setLoading(false);
      setEditingProduct(undefined);
      setCurrentView('inventory');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    setLoading(true);
    await deleteProduct(id);
    await loadData();
    setLoading(false);
  };

  const handleStockMovement = async (data: any, type: 'inbound' | 'outbound') => {
     const { productId, quantity, date, receiver, notes, images } = data;
     const product = products.find(p => p.id === productId);
     
     if(product) {
        setLoading(true);
        const newQuantity = type === 'inbound' 
           ? product.quantity + quantity 
           : product.quantity - quantity;
        
        await updateProduct(productId, { quantity: newQuantity });

        const transaction: Omit<Transaction, 'id'> = {
           productId,
           productName: product.name,
           productNomenclature: product.nomenclature,
           type,
           quantity,
           unit: product.unit || 'pcs',
           date,
           receiver,
           notes,
           images
        };
        await logTransaction(transaction);
        
        await loadData();
        setLoading(false);
        setCurrentView('inventory');
     }
  };

  const startEdit = (product: Product) => {
    setEditingProduct(product);
    setCurrentView('edit');
  };

  const NavItem = ({ view, icon: Icon, label, colorClass }: { view: ViewState, icon: any, label: string, colorClass?: string }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setEditingProduct(undefined);
        setIsMobileMenuOpen(false);
      }}
      className={`flex items-center w-full space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
        currentView === view 
          ? 'bg-blue-600 text-white shadow-md' 
          : 'text-gray-600 hover:bg-gray-100'
      } ${colorClass ? colorClass : ''}`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const canEdit = user.role === 'admin' || user.role === 'editor';
  const isAdmin = user.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
        <div className="p-6 flex items-center space-x-3 border-b border-gray-100">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Box size={24} />
          </div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">საწყობი</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem view="dashboard" icon={LayoutDashboard} label="მთავარი" />
          <NavItem view="inventory" icon={Package} label="მარაგები" />
          
          {canEdit && (
            <>
              <div className="pt-4 pb-2">
                <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">ოპერაციები</p>
              </div>
              <NavItem view="inbound" icon={ArrowDownCircle} label="მიღება" />
              <NavItem view="outbound" icon={ArrowUpCircle} label="გატანა" />
              <NavItem view="add" icon={PlusCircle} label="ახლის დამატება" />
            </>
          )}
          
          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">ანალიტიკა</p>
          </div>
          <NavItem view="reports" icon={FileText} label="ანგარიშები" />

          {isAdmin && (
            <>
               <div className="pt-4 pb-2">
                <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">ადმინისტრირება</p>
              </div>
              <NavItem view="users" icon={Users} label="მომხმარებლები" />
              <NavItem view="settings" icon={Settings} label="პარამეტრები" />
            </>
          )}
        </nav>
        
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between mb-3 px-2">
             <div className="flex items-center space-x-3">
                 <UserCircle className="text-gray-400" size={32} />
                 <div className="overflow-hidden">
                    <p className="text-sm font-bold text-gray-800 truncate max-w-[100px]">{user.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                 </div>
             </div>
             <button 
                onClick={() => setIsChangePasswordOpen(true)}
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                title="პაროლის შეცვლა"
             >
                <Key size={18} />
             </button>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center w-full space-x-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition text-sm font-medium"
          >
            <LogOut size={16} />
            <span>გასვლა</span>
          </button>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 w-full bg-white border-b border-gray-200 z-50 px-4 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-2">
           <div className="bg-blue-600 p-1.5 rounded text-white">
            <Box size={20} />
          </div>
          <h1 className="text-lg font-bold text-gray-800">საწყობი</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-gray-800 bg-opacity-50 z-40 mt-14" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="bg-white w-64 h-full p-4 flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex-1 space-y-2 overflow-y-auto">
                <NavItem view="dashboard" icon={LayoutDashboard} label="მთავარი" />
                <NavItem view="inventory" icon={Package} label="მარაგები" />
                
                {canEdit && (
                  <>
                    <div className="border-t border-gray-100 my-2 pt-2"></div>
                    <NavItem view="inbound" icon={ArrowDownCircle} label="მიღება" />
                    <NavItem view="outbound" icon={ArrowUpCircle} label="გატანა" />
                    <NavItem view="add" icon={PlusCircle} label="ახლის დამატება" />
                  </>
                )}
                
                <div className="border-t border-gray-100 my-2 pt-2"></div>
                <NavItem view="reports" icon={FileText} label="ანგარიშები" />

                {isAdmin && (
                  <>
                    <div className="border-t border-gray-100 my-2 pt-2"></div>
                    <NavItem view="users" icon={Users} label="მომხმარებლები" />
                    <NavItem view="settings" icon={Settings} label="პარამეტრები" />
                  </>
                )}
            </div>
            
            <div className="pt-4 border-t border-gray-100">
               <div className="flex items-center justify-between mb-3">
                   <p className="text-sm font-bold text-gray-800">{user.name}</p>
                   <button 
                      onClick={() => { setIsChangePasswordOpen(true); setIsMobileMenuOpen(false); }}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 bg-gray-50 rounded-lg transition"
                   >
                      <Key size={16} />
                   </button>
               </div>
               <button 
                  onClick={handleLogout}
                  className="flex items-center text-red-600 text-sm font-medium"
                >
                  <LogOut size={16} className="mr-2" />
                  გასვლა
                </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 p-4 md:p-8 mt-14 md:mt-0 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {loading && (
             <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center animate-fade-in">
                <Loader2 size={18} className="animate-spin mr-2" />
                მუშავდება...
             </div>
          )}

          {currentView === 'dashboard' && <Dashboard products={products} />}
          
          {currentView === 'inventory' && (
            <ProductList 
              products={products} 
              userRole={user.role}
              onEdit={startEdit} 
              onDelete={handleDeleteProduct} 
            />
          )}
          
          {(currentView === 'add' || currentView === 'edit') && (
            <ProductForm 
              initialData={editingProduct} 
              onSubmit={currentView === 'add' ? handleAddProduct : handleUpdateProduct}
              onCancel={() => {
                setEditingProduct(undefined);
                setCurrentView('inventory');
              }}
            />
          )}

          {currentView === 'inbound' && (
             <StockMovementForm 
                products={products} 
                type="inbound" 
                onSubmit={(data) => handleStockMovement(data, 'inbound')}
                onCancel={() => setCurrentView('inventory')}
             />
          )}

          {currentView === 'outbound' && (
             <StockMovementForm 
                products={products} 
                type="outbound" 
                onSubmit={(data) => handleStockMovement(data, 'outbound')}
                onCancel={() => setCurrentView('inventory')}
             />
          )}

          {currentView === 'reports' && (
            <Reports products={products} />
          )}

          {currentView === 'users' && isAdmin && (
            <UserManagement />
          )}

          {currentView === 'settings' && isAdmin && (
            <SettingsManagement />
          )}
        </div>
      </main>

      {isChangePasswordOpen && user && (
        <ChangePasswordModal user={user} onClose={() => setIsChangePasswordOpen(false)} />
      )}
    </div>
  );
};

export default App;