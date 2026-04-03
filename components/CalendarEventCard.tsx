import React from 'react';
import { RepairOrder } from '../types';
import { formatSlotTime } from '../utils/calendarUtils';

const DEFAULT_JOB_CATEGORY_COLORS: Record<string, string> = {
  'Repower': '#F97316',
  '100hr Service': '#3B82F6',
  '300hr Service': '#06B6D4',
  '1000hr Service': '#8B5CF6',
  'Small Motor Repair': '#EAB308',
  'Inboard Service': '#14B8A6',
  'Outboard Service': '#22C55E',
  'Winterization': '#64748B',
  'Bottom Paint / Hull': '#F59E0B',
  'Electrical / Electronics': '#F43F5E',
};

interface CalendarEventCardProps {
  ro: RepairOrder;
  type: 'arrival' | 'pickup';
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, ro: RepairOrder, type: 'arrival' | 'pickup') => void;
  onClick?: (ro: RepairOrder) => void;
}

const CalendarEventCard: React.FC<CalendarEventCardProps> = ({
  ro,
  type,
  draggable = false,
  onDragStart,
  onClick,
}) => {
  const categoryColor = ro.jobCategory
    ? DEFAULT_JOB_CATEGORY_COLORS[ro.jobCategory] || '#64748B'
    : '#64748B';

  const dateStr = type === 'arrival' ? ro.arrivalDate : ro.estimatedPickupDate;
  const timeLabel = dateStr ? formatSlotTime(dateStr) : '';
  const isArrival = type === 'arrival';

  return (
    <div
      draggable={draggable}
      onDragStart={draggable && onDragStart ? (e) => onDragStart(e, ro, type) : undefined}
      onClick={onClick ? () => onClick(ro) : undefined}
      className={`
        relative rounded-lg px-2.5 py-1.5 text-[10px] cursor-pointer
        transition-all hover:scale-[1.02] hover:shadow-lg
        ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}
      `}
      style={{
        borderLeft: `3px solid ${categoryColor}`,
        backgroundColor: `${categoryColor}11`,
      }}
    >
      {/* Direction indicator */}
      <div className="flex items-center gap-1 mb-0.5">
        <span className={isArrival ? 'text-blue-400' : 'text-emerald-400'}>
          {isArrival ? '↓' : '↑'}
        </span>
        <span className="font-bold text-slate-300 truncate max-w-[120px]">
          {ro.customerName}
        </span>
      </div>

      {/* Vessel + time */}
      <div className="flex items-center justify-between gap-1">
        <span className="text-slate-500 truncate max-w-[90px]">{ro.vesselName}</span>
        <span className="text-slate-400 font-mono whitespace-nowrap">{timeLabel}</span>
      </div>

      {/* Job category label */}
      {ro.jobCategory && (
        <div className="mt-0.5">
          <span
            className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
            style={{ color: categoryColor, backgroundColor: `${categoryColor}22` }}
          >
            {ro.jobCategory}
          </span>
        </div>
      )}
    </div>
  );
};

export default CalendarEventCard;
