import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { UserRole, RepairOrder, ROStatus, AppConfig, Part, InventoryAlert, LoggedInUser } from './types';
import { TECHNICIANS } from './constants';
import { seedDatabase } from './localDb';
import { roStore, loadFromSupabase } from './data/roStore';
import { inventoryStore } from './data/inventoryStore';
import { repairOrderService } from './services/repairOrderService';
import { inventoryService } from './services/inventoryService';
import { authService } from './services/authService';
import { supabaseAuthService } from './services/supabaseAuthService';
import { appConfigService } from './services/appConfigService';
import { shopContextService } from './services/shopContextService';
import Header from './components/Header';
import ServiceManagerPage from './pages/ServiceManagerPage';
import PartsManagerPage from './pages/PartsManagerPage';
import TechnicianPage from './pages/TechnicianPage';
import AdminPage from './pages/AdminPage';
import DatabasePage from './pages/DatabasePage';
import BillingPage from './pages/BillingPage';
import InventoryPage from './pages/InventoryPage';
import MetricsPage from './pages/MetricsPage';
import LoginScreen from './pages/LoginScreen';
import UpdatePasswordScreen from './pages/UpdatePasswordScreen';
import CommsLink from './components/CommsLink';
import { supabase } from './supabaseClient';

const AccessDenied: React.FC<{ role: UserRole }> = ({ role }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in duration-500">
    <div className="bg-red-500/10 border border-red-500/20 p-12 rounded-[3rem] text-center max-w-md shadow-2xl backdrop-blur-xl">
      <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0-8v4m-8.586 1A15 15 0 0012 21a15 15 0 008.586-5M12 3a15 15 0 00-8.586 5m0 0A15 15 0 0112 21m0-18a15 15 0 018.586 5" />
        </svg>
      </div>
      <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Access Denied</h2>
      <p className="text-slate-400 text-sm mb-8">Your current credentials do not grant authorization for the <span className="text-red-400 font-bold uppercase">{role.replace('_', ' ')}</span> protocol.</p>
      <div className="h-px w-full bg-gradient-to-r from-transparent via-red-500/20 to-transparent mb-8"></div>
      <p className="text-[10px] font-mono text-red-500/50 uppercase tracking-[0.2em]">Security Violation Logged // Terminal 0x4F2</p>
    </div>
  </div>
);

const App: React.FC = () => {
  const [loggedInUser, setLoggedInUser] = useState<LoggedInUser | null>(null);
  const [impersonatedRole, setImpersonatedRole] = useState<UserRole | null>(null);
  const [repairOrders, setRepairOrders] = useState<RepairOrder[]>([]);
  const [masterInventory, setMasterInventory] = useState<Part[]>([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<InventoryAlert[]>([]);
  const [config, setConfig] = useState<AppConfig>(appConfigService.getDefaultConfig());
  const [currentTechnicianId, setCurrentTechnicianId] = useState<string | null>(null);
  const [isCommsLinkOpen, setIsCommsLinkOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);

  const initDb = async (user: LoggedInUser | null) => {
    if (!user) {
      setRepairOrders([]);
      setMasterInventory([]);
      return;
    }
    // await seedDatabase();
    const shopId = shopContextService.getActiveShopId();
    await loadFromSupabase(shopId);
    const [initialROs, initialInventory] = await Promise.all([
      roStore.getAll(shopId),
      inventoryStore.getAll(shopId)
    ]);
    setRepairOrders(initialROs);
    setMasterInventory(initialInventory);
  };

  useEffect(() => {
    const restoreAndInit = async () => {
      setIsLoading(true);
      const { user } = await supabaseAuthService.restoreSession();
      setLoggedInUser(user);
      await initDb(user);
      setIsLoading(false);
    };
    restoreAndInit();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovering(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (user: LoggedInUser) => {
    setLoggedInUser(user);
    await initDb(user);
  };

  const canAccessRole = useCallback(
    (user: LoggedInUser | null, targetRole: UserRole) => {
      return authService.canAccessRole(user, targetRole, impersonatedRole);
    },
    [impersonatedRole]
  );

  const activeRole = useMemo(() => {
    return authService.resolveEffectiveRole(loggedInUser, impersonatedRole);
  }, [loggedInUser, impersonatedRole]);

  const isImpersonating = useMemo(() => {
    return authService.isImpersonating(loggedInUser, impersonatedRole);
  }, [loggedInUser, impersonatedRole]);

  useEffect(() => {
    if (loggedInUser && loggedInUser.role === UserRole.TECHNICIAN) {
      setCurrentTechnicianId(loggedInUser.techId || null);
    } else if (loggedInUser && loggedInUser.role !== UserRole.TECHNICIAN) {
      setCurrentTechnicianId(null);
    }
  }, [loggedInUser]);

  useEffect(() => {
    if (activeRole !== UserRole.TECHNICIAN && loggedInUser?.role !== UserRole.TECHNICIAN) {
      setCurrentTechnicianId(null);
    }
  }, [activeRole, loggedInUser]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', config.themeColors.primary);
    root.style.setProperty('--color-secondary', config.themeColors.secondary);
    root.style.setProperty('--color-accent', config.themeColors.accent);
  }, [config.themeColors]);

  const updateRO = async (updatedRO: RepairOrder) => {
    const shopId = shopContextService.getActiveShopId();
    const roWithShop = { ...updatedRO, shopId: updatedRO.shopId || shopId };
    await roStore.put(roWithShop);
    setRepairOrders(prev => prev.map(ro => ro.id === roWithShop.id ? roWithShop : ro));
  };

  const addInventoryAlert = (alert: Omit<InventoryAlert, 'id' | 'timestamp'>) => {
    const newAlert = inventoryService.createAlert(alert);
    setInventoryAlerts(prev => [newAlert, ...prev]);
  };

  const addRO = async (newRO: RepairOrder) => {
    const shopId = shopContextService.getActiveShopId();
    const roWithShop = { ...newRO, shopId };
    await roStore.add(roWithShop);
    setRepairOrders(prev => [...prev, roWithShop]);
  };

  const deleteRO = async (roId: string) => {
    await roStore.delete(roId);
    setRepairOrders(prev => prev.filter(ro => ro.id !== roId));
  };

  const handleExportData = () => {
    const data = { repairOrders, masterInventory, config, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SCC-DATA-EXPORT-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const activeROForTech = repairOrders.find(ro =>
    (ro.status === ROStatus.ACTIVE || ro.status === ROStatus.READY_FOR_TECH) &&
    ro.technicianId === currentTechnicianId
  );

  const haltedROsForTech = repairOrders.filter(ro =>
    ro.status === ROStatus.HOLD &&
    ro.technicianId === currentTechnicianId
  );

  const currentTechnician = useMemo(() =>
    TECHNICIANS.find(t => t.id === currentTechnicianId),
    [currentTechnicianId]
  );

  const renderTechnicianView = () => {
    if (loggedInUser?.role !== UserRole.TECHNICIAN && !currentTechnicianId) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in zoom-in duration-500">
          <div className="bg-slate-900/50 p-10 rounded-3xl border border-white/5 text-center shadow-2xl">
            <h2 className="text-xl font-black text-white uppercase tracking-widest mb-8">Select Technician Bay</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl">
              {TECHNICIANS.map(tech => (
                <button
                  key={tech.id}
                  onClick={() => setCurrentTechnicianId(tech.id)}
                  className="p-6 bg-slate-800/50 border border-white/10 rounded-2xl hover:border-neon-seafoam transition-all text-lg font-bold hover:scale-105 active:scale-95 group"
                >
                  <span className="block group-hover:neon-seafoam transition-all">{tech.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }
    return <TechnicianPage repairOrder={activeROForTech} haltedROs={haltedROsForTech} updateRO={updateRO} masterInventory={masterInventory} />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-neon-seafoam/20 border-t-neon-seafoam rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 bg-neon-seafoam/10 rounded-full animate-pulse"></div>
          </div>
        </div>
        <div className="mt-8 text-neon-seafoam font-mono text-sm tracking-[0.5em] uppercase animate-pulse">Initializing System...</div>
      </div>
    );
  }

  if (isRecovering) {
    return <UpdatePasswordScreen onComplete={() => setIsRecovering(false)} />;
  }

  if (!loggedInUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const roleIcons = {
    [UserRole.SERVICE_MANAGER]: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h4a1 1 0 100-2H7zm0 4a1 1 0 100 2h4a1 1 0 100-2H7z" clipRule="evenodd" /></svg>,
    [UserRole.PARTS_MANAGER]: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
    [UserRole.INVENTORY_MANAGER]: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" /></svg>,
    [UserRole.TECHNICIAN]: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734-2.106-2.106a1.532 1.532 0 01-.947-2.287c1.561-.379-1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>,
    [UserRole.BILLING]: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-5a1 1 0 10-2 0v1h2v-1zM11 9a1 1 0 00-1-1H9a1 1 0 000 2h1a1 1 0 010 2H9a1 1 0 000 2h2a1 1 0 001-1v-1a1 1 0 01-1-1 1 1 0 100-2v-1a1 1 0 00-1-1z" clipRule="evenodd" /></svg>,
    [UserRole.DATABASE]: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" /><path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" /><path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" /></svg>,
    [UserRole.METRICS]: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>,
    [UserRole.ADMIN]: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>,
  };

  const mainContent = () => {
    if (!loggedInUser) return null;
    if (!canAccessRole(loggedInUser, activeRole)) {
      return <AccessDenied role={activeRole} />;
    }
    switch (activeRole) {
      case UserRole.SERVICE_MANAGER: return <ServiceManagerPage addRO={addRO} repairOrders={repairOrders} updateRO={updateRO} deleteRO={deleteRO} hourlyRate={config.hourlyRate} masterInventory={masterInventory} />;
      case UserRole.PARTS_MANAGER: return <PartsManagerPage repairOrders={repairOrders.filter(ro => ro.status !== ROStatus.COMPLETED)} updateRO={updateRO} masterInventory={masterInventory} addInventoryAlert={addInventoryAlert} setMasterInventory={setMasterInventory} setInventoryAlerts={setInventoryAlerts} shopId={shopContextService.getActiveShopId()} />;
      case UserRole.INVENTORY_MANAGER: return <InventoryPage inventory={masterInventory} setInventory={setMasterInventory} alerts={inventoryAlerts} />;
      case UserRole.TECHNICIAN: return renderTechnicianView();
      case UserRole.BILLING: return <BillingPage repairOrders={repairOrders.filter(ro => ro.status === ROStatus.COMPLETED || ro.status === ROStatus.PENDING_INVOICE)} updateRO={updateRO} />;
      case UserRole.DATABASE: return <DatabasePage allROs={repairOrders} />;
      case UserRole.METRICS: return <MetricsPage repairOrders={repairOrders} inventory={masterInventory} config={config} />;
      case UserRole.ADMIN: return <AdminPage config={config} setConfig={setConfig} onExport={handleExportData} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {authService.isDev(loggedInUser) && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 glass px-3 py-2 rounded-full flex gap-1 z-50 border border-white/10 shadow-lg animate-in slide-in-from-bottom-8 duration-700">
          {Object.values(UserRole).map(roleKey => (
            <button key={roleKey} onClick={() => {
              setImpersonatedRole(roleKey);
              authService.startImpersonation(roleKey);
            }} title={roleKey.replace('_', ' ')} className={`h-11 w-11 flex items-center justify-center rounded-full transition-all ${activeRole === roleKey ? 'bg-neon-seafoam text-slate-900 shadow-[0_0_15px_rgba(45,212,191,0.5)]' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>
              {roleIcons[roleKey]}
            </button>
          ))}
        </div>
      )}

      <Header
        activeRO={activeROForTech}
        config={config}
        currentTechnician={currentTechnician}
        onTechViewExit={() => setCurrentTechnicianId(null)}
        currentRole={activeRole}
        onCommsLinkToggle={() => setIsCommsLinkOpen(prev => !prev)}
        loggedInUser={loggedInUser}
        onAppLogout={async () => {
          await supabaseAuthService.signOut();
          authService.stopImpersonation();
          setLoggedInUser(null);
          setImpersonatedRole(null);
          await initDb(null);
        }}
        isImpersonating={isImpersonating}
        onExitImpersonation={() => {
          setImpersonatedRole(null);
          authService.stopImpersonation();
        }}
      />

      <CommsLink isOpen={isCommsLinkOpen} onClose={() => setIsCommsLinkOpen(false)} />

      <main className="container mx-auto p-4 md:p-8">
        {mainContent()}
      </main>
    </div>
  );
};

export default App;