import React, { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Sun, Grid3X3 } from 'lucide-react';
import { RepairOrder, LoggedInUser, UserRole } from '../types';
import {
  getWeekDays,
  getMonthDays,
  getROsForDateRange,
  getDayCounts,
  getBoatsOnDock,
  formatDayHeader,
  formatShortDate,
  formatSlotTime,
  isToday,
  isSameDay,
  toDateKey,
  getHour,
} from '../utils/calendarUtils';
import CalendarEventCard from '../components/CalendarEventCard';

interface DockCalendarPageProps {
  repairOrders: RepairOrder[];
  loggedInUser: LoggedInUser | null;
  onUpdateRO?: (ro: RepairOrder) => void;
  initialDate?: Date;
}

type ViewMode = 'week' | 'day' | 'month';

const HOUR_START = 6;
const HOUR_END = 18;
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

const DockCalendarPage: React.FC<DockCalendarPageProps> = ({
  repairOrders,
  loggedInUser,
  onUpdateRO,
  initialDate,
}) => {
  const [currentDate, setCurrentDate] = useState(initialDate || new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedRO, setSelectedRO] = useState<RepairOrder | null>(null);
  const [dragData, setDragData] = useState<{ roId: string; type: 'arrival' | 'pickup' } | null>(null);
  const [newDirective, setNewDirective] = useState('');
  const [newPartDesc, setNewPartDesc] = useState('');

  const canEdit = loggedInUser?.role === UserRole.SERVICE_MANAGER || loggedInUser?.role === UserRole.ADMIN;

  // --- Navigation ---
  const navigatePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else if (viewMode === 'day') d.setDate(d.getDate() - 1);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const navigateNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else if (viewMode === 'day') d.setDate(d.getDate() + 1);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  // --- Week data ---
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const weekStart = weekDays[0];
  const weekEnd = new Date(weekDays[6]);
  weekEnd.setHours(23, 59, 59, 999);

  const weekROs = useMemo(() => {
    return getROsForDateRange(repairOrders, weekStart, weekEnd);
  }, [repairOrders, weekStart, weekEnd]);

  const boatsOnDock = useMemo(() => getBoatsOnDock(repairOrders, new Date()), [repairOrders]);

  // --- Month data ---
  const monthWeeks = useMemo(() => {
    return getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
  }, [currentDate]);

  // --- Drag and drop ---
  const handleDragStart = useCallback((e: React.DragEvent, ro: RepairOrder, type: 'arrival' | 'pickup') => {
    setDragData({ roId: ro.id, type });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ro.id);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetDate: Date, targetHour: number) => {
    e.preventDefault();
    if (!dragData || !onUpdateRO) return;

    const ro = repairOrders.find(r => r.id === dragData.roId);
    if (!ro) return;

    const newDate = new Date(targetDate);
    newDate.setHours(targetHour, 0, 0, 0);
    const newISO = newDate.toISOString();

    const field = dragData.type === 'arrival' ? 'arrivalDate' : 'estimatedPickupDate';
    const updatedRO = { ...ro, [field]: newISO };

    // If moving arrival, also update scheduledDate to match
    if (dragData.type === 'arrival') {
      updatedRO.scheduledDate = newISO;
    }

    onUpdateRO(updatedRO);
    setDragData(null);
  }, [dragData, repairOrders, onUpdateRO]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  /** Month view drop — keeps original time, changes date only */
  const handleMonthDrop = useCallback((e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (!dragData || !onUpdateRO) return;

    const ro = repairOrders.find(r => r.id === dragData.roId);
    if (!ro) return;

    const field = dragData.type === 'arrival' ? 'arrivalDate' : 'estimatedPickupDate';
    const originalDate = ro[field] ? new Date(ro[field]!) : new Date();
    const newDate = new Date(targetDate);
    newDate.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0);
    const newISO = newDate.toISOString();

    const updatedRO = { ...ro, [field]: newISO };
    if (dragData.type === 'arrival') updatedRO.scheduledDate = newISO;

    onUpdateRO(updatedRO);
    setDragData(null);
  }, [dragData, repairOrders, onUpdateRO]);

  // --- Get events for a day + hour slot ---
  const getSlotEvents = (day: Date, hour: number) => {
    const dateKey = toDateKey(day);
    const events: { ro: RepairOrder; type: 'arrival' | 'pickup' }[] = [];

    for (const ro of repairOrders) {
      if (ro.arrivalDate && toDateKey(new Date(ro.arrivalDate)) === dateKey) {
        const h = getHour(ro.arrivalDate);
        if (h === hour || (hour === HOUR_START && h < HOUR_START) || (hour === HOUR_END && h > HOUR_END)) {
          events.push({ ro, type: 'arrival' });
        }
      }
      if (ro.estimatedPickupDate && toDateKey(new Date(ro.estimatedPickupDate)) === dateKey) {
        const h = getHour(ro.estimatedPickupDate);
        if (h === hour || (hour === HOUR_START && h < HOUR_START) || (hour === HOUR_END && h > HOUR_END)) {
          events.push({ ro, type: 'pickup' });
        }
      }
    }

    return events;
  };

  // --- Header date range label ---
  const headerLabel = useMemo(() => {
    if (viewMode === 'week') {
      return `${formatShortDate(weekDays[0])} — ${formatShortDate(weekDays[6])}, ${weekDays[6].getFullYear()}`;
    }
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [viewMode, currentDate, weekDays]);

  // === RENDER: WEEK VIEW ===
  const renderWeekView = () => (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-[60px_repeat(7,1fr)] min-w-[900px]">
        {/* Column headers */}
        <div className="sticky top-0 z-10 bg-slate-900/95 border-b border-slate-600 p-2" />
        {weekDays.map((day, i) => {
          const today = isToday(day);
          const counts = getDayCounts(repairOrders, day);
          return (
            <div
              key={i}
              className={`sticky top-0 z-10 bg-slate-900/95 border-b border-l border-slate-600 p-2 text-center cursor-pointer hover:bg-slate-800/50 ${
                today ? 'border-b-2 border-b-teal-400' : ''
              }`}
              onClick={() => { setCurrentDate(day); setViewMode('day'); }}
            >
              <div className={`text-xs font-bold uppercase ${today ? 'text-teal-400' : 'text-slate-400'}`}>
                {formatDayHeader(day)}
              </div>
              <div className="flex justify-center gap-2 mt-1">
                {counts.arrivals > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">
                    {counts.arrivals} ↓
                  </span>
                )}
                {counts.pickups > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                    {counts.pickups} ↑
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Time slots */}
        {HOURS.map(hour => (
          <React.Fragment key={hour}>
            {/* Hour label */}
            <div className="border-b border-slate-600 px-2 py-1 text-[10px] text-slate-500 font-mono text-right">
              {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
            </div>
            {/* Day cells */}
            {weekDays.map((day, dayIdx) => {
              const events = getSlotEvents(day, hour);
              const today = isToday(day);
              return (
                <div
                  key={`${hour}-${dayIdx}`}
                  className={`border-b border-l border-slate-600 min-h-[48px] p-0.5 transition-colors ${
                    today ? 'bg-teal-500/[0.03]' : ''
                  } ${dragData ? 'hover:bg-slate-700/30' : ''}`}
                  onDragOver={canEdit ? handleDragOver : undefined}
                  onDrop={canEdit ? (e) => handleDrop(e, day, hour) : undefined}
                >
                  <div className="flex flex-col gap-0.5">
                    {events.map(({ ro, type }) => (
                      <CalendarEventCard
                        key={`${ro.id}-${type}`}
                        ro={ro}
                        type={type}
                        draggable={canEdit}
                        onDragStart={handleDragStart}
                        onClick={setSelectedRO}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  // === RENDER: DAY VIEW ===
  const renderDayView = () => {
    const counts = getDayCounts(repairOrders, currentDate);
    const dayDock = getBoatsOnDock(repairOrders, currentDate);

    return (
      <div className="flex-1 overflow-auto">
        {/* Day summary */}
        <div className="flex items-center gap-6 px-6 py-3 border-b border-slate-600 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <span className="text-blue-400 text-lg">↓</span>
            <span className="text-sm text-slate-300"><strong className="text-blue-400">{counts.arrivals}</strong> arriving</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 text-lg">↑</span>
            <span className="text-sm text-slate-300"><strong className="text-emerald-400">{counts.pickups}</strong> departing</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-lg">⚓</span>
            <span className="text-sm text-slate-300"><strong className="text-slate-200">{dayDock.length}</strong> on dock</span>
          </div>
        </div>

        {/* Two-column: Arriving | Departing */}
        <div className="grid grid-cols-[60px_1fr_1fr] min-w-[600px]">
          <div className="border-b border-slate-600 p-2" />
          <div className="border-b border-l border-slate-600 p-2 text-center">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Arriving ↓</span>
          </div>
          <div className="border-b border-l border-slate-600 p-2 text-center">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Departing ↑</span>
          </div>

          {HOURS.map(hour => {
            const events = getSlotEvents(currentDate, hour);
            const arrivals = events.filter(e => e.type === 'arrival');
            const pickups = events.filter(e => e.type === 'pickup');

            return (
              <React.Fragment key={hour}>
                <div className="border-b border-slate-600 px-2 py-1 text-[10px] text-slate-500 font-mono text-right">
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </div>
                <div
                  className="border-b border-l border-slate-600 min-h-[48px] p-0.5"
                  onDragOver={canEdit ? handleDragOver : undefined}
                  onDrop={canEdit ? (e) => handleDrop(e, currentDate, hour) : undefined}
                >
                  {arrivals.map(({ ro }) => (
                    <CalendarEventCard key={ro.id} ro={ro} type="arrival" draggable={canEdit} onDragStart={handleDragStart} onClick={setSelectedRO} />
                  ))}
                </div>
                <div
                  className="border-b border-l border-slate-600 min-h-[48px] p-0.5"
                  onDragOver={canEdit ? handleDragOver : undefined}
                  onDrop={canEdit ? (e) => handleDrop(e, currentDate, hour) : undefined}
                >
                  {pickups.map(({ ro }) => (
                    <CalendarEventCard key={ro.id} ro={ro} type="pickup" draggable={canEdit} onDragStart={handleDragStart} onClick={setSelectedRO} />
                  ))}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  // === RENDER: MONTH VIEW ===
  const renderMonthView = () => (
    <div className="flex-1 overflow-auto p-4">
      <div className="grid grid-cols-7 gap-px bg-slate-600 rounded-xl overflow-hidden">
        {/* Day-of-week headers */}
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="bg-slate-900 px-3 py-2 text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            {d}
          </div>
        ))}

        {/* Day cells */}
        {monthWeeks.flatMap((week, wi) =>
          week.map((day, di) => {
            const today = isToday(day);
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const dateKey = toDateKey(day);

            // Get actual RO events for this day
            const dayArrivals = repairOrders.filter(ro => ro.arrivalDate && toDateKey(new Date(ro.arrivalDate)) === dateKey);
            const dayPickups = repairOrders.filter(ro => ro.estimatedPickupDate && toDateKey(new Date(ro.estimatedPickupDate)) === dateKey);
            const totalEvents = dayArrivals.length + dayPickups.length;

            return (
              <div
                key={`${wi}-${di}`}
                className={`bg-slate-900/80 min-h-[80px] p-1.5 transition-colors ${
                  !isCurrentMonth ? 'opacity-30' : ''
                } ${today ? 'ring-1 ring-teal-400 ring-inset' : ''} ${dragData ? 'hover:bg-slate-700/30' : ''}`}
                onDragOver={canEdit ? handleDragOver : undefined}
                onDrop={canEdit ? (e) => handleMonthDrop(e, day) : undefined}
              >
                <div
                  className={`text-[11px] font-bold mb-1 cursor-pointer hover:text-teal-300 ${today ? 'text-teal-400' : 'text-slate-400'}`}
                  onClick={() => { setCurrentDate(day); setViewMode('day'); }}
                >
                  {day.getDate()}
                </div>
                <div className="flex flex-col gap-0.5">
                  {/* Show individual event mini-cards (up to 4, then overflow count) */}
                  {dayArrivals.slice(0, 3).map(ro => (
                    <div
                      key={`a-${ro.id}`}
                      draggable={canEdit}
                      onDragStart={canEdit ? (e) => { setDragData({ roId: ro.id, type: 'arrival' }); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', ro.id); } : undefined}
                      className={`text-[8px] px-1 py-0.5 rounded bg-blue-500/15 text-blue-300 font-bold truncate cursor-pointer hover:bg-blue-500/25 ${canEdit ? 'cursor-grab active:cursor-grabbing' : ''}`}
                      onClick={() => setSelectedRO(ro)}
                    >
                      ↓ {ro.customerName}
                    </div>
                  ))}
                  {dayPickups.slice(0, 3).map(ro => (
                    <div
                      key={`p-${ro.id}`}
                      draggable={canEdit}
                      onDragStart={canEdit ? (e) => { setDragData({ roId: ro.id, type: 'pickup' }); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', ro.id); } : undefined}
                      className={`text-[8px] px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold truncate cursor-pointer hover:bg-emerald-500/25 ${canEdit ? 'cursor-grab active:cursor-grabbing' : ''}`}
                      onClick={() => setSelectedRO(ro)}
                    >
                      ↑ {ro.customerName}
                    </div>
                  ))}
                  {totalEvents > 6 && (
                    <span
                      className="text-[8px] text-slate-500 font-bold text-center cursor-pointer hover:text-slate-300"
                      onClick={() => { setCurrentDate(day); setViewMode('day'); }}
                    >
                      +{totalEvents - 6} more
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // === RENDER: RO DETAIL PANEL ===
  const renderDetailPanel = () => {
    if (!selectedRO) return null;
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4" onClick={() => setSelectedRO(null)}>
        <div className="bg-slate-900 border border-slate-600 rounded-2xl p-3 sm:p-6 w-full max-w-[calc(100vw-1rem)] sm:max-w-lg shadow-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          {/* Customer + RO ID */}
          <h3 className="text-lg font-black text-slate-200 mb-0.5">{selectedRO.customerName}</h3>
          <p className="text-[10px] text-slate-500 font-mono mb-4">{selectedRO.id}</p>

          {/* Vessel Identity */}
          <div className="bg-slate-800/50 rounded-lg p-3 mb-4 border border-slate-600">
            <h4 className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-2">Vessel</h4>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-sm">
              <div>
                <span className="text-slate-500 text-[10px]">Boat</span>
                <p className="text-slate-200 font-bold">{selectedRO.boatMake || '—'} {selectedRO.boatModel || ''}</p>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">Year / Length</span>
                <p className="text-slate-300">{selectedRO.boatYear || '—'}{selectedRO.boatLength ? ` • ${selectedRO.boatLength}ft` : ''}</p>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">HIN</span>
                <p className="text-slate-300 font-mono text-xs">{selectedRO.vesselHIN || '—'}</p>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">Vessel Name</span>
                <p className="text-slate-300">{selectedRO.vesselName || '—'}</p>
              </div>
            </div>
          </div>

          {/* Engine Identity */}
          <div className="bg-slate-800/50 rounded-lg p-3 mb-4 border border-slate-600">
            <h4 className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-2">Engine</h4>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-sm">
              <div>
                <span className="text-slate-500 text-[10px]">Make / Model</span>
                <p className="text-slate-200 font-bold">{selectedRO.engineMake || '—'} {selectedRO.engineModel || ''}</p>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">Year</span>
                <p className="text-slate-300">{selectedRO.engineYear || '—'}</p>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">Serial Number</span>
                <p className="text-slate-300 font-mono text-xs">{selectedRO.engineSerial || '—'}</p>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">Hours / HP</span>
                <p className="text-slate-300">{selectedRO.engineHours ? `${selectedRO.engineHours} hrs` : '—'}{selectedRO.engineHorsepower ? ` • ${selectedRO.engineHorsepower} HP` : ''}</p>
              </div>
            </div>
          </div>

          {/* Scheduling + Job Details */}
          <div className="space-y-2 text-sm">
            {selectedRO.jobCategory && (
              <div className="flex justify-between">
                <span className="text-slate-500">Job Type</span>
                <span className="text-slate-300 font-bold">{selectedRO.jobCategory}</span>
              </div>
            )}
            {selectedRO.arrivalDate ? (
              <div className="flex justify-between items-center">
                <span className="text-blue-400">Drop-off</span>
                {canEdit && onUpdateRO ? (
                  <input
                    type="datetime-local"
                    value={new Date(new Date(selectedRO.arrivalDate).getTime() - new Date(selectedRO.arrivalDate).getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                    onChange={e => {
                      if (!e.target.value) return;
                      const freshRO = repairOrders.find(r => r.id === selectedRO.id) || selectedRO;
                      const newISO = new Date(e.target.value).toISOString();
                      const updated = { ...freshRO, arrivalDate: newISO, scheduledDate: newISO };
                      onUpdateRO(updated);
                      setSelectedRO(updated);
                    }}
                    className="bg-slate-800/50 border border-slate-600 rounded-lg px-2 py-1 text-slate-300 text-xs focus:border-blue-400 outline-none"
                  />
                ) : (
                  <span className="text-slate-300">{new Date(selectedRO.arrivalDate).toLocaleString()}</span>
                )}
              </div>
            ) : canEdit && onUpdateRO ? (
              <div className="flex justify-between items-center">
                <span className="text-blue-400/60">Drop-off</span>
                <input
                  type="datetime-local"
                  value=""
                  onChange={e => {
                    if (!e.target.value) return;
                    const freshRO = repairOrders.find(r => r.id === selectedRO.id) || selectedRO;
                    const newISO = new Date(e.target.value).toISOString();
                    const updated = { ...freshRO, arrivalDate: newISO, scheduledDate: newISO };
                    onUpdateRO(updated);
                    setSelectedRO(updated);
                  }}
                  className="bg-slate-800/50 border border-slate-600 rounded-lg px-2 py-1 text-slate-500 text-xs focus:border-blue-400 outline-none"
                />
              </div>
            ) : null}
            {selectedRO.estimatedPickupDate ? (
              <div className="flex justify-between items-center">
                <span className="text-emerald-400">Pick-up</span>
                {canEdit && onUpdateRO ? (
                  <input
                    type="datetime-local"
                    value={new Date(new Date(selectedRO.estimatedPickupDate).getTime() - new Date(selectedRO.estimatedPickupDate).getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                    onChange={e => {
                      if (!e.target.value) return;
                      const freshRO = repairOrders.find(r => r.id === selectedRO.id) || selectedRO;
                      const updated = { ...freshRO, estimatedPickupDate: new Date(e.target.value).toISOString() };
                      onUpdateRO(updated);
                      setSelectedRO(updated);
                    }}
                    className="bg-slate-800/50 border border-slate-600 rounded-lg px-2 py-1 text-slate-300 text-xs focus:border-emerald-400 outline-none"
                  />
                ) : (
                  <span className="text-slate-300">{new Date(selectedRO.estimatedPickupDate).toLocaleString()}</span>
                )}
              </div>
            ) : canEdit && onUpdateRO ? (
              <div className="flex justify-between items-center">
                <span className="text-emerald-400/60">Pick-up</span>
                <input
                  type="datetime-local"
                  value=""
                  onChange={e => {
                    if (!e.target.value) return;
                    const freshRO = repairOrders.find(r => r.id === selectedRO.id) || selectedRO;
                    const updated = { ...freshRO, estimatedPickupDate: new Date(e.target.value).toISOString() };
                    onUpdateRO(updated);
                    setSelectedRO(updated);
                  }}
                  className="bg-slate-800/50 border border-slate-600 rounded-lg px-2 py-1 text-slate-500 text-xs focus:border-emerald-400 outline-none"
                />
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-slate-500">Status</span>
              <span className="text-slate-300 font-bold uppercase text-xs">{selectedRO.status.replace('_', ' ')}</span>
            </div>
            {selectedRO.technicianName && (
              <div className="flex justify-between">
                <span className="text-slate-500">Technician</span>
                <span className="text-teal-400 font-bold">{selectedRO.technicianName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Directives</span>
              <span className="text-slate-300">{selectedRO.directives.length}</span>
            </div>
            {selectedRO.directives.length > 0 && (
              <div className="pl-3 border-l border-slate-600 space-y-1">
                {selectedRO.directives.map((d: any, i: number) => (
                  <p key={i} className="text-[10px] text-slate-400">
                    <span className="text-slate-500 font-mono mr-1">{String(i + 1).padStart(2, '0')}</span>
                    {d.title || d.description || String(d)}
                    {d.isCompleted && <span className="ml-1 text-emerald-400">✓</span>}
                  </p>
                ))}
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Parts</span>
              <span className="text-slate-300">{selectedRO.parts.length}</span>
            </div>
            {selectedRO.parts.length > 0 && (
              <div className="pl-3 border-l border-slate-600 space-y-1">
                {selectedRO.parts.map((p: any, i: number) => (
                  <p key={i} className="text-[10px] text-slate-400">
                    <span className="text-slate-500 font-mono mr-1">{p.partNumber}</span>
                    {p.description}{p.quantity && p.quantity > 1 ? ` ×${p.quantity}` : ''}
                    <span className="ml-2 text-[8px] uppercase font-bold text-slate-600">{p.status}</span>
                  </p>
                ))}
              </div>
            )}
            {selectedRO.jobComplaint && (
              <div>
                <span className="text-slate-500 text-[10px] block mb-0.5">Complaint</span>
                <p className="text-slate-300 text-xs italic">{selectedRO.jobComplaint}</p>
              </div>
            )}
          </div>

          {/* SM/Admin: Add Directive + Part inline */}
          {canEdit && onUpdateRO && (
            <div className="mt-4 pt-4 border-t border-slate-600 space-y-3">
              {/* Add Directive */}
              <div>
                <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Add Directive</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDirective}
                    onChange={e => setNewDirective(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newDirective.trim()) {
                        const freshRO = repairOrders.find(r => r.id === selectedRO.id) || selectedRO;
                        const updated = {
                          ...freshRO,
                          directives: [...freshRO.directives, { id: crypto.randomUUID(), title: newDirective.trim(), isCompleted: false }],
                        };
                        onUpdateRO(updated);
                        setSelectedRO(updated);
                        setNewDirective('');
                      }
                    }}
                    placeholder="e.g. Check lower unit oil"
                    className="flex-1 bg-slate-800/50 border border-slate-600 rounded-lg px-3 py-1.5 text-slate-300 text-xs focus:border-teal-400 outline-none"
                  />
                  <button
                    disabled={!newDirective.trim()}
                    onClick={() => {
                      if (!newDirective.trim()) return;
                      const freshRO = repairOrders.find(r => r.id === selectedRO.id) || selectedRO;
                      const updated = {
                        ...freshRO,
                        directives: [...freshRO.directives, { id: crypto.randomUUID(), title: newDirective.trim(), isCompleted: false }],
                      };
                      onUpdateRO(updated);
                      setSelectedRO(updated);
                      setNewDirective('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-teal-500/20 text-teal-400 text-xs font-bold hover:bg-teal-500/30 disabled:opacity-30 disabled:hover:bg-teal-500/20 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Add Part */}
              <div>
                <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Add Part</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPartDesc}
                    onChange={e => setNewPartDesc(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newPartDesc.trim()) {
                        const freshRO = repairOrders.find(r => r.id === selectedRO.id) || selectedRO;
                        const newPart = {
                          partNumber: `CUSTOM-${Date.now().toString().slice(-6)}`,
                          description: newPartDesc.trim(),
                          category: 'Custom',
                          binLocation: '',
                          msrp: 0,
                          dealerPrice: 0,
                          cost: 0,
                          quantityOnHand: 0,
                          reorderPoint: 0,
                          quantity: 1,
                          supersedesPart: null,
                          status: 'REQUIRED' as any,
                          isCustom: true,
                          shopId: freshRO.shopId,
                        };
                        const updated = { ...freshRO, parts: [...freshRO.parts, newPart] };
                        onUpdateRO(updated);
                        setSelectedRO(updated);
                        setNewPartDesc('');
                      }
                    }}
                    placeholder="e.g. Zinc anode, Impeller kit"
                    className="flex-1 bg-slate-800/50 border border-slate-600 rounded-lg px-3 py-1.5 text-slate-300 text-xs focus:border-amber-400 outline-none"
                  />
                  <button
                    disabled={!newPartDesc.trim()}
                    onClick={() => {
                      if (!newPartDesc.trim()) return;
                      const freshRO = repairOrders.find(r => r.id === selectedRO.id) || selectedRO;
                      const newPart = {
                        partNumber: `CUSTOM-${Date.now().toString().slice(-6)}`,
                        description: newPartDesc.trim(),
                        category: 'Custom',
                        binLocation: '',
                        msrp: 0,
                        dealerPrice: 0,
                        cost: 0,
                        quantityOnHand: 0,
                        reorderPoint: 0,
                        quantity: 1,
                        supersedesPart: null,
                        status: 'REQUIRED' as any,
                        isCustom: true,
                        shopId: freshRO.shopId,
                      };
                      const updated = { ...freshRO, parts: [...freshRO.parts, newPart] };
                      onUpdateRO(updated);
                      setSelectedRO(updated);
                      setNewPartDesc('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-bold hover:bg-amber-500/30 disabled:opacity-30 disabled:hover:bg-amber-500/20 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => { setSelectedRO(null); setNewDirective(''); setNewPartDesc(''); }}
            className="mt-4 w-full py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-400 hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  // === MAIN RENDER ===
  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-600 bg-slate-900/50">
        {/* Left: Navigation */}
        <div className="flex items-center gap-2">
          <button onClick={navigatePrev} className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <button onClick={goToday} className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-600 text-xs font-bold text-slate-300 hover:bg-slate-700 transition-colors">
            Today
          </button>
          <button onClick={navigateNext} className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors">
            <ChevronRight size={18} />
          </button>
          <h2 className="text-sm font-bold text-slate-200 ml-2">{headerLabel}</h2>
        </div>

        {/* Center: Dock status */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">⚓</span>
          <span className="text-sm font-bold text-slate-300">
            {boatsOnDock.length} boats on dock
          </span>
        </div>

        {/* Right: View toggles */}
        <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-0.5 border border-slate-600">
          <button
            onClick={() => setViewMode('day')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              viewMode === 'day' ? 'bg-teal-500/20 text-teal-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Sun size={13} /> Day
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              viewMode === 'week' ? 'bg-teal-500/20 text-teal-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Calendar size={13} /> Week
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              viewMode === 'month' ? 'bg-teal-500/20 text-teal-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Grid3X3 size={13} /> Month
          </button>
        </div>
      </div>

      {/* Body */}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && renderDayView()}
      {viewMode === 'month' && renderMonthView()}

      {/* Detail panel */}
      {renderDetailPanel()}
    </div>
  );
};

export default DockCalendarPage;
