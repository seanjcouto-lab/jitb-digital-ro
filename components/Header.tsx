
import React, { useState, useEffect } from 'react';
import { RepairOrder, AppConfig, Technician, UserRole, LoggedInUser } from '../types';

interface HeaderProps {
  activeRO?: RepairOrder;
  config: AppConfig;
  currentTechnician?: Technician | null;
  onTechViewExit: () => void;
  currentRole: UserRole;
  onCommsLinkToggle: () => void;
  loggedInUser: LoggedInUser;
  onAppLogout: () => void;
  isImpersonating?: boolean;
  onExitImpersonation?: () => void;
  onHomeClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
    activeRO, config, currentTechnician, onTechViewExit, 
    currentRole, onCommsLinkToggle, loggedInUser, onAppLogout,
    isImpersonating, onExitImpersonation, onHomeClick
}) => {
  const roleText = currentRole === 'DATABASE' ? 'Vessel DNA' : currentRole.replace('_', ' ');

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };
  
  const renderCenterContent = () => {
    if (activeRO) {
      return (
        <div className="flex flex-wrap justify-center gap-6 text-[10px] uppercase tracking-widest font-semibold text-slate-300">
          <div><span className="text-slate-500 text-[8px] block">Customer</span><span className="text-white">{activeRO.customerName}</span></div>
          <div className="border-l border-white/10 pl-6"><span className="text-slate-500 text-[8px] block">Vessel</span><span className="text-white">{activeRO.vesselName}</span></div>
          <div className="border-l border-white/10 pl-6"><span className="text-slate-500 text-[8px] block">Engine S/N</span><span className="text-white neon-steel">{activeRO.engineSerial}</span></div>
        </div>
      );
    }
    
    if (loggedInUser.role !== UserRole.TECHNICIAN && currentRole === UserRole.TECHNICIAN && currentTechnician) {
         return <div className="text-sm font-bold text-slate-300">Viewing Bay: {currentTechnician.name}</div>;
    }

    return (
        <div className="flex items-center gap-3 text-slate-500 text-xs font-mono">
            <div className={`w-2 h-2 rounded-full ${isImpersonating ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-slate-600 animate-pulse'}`}></div>
            <div className="flex items-center gap-2">
              {isImpersonating ? (
                <>
                  <span className="text-amber-500 font-black">DEV VIEW: {roleText}</span>
                  <button 
                    onClick={onExitImpersonation}
                    className="ml-2 px-2 py-0.5 bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded text-[9px] font-black uppercase hover:bg-amber-500 hover:text-slate-900 transition-all"
                  >
                    Exit Dev View
                  </button>
                </>
              ) : (
                <span>SYSTEM IDLE // {loggedInUser.role !== UserRole.TECHNICIAN ? roleText : 'TECHNICIAN MODE'}</span>
              )}
            </div>
        </div>
    );
  };
  
  const renderRightContent = () => {
      return (
        <div className="flex items-center gap-4">
            <div className="text-right">
                <span className="text-sm font-bold text-slate-200">{loggedInUser.name}</span>
                <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">{loggedInUser.title || 'Technician'}</span>
            </div>
            {loggedInUser.role !== UserRole.TECHNICIAN && currentTechnician && <button onClick={onTechViewExit} className="text-[10px] bg-slate-700/50 text-slate-300 px-3 py-1 rounded-lg font-bold uppercase hover:bg-slate-600/50">Change Tech</button>}
            <button onClick={onAppLogout} className="p-3 rounded-full bg-red-500/20 hover:bg-red-500/40 transition-colors" title="Logout">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
            </button>
            <button onClick={toggleFullscreen} className="p-3 rounded-full bg-slate-800/50 hover:bg-slate-700/50 transition-colors" title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}>
              {isFullscreen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 4a1 1 0 00-1 1v3a1 1 0 01-2 0V5a3 3 0 013-3h3a1 1 0 010 2H5zm10 0h-3a1 1 0 010-2h3a3 3 0 013 3v3a1 1 0 01-2 0V5zM4 15v-3a1 1 0 00-2 0v3a3 3 0 003 3h3a1 1 0 000-2H5a1 1 0 01-1-1zm12 0a1 1 0 01-1 1h-3a1 1 0 000 2h3a3 3 0 003-3v-3a1 1 0 00-2 0v3z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H5.414l2.293 2.293a1 1 0 11-1.414 1.414L4 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V5.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 4H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <button onClick={onCommsLinkToggle} className="p-3 rounded-full bg-slate-800/50 hover:bg-slate-700/50 transition-colors" title="Comms Link">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            </button>
        </div>
      );
  }

  return (
    <header className="sticky top-0 z-40 glass border-b border-white/5 px-6 py-4 flex flex-col md:flex-row justify-between items-center">
      <div
        className={`flex items-center gap-4 mb-4 md:mb-0 ${onHomeClick ? 'cursor-pointer' : ''}`}
        onClick={onHomeClick}
        title={onHomeClick ? 'Go to home' : undefined}
      >
        {config.logoUrl
          ? <img src={config.logoUrl} alt="Logo" className="h-20 object-contain" />
          : <h1 className="text-xl font-bold tracking-tighter neon-seafoam">{config.companyName}</h1>
        }
      </div>

      <div className="flex-1 flex justify-center items-center">
        {renderCenterContent()}
      </div>

      <div>
        {renderRightContent()}
      </div>
    </header>
  );
};

export default Header;
