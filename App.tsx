import React, { useState, useEffect } from 'react';
import { Product, ViewState, Transaction, User, Theme } from './types';
import { getProducts, saveProduct, updateProduct, deleteProduct, logTransaction, getCurrentUser, logout } from './services/storage';
import { Dashboard } from './components/Dashboard';
import { ProductList } from './components/ProductList';
import { ProductForm } from './components/ProductForm';
import { StockMovementForm } from './components/StockMovementForm';
import { Reports } from './components/Reports';
import { CustomReport } from './components/CustomReport';
import { LoginForm } from './components/LoginForm';
import { UserManagement } from './components/UserManagement';
import { SettingsManagement } from './components/SettingsManagement';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { LayoutDashboard, Package, PlusCircle, Menu, X, FileText, ArrowDownCircle, ArrowUpCircle, LogOut, UserCircle, Users, Key, Settings, Loader2, ClipboardList } from 'lucide-react';

const Logo = ({ idPrefix = 'main' }: { idPrefix?: string }) => (
  <svg viewBox="0 0 100 100" className="w-full h-full filter drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id={`${idPrefix}_blueBall`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(35 35) rotate(90) scale(40)">
        <stop stopColor="#60A5FA" />
        <stop offset="1" stopColor="#1E40AF" />
      </radialGradient>
      <radialGradient id={`${idPrefix}_greenBall`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(35 35) rotate(90) scale(40)">
        <stop stopColor="#4ADE80" />
        <stop offset="1" stopColor="#15803D" />
      </radialGradient>
    </defs>
    {/* Top Row (1) */}
    <circle cx="50" cy="25" r="15" fill={`url(#${idPrefix}_blueBall)`} />
    
    {/* Middle Row (2) */}
    <circle cx="34" cy="52" r="15" fill={`url(#${idPrefix}_blueBall)`} />
    <circle cx="66" cy="52" r="15" fill={`url(#${idPrefix}_greenBall)`} />
    
    {/* Bottom Row (3) */}
    <circle cx="18" cy="79" r="15" fill={`url(#${idPrefix}_blueBall)`} />
    <circle cx="50" cy="79" r="15" fill={`url(#${idPrefix}_greenBall)`} />
    <circle cx="82" cy="79" r="15" fill={`url(#${idPrefix}_greenBall)`} />
  </svg>
);

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Theme State
  const [theme, setTheme] = useState<Theme>(() => {
      return (localStorage.getItem('wm_theme') as Theme) || 'classic';
  });

  // Save theme when changed
  useEffect(() => {
    localStorage.setItem('wm_theme', theme);
  }, [theme]);

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
     const { productId, quantity, date, receiver, notes, images, isDebt } = data;
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
           images,
           isDebt: !!isDebt
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

  // --- Dynamic Styles based on Theme ---
  const getSidebarStyles = () => {
    switch (theme) {
      case 'executive':
        return 'bg-slate-900 border-r border-slate-800 text-slate-300';
      case 'glass':
        return 'bg-white/70 backdrop-blur-xl border-r border-white/50 text-gray-700 shadow-[4px_0_24px_rgba(0,0,0,0.02)]';
      case 'midnight':
        return 'bg-slate-950 border-r border-slate-900 text-blue-100/70';
      case 'nature':
        return 'bg-emerald-900 border-r border-emerald-800 text-emerald-100';
      case 'sunset':
        return 'bg-gradient-to-b from-orange-900 to-rose-900 border-r border-orange-800 text-orange-100';
      default: // classic
        return 'bg-white border-r border-gray-200 text-gray-600';
    }
  };

  const getMainBgStyles = () => {
    switch (theme) {
      case 'executive':
        return 'bg-slate-50';
      case 'glass':
        return 'bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50';
      case 'midnight':
        return 'bg-slate-900';
      case 'nature':
        return 'bg-stone-50';
      case 'sunset':
        return 'bg-orange-50';
      default: // classic
        return 'bg-gray-50';
    }
  };

  const getNavItemStyles = (isActive: boolean) => {
    if (theme === 'executive') {
       if (isActive) return 'bg-blue-600 text-white shadow-md shadow-blue-900/20';
       return 'text-slate-400 hover:bg-slate-800 hover:text-white';
    }
    if (theme === 'glass') {
       if (isActive) return 'bg-white/80 text-indigo-600 shadow-sm ring-1 ring-black/5 backdrop-blur-sm';
       return 'text-gray-600 hover:bg-white/50 hover:text-indigo-600';
    }
    if (theme === 'midnight') {
       if (isActive) return 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]';
       return 'hover:text-blue-300 hover:bg-white/5';
    }
    if (theme === 'nature') {
       if (isActive) return 'bg-emerald-800 text-white shadow-md shadow-emerald-900/50';
       return 'hover:bg-emerald-800/50 hover:text-white';
    }
    if (theme === 'sunset') {
       if (isActive) return 'bg-white/20 text-white shadow-md border border-white/10';
       return 'hover:bg-white/10 hover:text-white';
    }
    // Classic
    if (isActive) return 'bg-blue-600 text-white shadow-md';
    return 'text-gray-600 hover:bg-gray-100';
  };

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setEditingProduct(undefined);
        setIsMobileMenuOpen(false);
      }}
      className={`flex items-center w-full space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${getNavItemStyles(currentView === view)}`}
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
    <div className={`min-h-screen flex font-sans transition-colors duration-500 ${getMainBgStyles()}`}>
      <aside className={`hidden md:flex flex-col w-64 h-screen sticky top-0 transition-colors duration-300 ${getSidebarStyles()}`}>
        <div className={`p-6 flex items-center space-x-3 border-b border-opacity-10 ${theme === 'classic' ? 'border-gray-200' : 'border-white'}`}>
          <div className="w-10 h-10 flex-shrink-0">
             <Logo idPrefix="desktop" />
          </div>
          <h1 className={`text-lg font-black tracking-tight uppercase leading-tight ${theme === 'classic' ? 'text-gray-800' : 'text-white'}`}>
             ცენტრალური<br/>საწყობი
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem view="dashboard" icon={LayoutDashboard} label="მთავარი" />
          <NavItem view="inventory" icon={Package} label="მარაგები" />
          
          {canEdit && (
            <>
              <div className="pt-4 pb-2">
                <p className={`px-4 text-xs font-semibold uppercase tracking-wider opacity-60`}>ოპერაციები</p>
              </div>
              <NavItem view="inbound" icon={ArrowDownCircle} label="მიღება" />
              <NavItem view="outbound" icon={ArrowUpCircle} label="გატანა" />
              <NavItem view="add" icon={PlusCircle} label="ახლის დამატება" />
            </>
          )}
          
          <div className="pt-4 pb-2">
            <p className={`px-4 text-xs font-semibold uppercase tracking-wider opacity-60`}>ანალიტიკა</p>
          </div>
          <NavItem view="reports" icon={FileText} label="ანგარიშები" />
          <NavItem view="custom_report" icon={ClipboardList} label="რეპორტი" />

          {isAdmin && (
            <>
               <div className="pt-4 pb-2">
                <p className={`px-4 text-xs font-semibold uppercase tracking-wider opacity-60`}>ადმინისტრირება</p>
              </div>
              <NavItem view="users" icon={Users} label="მომხმარებლები" />
              <NavItem view="settings" icon={Settings} label="პარამეტრები" />
            </>
          )}
        </nav>
        
        <div className={`p-4 border-t border-opacity-10 ${theme === 'classic' ? 'bg-gray-50 border-gray-200' : 'bg-black/10 border-white'}`}>
          <div className="flex items-center justify-between mb-3 px-2">
             <div className="flex items-center space-x-3">
                 <UserCircle className={`opacity-80`} size={32} />
                 <div className="overflow-hidden">
                    <p className={`text-sm font-bold truncate max-w-[100px] ${theme === 'classic' ? 'text-gray-800' : 'text-white'}`}>{user.name}</p>
                    <p className={`text-xs capitalize opacity-60`}>{user.role}</p>
                 </div>
             </div>
             <button 
                onClick={() => setIsChangePasswordOpen(true)}
                className={`p-1.5 rounded-lg transition opacity-70 hover:opacity-100 hover:bg-white/10`}
                title="პაროლის შეცვლა"
             >
                <Key size={18} />
             </button>
          </div>
          <button 
            onClick={handleLogout}
            className={`flex items-center justify-center w-full space-x-2 px-4 py-2 rounded-lg transition text-sm font-medium ${theme === 'classic' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-red-500/20 text-red-200 hover:bg-red-500/40'}`}
          >
            <LogOut size={16} />
            <span>გასვლა</span>
          </button>
        </div>
      </aside>

      <div className={`md:hidden fixed top-0 w-full z-50 px-4 py-3 flex justify-between items-center shadow-sm ${theme === 'glass' ? 'bg-white/80 backdrop-blur border-b border-gray-200' : 'bg-white border-b border-gray-200'}`}>
        <div className="flex items-center space-x-3">
           <div className="w-8 h-8 flex-shrink-0">
             <Logo idPrefix="mobile" />
           </div>
           <h1 className="text-sm font-black text-gray-800 uppercase leading-none">ცენტრალური<br/>საწყობი</h1>
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
                <NavItem view="custom_report" icon={ClipboardList} label="რეპორტი" />

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

          {currentView === 'dashboard' && <Dashboard products={products} theme={theme} user={user} />}
          
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

          {currentView === 'custom_report' && (
            <CustomReport products={products} />
          )}

          {currentView === 'users' && isAdmin && (
            <UserManagement />
          )}

          {currentView === 'settings' && isAdmin && (
            <SettingsManagement currentTheme={theme} onThemeChange={setTheme} />
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