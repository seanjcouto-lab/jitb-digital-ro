
import React, { useState } from 'react';
import SectionHeader from './SectionHeader';

const genId = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15));

const makeEngine = () => ({
  engineId: genId(),
  engineMake: '',
  engineModel: '',
  engineYear: '',
  engineHorsepower: '',
  engineSerial: '',
  engineHours: '',
  engineType: '',
  fuelType: '',
});

const makeVessel = () => ({
  vesselId: genId(),
  vesselName: '',
  hin: '',
  boatMake: '',
  boatModel: '',
  boatYear: '',
  boatLength: '',
  vesselNotes: '',
  engines: [makeEngine()],
});

const makeContact = (isPrimary = false) => ({
  contactId: genId(),
  fullName: '',
  phones: [''],
  emails: [''],
  isPrimary,
});

const buildInitialState = () => ({
  companyName: '',
  address: { street: '', city: '', state: '', zip: '' },
  customerNotes: '',
  contacts: [makeContact(true)],
  vessels: [makeVessel()],
});

interface ProfileOnboardingFormProps {
  initialData?: any;
  onProfileComplete: (profileData: any) => void;
}

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
  </svg>
);

const inp = "w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white text-base focus:border-neon-seafoam outline-none";
const lbl = "block text-xs text-slate-400 uppercase font-bold mb-2";
const trashBtn = "p-2 bg-slate-800/50 rounded-lg text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed";
const addBtn = "w-full border border-dashed border-amber-400/30 text-amber-400 bg-transparent hover:bg-amber-400/10 rounded-lg py-3 text-sm font-bold transition-colors text-center";

const ProfileOnboardingForm: React.FC<ProfileOnboardingFormProps> = ({ initialData, onProfileComplete }) => {
  const [profileData, setProfileData] = useState<any>(() =>
    initialData && Array.isArray(initialData.contacts) ? initialData : buildInitialState()
  );

  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
  };

  // ── COMPANY ──────────────────────────────────────────────────────────────
  const setTop = (field: string, val: string) =>
    setProfileData((p: any) => ({ ...p, [field]: val }));

  const setAddr = (field: string, val: string) =>
    setProfileData((p: any) => ({ ...p, address: { ...p.address, [field]: val } }));

  // ── CONTACTS ─────────────────────────────────────────────────────────────
  const updContact = (ci: number, field: string, val: any) =>
    setProfileData((p: any) => {
      const contacts = [...p.contacts];
      contacts[ci] = { ...contacts[ci], [field]: val };
      return { ...p, contacts };
    });

  const setPrimary = (ci: number) =>
    setProfileData((p: any) => ({
      ...p,
      contacts: p.contacts.map((c: any, i: number) => ({ ...c, isPrimary: i === ci })),
    }));

  const addContact = () =>
    setProfileData((p: any) => ({ ...p, contacts: [...p.contacts, makeContact(false)] }));

  const removeContact = (ci: number) =>
    setProfileData((p: any) => ({ ...p, contacts: p.contacts.filter((_: any, i: number) => i !== ci) }));

  const updContactArr = (ci: number, field: 'phones' | 'emails', idx: number, val: string) =>
    setProfileData((p: any) => {
      const contacts = [...p.contacts];
      const arr = [...contacts[ci][field]];
      arr[idx] = val;
      contacts[ci] = { ...contacts[ci], [field]: arr };
      return { ...p, contacts };
    });

  const addContactArrItem = (ci: number, field: 'phones' | 'emails') =>
    setProfileData((p: any) => {
      const contacts = [...p.contacts];
      contacts[ci] = { ...contacts[ci], [field]: [...contacts[ci][field], ''] };
      return { ...p, contacts };
    });

  const removeContactArrItem = (ci: number, field: 'phones' | 'emails', idx: number) =>
    setProfileData((p: any) => {
      const contacts = [...p.contacts];
      contacts[ci] = { ...contacts[ci], [field]: contacts[ci][field].filter((_: any, i: number) => i !== idx) };
      return { ...p, contacts };
    });

  // ── VESSELS ───────────────────────────────────────────────────────────────
  const updVessel = (vi: number, field: string, val: string) =>
    setProfileData((p: any) => {
      const vessels = [...p.vessels];
      vessels[vi] = { ...vessels[vi], [field]: val };
      return { ...p, vessels };
    });

  const addVessel = () =>
    setProfileData((p: any) => ({ ...p, vessels: [...p.vessels, makeVessel()] }));

  const removeVessel = (vi: number) =>
    setProfileData((p: any) => ({ ...p, vessels: p.vessels.filter((_: any, i: number) => i !== vi) }));

  // ── ENGINES ───────────────────────────────────────────────────────────────
  const updEngine = (vi: number, ei: number, field: string, val: string) =>
    setProfileData((p: any) => {
      const vessels = [...p.vessels];
      const engines = [...vessels[vi].engines];
      engines[ei] = { ...engines[ei], [field]: val };
      vessels[vi] = { ...vessels[vi], engines };
      return { ...p, vessels };
    });

  const addEngine = (vi: number) =>
    setProfileData((p: any) => {
      const vessels = [...p.vessels];
      vessels[vi] = { ...vessels[vi], engines: [...vessels[vi].engines, makeEngine()] };
      return { ...p, vessels };
    });

  const removeEngine = (vi: number, ei: number) =>
    setProfileData((p: any) => {
      const vessels = [...p.vessels];
      vessels[vi] = { ...vessels[vi], engines: vessels[vi].engines.filter((_: any, i: number) => i !== ei) };
      return { ...p, vessels };
    });

  // ── SUBMIT ────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    const primary = profileData.contacts.find((c: any) => c.isPrimary) || profileData.contacts[0];
    if (!primary?.fullName?.trim()) {
      alert("Required: Customer Name");
      return;
    }
    if (!profileData.vessels.length) {
      alert("Required: At least one vessel.");
      return;
    }
    for (let vi = 0; vi < profileData.vessels.length; vi++) {
      if (!profileData.vessels[vi].engines.length) {
        alert(`Required: Vessel ${vi + 1} must have at least one engine.`);
        return;
      }
    }
    // Flatten new nested shape into legacy flat fields so downstream
    // consumers (ROGenerationView) continue to work unchanged.
    const v0 = profileData.vessels[0] || {};
    const e0 = v0.engines?.[0] || {};
    const merged = {
      ...profileData,
      customerName: primary.fullName,
      customerPhones: primary.phones,
      customerEmails: primary.emails,
      customerAddress: profileData.address,
      customerNotes: profileData.customerNotes,
      vesselName: v0.vesselName || '',
      vesselHIN: v0.hin || '',
      boatMake: v0.boatMake || '',
      boatModel: v0.boatModel || '',
      boatYear: v0.boatYear || '',
      boatLength: v0.boatLength || '',
      engineMake: e0.engineMake || '',
      engineModel: e0.engineModel || '',
      engineYear: e0.engineYear || '',
      engineHorsepower: e0.engineHorsepower || '',
      engineSerial: e0.engineSerial || '',
    };
    onProfileComplete(merged);
  };

  return (
    <div className="glass rounded-2xl p-8 border-white/5 animate-in slide-in-from-right-4 duration-500">
      <div className="border-b border-white/5 pb-6 mb-8">
        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">New Service Profile Onboarding</h3>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Customer & Asset Registration Matrix</p>
      </div>

      <div className="space-y-10">

        {/* ── SECTION 1: CUSTOMER / ACCOUNT ────────────────────────────────── */}
        <div>
          <SectionHeader title="Customer / Account" />
          <div className="space-y-6 mt-4">

            {/* Company Name */}
            <div>
              <label htmlFor="companyName" className={lbl}>Company Name (optional)</label>
              <input id="companyName" value={profileData.companyName} onFocus={onFocus} onChange={e => setTop('companyName', e.target.value)} className={inp} placeholder="e.g. Coastal Marine LLC" />
            </div>

            {/* Contacts */}
            {profileData.contacts.map((contact: any, ci: number) => (
              <div key={contact.contactId} className="bg-slate-800/40 border border-white/10 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 uppercase font-bold tracking-widest">
                    {ci === 0 ? 'Primary Contact' : `Contact ${ci + 1}`}
                  </span>
                  <div className="flex items-center gap-3">
                    {profileData.contacts.length > 1 && (
                      <button
                        onClick={() => setPrimary(ci)}
                        className={`text-xs font-bold px-3 py-1 rounded-full border transition-colors ${contact.isPrimary ? 'bg-neon-seafoam/20 border-neon-seafoam text-neon-seafoam' : 'border-white/10 text-slate-500 hover:border-neon-seafoam/50 hover:text-neon-seafoam/70'}`}
                      >
                        {contact.isPrimary ? 'Primary' : 'Set Primary'}
                      </button>
                    )}
                    <button disabled={profileData.contacts.length <= 1} onClick={() => removeContact(ci)} className={trashBtn}>
                      <TrashIcon />
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor={ci === 0 ? 'customerName' : undefined} className={lbl}>Full Name</label>
                  <input
                    id={ci === 0 ? 'customerName' : undefined}
                    value={contact.fullName}
                    onFocus={onFocus}
                    onChange={e => updContact(ci, 'fullName', e.target.value)}
                    className={inp}
                    placeholder="e.g. Robert Smith"
                  />
                </div>

                <div>
                  <label className={lbl}>Phone Numbers</label>
                  {contact.phones.map((phone: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <input value={phone} type="tel" onFocus={onFocus} onChange={e => updContactArr(ci, 'phones', idx, e.target.value)} className={`flex-grow ${inp}`} placeholder="e.g. 555-123-4567" />
                      {contact.phones.length > 1 && (
                        <button onClick={() => removeContactArrItem(ci, 'phones', idx)} className={trashBtn}><TrashIcon /></button>
                      )}
                    </div>
                  ))}
                  {contact.phones.length < 3 && (
                    <button onClick={() => addContactArrItem(ci, 'phones')} className="text-xs text-neon-seafoam font-bold hover:text-white transition-colors">+ Add Phone</button>
                  )}
                </div>

                <div>
                  <label className={lbl}>Email Addresses (optional)</label>
                  {contact.emails.map((email: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <input value={email} type="email" onFocus={onFocus} onChange={e => updContactArr(ci, 'emails', idx, e.target.value)} className={`flex-grow ${inp}`} placeholder="e.g. user@example.com" />
                      {contact.emails.length > 1 && (
                        <button onClick={() => removeContactArrItem(ci, 'emails', idx)} className={trashBtn}><TrashIcon /></button>
                      )}
                    </div>
                  ))}
                  {contact.emails.length < 3 && (
                    <button onClick={() => addContactArrItem(ci, 'emails')} className="text-xs text-neon-seafoam font-bold hover:text-white transition-colors">+ Add Email</button>
                  )}
                </div>

                {ci === 0 && (
                  <>
                    <div>
                      <label className={lbl}>Mailing Address</label>
                      <input value={profileData.address.street} onFocus={onFocus} onChange={e => setAddr('street', e.target.value)} placeholder="Street" className={`${inp} mb-2`} />
                      <div className="grid grid-cols-6 gap-2">
                        <input aria-label="City" value={profileData.address.city} onFocus={onFocus} onChange={e => setAddr('city', e.target.value)} placeholder="City" className={`col-span-3 ${inp}`} />
                        <input aria-label="State" value={profileData.address.state} onFocus={onFocus} onChange={e => setAddr('state', e.target.value)} placeholder="State" className={`col-span-1 ${inp}`} />
                        <input aria-label="ZIP Code" value={profileData.address.zip} onFocus={onFocus} onChange={e => setAddr('zip', e.target.value)} placeholder="ZIP" className={`col-span-2 ${inp}`} />
                      </div>
                    </div>
                    <div>
                      <label className={lbl}>Notes</label>
                      <textarea value={profileData.customerNotes} onFocus={onFocus} onChange={e => setTop('customerNotes', e.target.value)} rows={3} className={`${inp} resize-none`} placeholder="Any relevant account notes..." />
                    </div>
                  </>
                )}
              </div>
            ))}

            <button onClick={addContact} className={addBtn}>+ Add Contact</button>

          </div>
        </div>

        {/* ── SECTION 2: VESSELS ───────────────────────────────────────────── */}
        <div>
          <SectionHeader title="Vessels" />
          <div className="space-y-6 mt-4">
            {profileData.vessels.map((vessel: any, vi: number) => (
              <div key={vessel.vesselId} className="bg-slate-800/40 border border-white/10 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 uppercase font-bold tracking-widest">Vessel {vi + 1}</span>
                  <button disabled={profileData.vessels.length <= 1} onClick={() => removeVessel(vi)} className={trashBtn}>
                    <TrashIcon />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Vessel Name</label>
                    <input value={vessel.vesselName} onFocus={onFocus} onChange={e => updVessel(vi, 'vesselName', e.target.value)} className={inp} placeholder="e.g. Sea Breeze" />
                  </div>
                  <div>
                    <label htmlFor={vi === 0 ? 'vesselHin' : undefined} className={lbl}>Vessel HIN</label>
                    <input id={vi === 0 ? 'vesselHin' : undefined} value={vessel.hin} onFocus={onFocus} onChange={e => updVessel(vi, 'hin', e.target.value)} className={`${inp} font-mono uppercase`} placeholder="ABC12345D424" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={lbl}>Make</label>
                    <input value={vessel.boatMake} onFocus={onFocus} onChange={e => updVessel(vi, 'boatMake', e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Model</label>
                    <input value={vessel.boatModel} onFocus={onFocus} onChange={e => updVessel(vi, 'boatModel', e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Year</label>
                    <input value={vessel.boatYear} type="number" onFocus={onFocus} onChange={e => updVessel(vi, 'boatYear', e.target.value)} className={inp} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Length</label>
                    <input value={vessel.boatLength} onFocus={onFocus} onChange={e => updVessel(vi, 'boatLength', e.target.value)} className={inp} placeholder="e.g. 24ft" />
                  </div>
                </div>

                <div>
                  <label className={lbl}>Vessel Notes</label>
                  <textarea value={vessel.vesselNotes || ''} onFocus={onFocus} onChange={e => updVessel(vi, 'vesselNotes', e.target.value)} rows={2} className={`${inp} resize-none`} placeholder="e.g. Stored at slip 42, trailer in lot B..." />
                </div>

                {/* Engines */}
                <div className="space-y-3 border-t border-white/5 pt-4">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Engines</p>
                  {vessel.engines.map((engine: any, ei: number) => (
                    <div key={engine.engineId} className="bg-slate-900/60 border border-white/5 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 uppercase font-bold tracking-widest">Engine {ei + 1}</span>
                        <button disabled={vessel.engines.length <= 1} onClick={() => removeEngine(vi, ei)} className={trashBtn}>
                          <TrashIcon />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className={lbl}>Make</label>
                          <input value={engine.engineMake} onFocus={onFocus} onChange={e => updEngine(vi, ei, 'engineMake', e.target.value)} className={inp} />
                        </div>
                        <div>
                          <label className={lbl}>Model</label>
                          <input value={engine.engineModel} onFocus={onFocus} onChange={e => updEngine(vi, ei, 'engineModel', e.target.value)} className={inp} />
                        </div>
                        <div>
                          <label className={lbl}>Year</label>
                          <input value={engine.engineYear} type="number" onFocus={onFocus} onChange={e => updEngine(vi, ei, 'engineYear', e.target.value)} className={inp} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className={lbl}>Horsepower</label>
                          <input value={engine.engineHorsepower} type="number" onFocus={onFocus} onChange={e => updEngine(vi, ei, 'engineHorsepower', e.target.value)} className={inp} />
                        </div>
                        <div>
                          <label className={lbl}>Engine Hours</label>
                          <input value={engine.engineHours} type="number" onFocus={onFocus} onChange={e => updEngine(vi, ei, 'engineHours', e.target.value)} className={inp} />
                        </div>
                      </div>

                      <div>
                        <label htmlFor={vi === 0 && ei === 0 ? 'engineSerial' : undefined} className={lbl}>Engine S/N</label>
                        <input
                          id={vi === 0 && ei === 0 ? 'engineSerial' : undefined}
                          value={engine.engineSerial}
                          onFocus={onFocus}
                          onChange={e => updEngine(vi, ei, 'engineSerial', e.target.value)}
                          className={`w-full bg-slate-900 rounded-lg px-4 py-3 text-white text-base font-mono uppercase outline-none border-2 ${!engine.engineSerial ? 'border-amber-400/50' : 'border-neon-steel/30 focus:border-neon-steel'}`}
                        />
                        {!engine.engineSerial && <p className="text-xs text-amber-400 mt-1 font-bold">Serial number recommended if available.</p>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className={lbl}>Engine Type</label>
                          <select value={engine.engineType} onFocus={onFocus} onChange={e => updEngine(vi, ei, 'engineType', e.target.value)} className={inp}>
                            <option value="">Select...</option>
                            <option value="Outboard">Outboard</option>
                            <option value="Inboard">Inboard</option>
                            <option value="Stern Drive">Stern Drive</option>
                            <option value="Jet">Jet</option>
                          </select>
                        </div>
                        <div>
                          <label className={lbl}>Fuel Type</label>
                          <select value={engine.fuelType} onFocus={onFocus} onChange={e => updEngine(vi, ei, 'fuelType', e.target.value)} className={inp}>
                            <option value="">Select...</option>
                            <option value="Gas">Gas</option>
                            <option value="Diesel">Diesel</option>
                            <option value="Electric">Electric</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => addEngine(vi)} className={addBtn}>+ Add Engine</button>
                </div>
              </div>
            ))}
            <button onClick={addVessel} className={addBtn}>+ Add Vessel</button>
          </div>
        </div>

        {/* ── SUBMIT ────────────────────────────────────────────────────────── */}
        <div className="pt-6 border-t border-white/10">
          <button onClick={handleSubmit} className="w-full bg-neon-seafoam text-slate-900 font-black py-4 rounded-xl shadow-[0_0_30px_rgba(45,212,191,0.2)] hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-sm">SAVE & GENERATE RO</button>
        </div>

      </div>
    </div>
  );
};

export default ProfileOnboardingForm;
