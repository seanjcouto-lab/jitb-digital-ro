
import React, { useState } from 'react';
import SectionHeader from './SectionHeader';

const initialProfileState = {
  customerName: '',
  customerPhones: [''],
  customerEmails: [''],
  customerAddress: { street: '', city: '', state: '', zip: '' },
  customerNotes: '',
  vesselName: '',
  vesselHIN: '',
  boatMake: '',
  boatModel: '',
  boatYear: '',
  boatLength: '',
  engineMake: '',
  engineModel: '',
  engineYear: '',
  engineHorsepower: '',
  engineSerial: '',
};

interface ProfileOnboardingFormProps {
    initialData?: typeof initialProfileState;
    onProfileComplete: (profileData: typeof initialProfileState) => void;
}

const ProfileOnboardingForm: React.FC<ProfileOnboardingFormProps> = ({ initialData, onProfileComplete }) => {
    const [profileData, setProfileData] = useState(initialData || initialProfileState);

    const handleInputFocus = (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setTimeout(() => {
            event.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    };

    const handleArrayChange = (field: 'customerPhones' | 'customerEmails', index: number, value: string) => {
        const newArr = [...profileData[field]];
        newArr[index] = value;
        setProfileData(prev => ({ ...prev, [field]: newArr }));
    };

    const addArrayField = (field: 'customerPhones' | 'customerEmails') => {
        setProfileData(prev => ({ ...prev, [field]: [...prev[field], ''] }));
    };

    const removeArrayField = (field: 'customerPhones' | 'customerEmails', index: number) => {
        setProfileData(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
    };
    
    const handleSubmit = () => {
        if (!profileData.customerName) {
          alert("Required: Customer Name");
          return;
        }
        onProfileComplete(profileData);
    };

    return (
        <div className="glass rounded-2xl p-8 border-white/5 animate-in slide-in-from-right-4 duration-500">
            <div className="border-b border-white/5 pb-6 mb-8">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter">New Service Profile Onboarding</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Customer & Asset Registration Matrix</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
                <div className="space-y-6">
                  <SectionHeader title="Owner Data" />
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="customerName" className="block text-xs text-slate-400 uppercase font-bold mb-2">Full Legal Name</label>
                      <input id="customerName" value={profileData.customerName} onFocus={handleInputFocus} onChange={e => setProfileData({...profileData, customerName: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white text-base focus:border-neon-seafoam outline-none" placeholder="e.g. Robert Smith" />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-slate-400 uppercase font-bold mb-2">Phone Numbers</label>
                      {profileData.customerPhones.map((phone, index) => (
                        <div key={index} className="flex items-center gap-2 mb-2">
                          <input value={phone} onFocus={handleInputFocus} onChange={e => handleArrayChange('customerPhones', index, e.target.value)} type="tel" className="flex-grow bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white text-base" placeholder="e.g. 555-123-4567" />
                          {profileData.customerPhones.length > 1 && <button onClick={() => removeArrayField('customerPhones', index)} className="p-2 bg-slate-800/50 rounded-lg text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>}
                        </div>
                      ))}
                      {profileData.customerPhones.length < 3 && <button onClick={() => addArrayField('customerPhones')} className="text-xs text-neon-seafoam font-bold hover:text-white transition-colors">+ Add Phone</button>}
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 uppercase font-bold mb-2">Email Addresses</label>
                      {profileData.customerEmails.map((email, index) => (
                        <div key={index} className="flex items-center gap-2 mb-2">
                          <input value={email} onFocus={handleInputFocus} onChange={e => handleArrayChange('customerEmails', index, e.target.value)} type="email" className="flex-grow bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white text-base" placeholder="e.g. user@example.com" />
                          {profileData.customerEmails.length > 1 && <button onClick={() => removeArrayField('customerEmails', index)} className="p-2 bg-slate-800/50 rounded-lg text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>}
                        </div>
                      ))}
                      {profileData.customerEmails.length < 3 && <button onClick={() => addArrayField('customerEmails')} className="text-xs text-neon-seafoam font-bold hover:text-white transition-colors">+ Add Email</button>}
                    </div>
                    
                    <div>
                       <label htmlFor="street" className="block text-xs text-slate-400 uppercase font-bold mb-2">Mailing Address</label>
                       <input id="street" value={profileData.customerAddress.street} onFocus={handleInputFocus} onChange={e => setProfileData(p => ({...p, customerAddress: {...p.customerAddress, street: e.target.value}}))} placeholder="Street" className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white text-base mb-2" />
                       <div className="grid grid-cols-6 gap-2">
                         <input aria-label="City" value={profileData.customerAddress.city} onFocus={handleInputFocus} onChange={e => setProfileData(p => ({...p, customerAddress: {...p.customerAddress, city: e.target.value}}))} placeholder="City" className="col-span-3 w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white text-base" />
                         <input aria-label="State" value={profileData.customerAddress.state} onFocus={handleInputFocus} onChange={e => setProfileData(p => ({...p, customerAddress: {...p.customerAddress, state: e.target.value}}))} placeholder="State" className="col-span-1 w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white text-base" />
                         <input aria-label="ZIP Code" value={profileData.customerAddress.zip} onFocus={handleInputFocus} onChange={e => setProfileData(p => ({...p, customerAddress: {...p.customerAddress, zip: e.target.value}}))} placeholder="ZIP" className="col-span-2 w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white text-base" />
                       </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                   <div className="space-y-4">
                    <SectionHeader title="Propulsion DNA" />
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div><label htmlFor="engineMake" className="block text-xs text-slate-400 uppercase font-bold mb-2">Engine Make</label><input id="engineMake" value={profileData.engineMake} onFocus={handleInputFocus} onChange={e => setProfileData({...profileData, engineMake: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white text-base" /></div>
                        <div><label htmlFor="engineModel" className="block text-xs text-slate-400 uppercase font-bold mb-2">Engine Model</label><input id="engineModel" value={profileData.engineModel} onFocus={handleInputFocus} onChange={e => setProfileData({...profileData, engineModel: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white text-base" /></div>
                        <div><label htmlFor="engineYear" className="block text-xs text-slate-400 uppercase font-bold mb-2">Engine Year</label><input id="engineYear" type="number" value={profileData.engineYear} onFocus={handleInputFocus} onChange={e => setProfileData({...profileData, engineYear: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white text-base" /></div>
                     </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label htmlFor="engineHp" className="block text-xs text-slate-400 uppercase font-bold mb-2">Horsepower</label><input id="engineHp" type="number" value={profileData.engineHorsepower} onFocus={handleInputFocus} onChange={e => setProfileData({...profileData, engineHorsepower: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white text-base" /></div>
                        <div>
                          <label htmlFor="engineSerial" className="block text-xs text-slate-400 uppercase font-bold mb-2">Engine S/N</label>
                          <input id="engineSerial" value={profileData.engineSerial} onFocus={handleInputFocus} onChange={e => setProfileData({...profileData, engineSerial: e.target.value})} className={`w-full bg-slate-900 rounded-lg px-4 py-3 text-white text-base font-mono uppercase outline-none shadow-[0_0_20px_rgba(56,189,248,0.15)] border-2 ${!profileData.engineSerial ? 'border-red-500 animate-pulse' : 'border-neon-steel/30 focus:border-neon-steel'}`} />
                          {!profileData.engineSerial && <p className="text-xs text-red-400 mt-1 font-bold">Serial number recommended if available.</p>}
                        </div>
                     </div>
                  </div>
                  <div className="space-y-4 pt-2">
                    <SectionHeader title="Vessel Architecture" />
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div><label htmlFor="boatMake" className="block text-xs text-slate-400 uppercase font-bold mb-2">Make</label><input id="boatMake" value={profileData.boatMake} onFocus={handleInputFocus} onChange={e => setProfileData({...profileData, boatMake: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white text-base" /></div>
                       <div><label htmlFor="boatModel" className="block text-xs text-slate-400 uppercase font-bold mb-2">Model</label><input id="boatModel" value={profileData.boatModel} onFocus={handleInputFocus} onChange={e => setProfileData({...profileData, boatModel: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white text-base" /></div>
                       <div><label htmlFor="boatYear" className="block text-xs text-slate-400 uppercase font-bold mb-2">Year</label><input id="boatYear" type="number" value={profileData.boatYear} onFocus={handleInputFocus} onChange={e => setProfileData({...profileData, boatYear: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white text-base" /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div><label htmlFor="boatLength" className="block text-xs text-slate-400 uppercase font-bold mb-2">Length</label><input id="boatLength" value={profileData.boatLength} onFocus={handleInputFocus} onChange={e => setProfileData({...profileData, boatLength: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white text-base" /></div>
                       <div><label htmlFor="vesselHin" className="block text-xs text-slate-400 uppercase font-bold mb-2">Vessel HIN</label><input id="vesselHin" value={profileData.vesselHIN} onFocus={handleInputFocus} onChange={e => setProfileData({...profileData, vesselHIN: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white text-base font-mono uppercase" placeholder="ABC12345D424" /></div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 pt-6 border-t border-white/10"><button onClick={handleSubmit} className="w-full bg-neon-seafoam text-slate-900 font-black py-4 rounded-xl shadow-[0_0_30px_rgba(45,212,191,0.2)] hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-sm">SAVE & GENERATE RO</button></div>
            </div>
        </div>
    );
};

export default ProfileOnboardingForm;
