"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "./Field";

// Helper to format Date to YYYY-MM-DD (date-only, timezone-agnostic)
function formatDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Helper to build a local timezone offset string, e.g. "+01:00" or "-05:30"
function tzOffset(d: Date): string {
  const raw = -d.getTimezoneOffset(); // getTimezoneOffset() is inverted
  const sign = raw >= 0 ? "+" : "-";
  const abs = Math.abs(raw);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${sign}${hh}:${mm}`;
}

// Helper to format Date to ISO 8601 with local timezone offset
// e.g. "2026-08-01T15:55:00+01:00" — the server can store the correct UTC.
function formatDateTimeString(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${day}T${h}:${min}:00${tzOffset(d)}`;
}

// Parse helper — handles YYYY-MM-DD, YYYY-MM-DDTHH:MM, and full ISO offsets
function parseDate(val?: string): Date {
  if (!val) return new Date();
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
}

export function DatePicker({
  id,
  name,
  label,
  value = "",
  onChange,
  error,
  required,
  className,
}: {
  id?: string;
  name?: string;
  label?: string;
  value?: string;
  onChange?: (val: string) => void;
  error?: string;
  required?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? parseDate(value) : null;
  const [viewDate, setViewDate] = useState(() => (selectedDate ? new Date(selectedDate) : new Date()));

  // Close calendar popover on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const daysList: { day: number; currentMonth: boolean; date: Date }[] = [];

  // Padding days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dNum = daysInPrevMonth - i;
    daysList.push({
      day: dNum,
      currentMonth: false,
      date: new Date(year, month - 1, dNum),
    });
  }

  // Days in current month
  for (let i = 1; i <= daysInMonth; i++) {
    daysList.push({
      day: i,
      currentMonth: true,
      date: new Date(year, month, i),
    });
  }

  // Padding days from next month to round grid to complete weeks
  const totalSlots = Math.ceil(daysList.length / 7) * 7;
  const nextMonthDaysCount = totalSlots - daysList.length;
  for (let i = 1; i <= nextMonthDaysCount; i++) {
    daysList.push({
      day: i,
      currentMonth: false,
      date: new Date(year, month + 1, i),
    });
  }

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (d: Date) => {
    const str = formatDateString(d);
    onChange?.(str);
    setIsOpen(false);
  };

  const formattedDisplay = selectedDate
    ? selectedDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "Select date";

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <input type="hidden" name={name} id={id} value={value} required={required} />
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full rounded-2xl border bg-white px-4 h-12 flex items-center justify-between text-left text-[15px] outline-none transition-colors",
          error ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500" : "border-black/[0.12] focus:border-brand",
          !value && "text-muted/60"
        )}
      >
        <span>{formattedDisplay}</span>
        <svg className="h-5 w-5 text-muted/85" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 z-35 w-[290px] rounded-2xl border border-black/[0.08] bg-white shadow-xl p-4 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={handlePrevMonth} className="p-1 rounded-lg hover:bg-black/[0.04] text-muted hover:text-brand-dark transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-brand-dark">
              {viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
            <button type="button" onClick={handleNextMonth} className="p-1 rounded-lg hover:bg-black/[0.04] text-muted hover:text-brand-dark transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted mb-1.5 uppercase">
            <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {daysList.map((dItem, idx) => {
              const isSelected = selectedDate && formatDateString(dItem.date) === formatDateString(selectedDate);
              const isToday = formatDateString(dItem.date) === formatDateString(new Date());

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(dItem.date)}
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center font-medium transition-colors focus:outline-none",
                    !dItem.currentMonth && "text-muted/40",
                    dItem.currentMonth && !isSelected && "text-brand-dark hover:bg-mint/45",
                    isSelected && "bg-brand text-white",
                    isToday && !isSelected && "border border-brand text-brand"
                  )}
                >
                  {dItem.day}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="mt-1.5 text-xs text-red-600 font-medium leading-relaxed">{error}</p>}
    </div>
  );
}

export function DateTimePicker({
  id,
  name,
  label,
  defaultValue = "",
  value: controlledValue,
  onChange,
  error,
  required,
  className,
}: {
  id?: string;
  name?: string;
  label?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (val: string) => void;
  error?: string;
  required?: boolean;
  className?: string;
}) {
  const [val, setVal] = useState(controlledValue ?? defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = parseDate(val);
  const [viewDate, setViewDate] = useState(() => new Date(selectedDate));

  useEffect(() => {
    if (controlledValue !== undefined) {
      setVal(controlledValue);
    }
  }, [controlledValue]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const daysList: { day: number; currentMonth: boolean; date: Date }[] = [];

  // Padding days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dNum = daysInPrevMonth - i;
    daysList.push({
      day: dNum,
      currentMonth: false,
      date: new Date(year, month - 1, dNum),
    });
  }

  // Days in current month
  for (let i = 1; i <= daysInMonth; i++) {
    daysList.push({
      day: i,
      currentMonth: true,
      date: new Date(year, month, i),
    });
  }

  const totalSlots = Math.ceil(daysList.length / 7) * 7;
  const nextMonthDaysCount = totalSlots - daysList.length;
  for (let i = 1; i <= nextMonthDaysCount; i++) {
    daysList.push({
      day: i,
      currentMonth: false,
      date: new Date(year, month + 1, i),
    });
  }

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (d: Date) => {
    // Preserve current hours/minutes
    const hour = selectedDate.getHours();
    const min = selectedDate.getMinutes();
    const newD = new Date(d);
    newD.setHours(hour);
    newD.setMinutes(min);
    
    const str = formatDateTimeString(newD);
    setVal(str);
    onChange?.(str);
  };

  const handleTimeChange = (type: "h" | "m", v: number) => {
    const newD = new Date(selectedDate);
    if (type === "h") {
      newD.setHours(v);
    } else {
      newD.setMinutes(v);
    }
    const str = formatDateTimeString(newD);
    setVal(str);
    onChange?.(str);
  };

  const formattedDisplay = selectedDate
    ? selectedDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "Select date & time";

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <input type="hidden" name={name} id={id} value={val} required={required} />

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full rounded-2xl border bg-white px-4 h-12 flex items-center justify-between text-left text-[15px] outline-none transition-colors",
          error ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500" : "border-black/[0.12] focus:border-brand",
          !val && "text-muted/60"
        )}
      >
        <span>{formattedDisplay}</span>
        <svg className="h-5 w-5 text-muted/85" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 z-35 w-[300px] rounded-2xl border border-black/[0.08] bg-white shadow-xl p-4 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={handlePrevMonth} className="p-1 rounded-lg hover:bg-black/[0.04] text-muted hover:text-brand-dark transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-brand-dark">
              {viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
            <button type="button" onClick={handleNextMonth} className="p-1 rounded-lg hover:bg-black/[0.04] text-muted hover:text-brand-dark transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted mb-1.5 uppercase">
            <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs pb-3 border-b border-black/[0.05]">
            {daysList.map((dItem, idx) => {
              const isSelected = selectedDate && formatDateString(dItem.date) === formatDateString(selectedDate);
              const isToday = formatDateString(dItem.date) === formatDateString(new Date());

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(dItem.date)}
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center font-medium transition-colors focus:outline-none",
                    !dItem.currentMonth && "text-muted/40",
                    dItem.currentMonth && !isSelected && "text-brand-dark hover:bg-mint/45",
                    isSelected && "bg-brand text-white",
                    isToday && !isSelected && "border border-brand text-brand"
                  )}
                >
                  {dItem.day}
                </button>
              );
            })}
          </div>

          {/* Time Picker Controls */}
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="font-semibold text-brand-dark">Time (24h)</span>
            <div className="flex items-center gap-1">
              {/* Hour select */}
              <select
                value={selectedDate.getHours()}
                onChange={(e) => handleTimeChange("h", Number(e.target.value))}
                className="rounded-lg border border-black/[0.12] bg-white px-2 py-1 outline-none text-brand-dark font-medium"
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <option key={i} value={i}>
                    {String(i).padStart(2, "0")}
                  </option>
                ))}
              </select>
              <span className="text-muted font-bold">:</span>
              {/* Minute select */}
              <select
                value={selectedDate.getMinutes()}
                onChange={(e) => handleTimeChange("m", Number(e.target.value))}
                className="rounded-lg border border-black/[0.12] bg-white px-2 py-1 outline-none text-brand-dark font-medium"
              >
                {Array.from({ length: 60 }).map((_, i) => (
                  <option key={i} value={i}>
                    {String(i).padStart(2, "0")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {error && <p className="mt-1.5 text-xs text-red-600 font-medium leading-relaxed">{error}</p>}
    </div>
  );
}
