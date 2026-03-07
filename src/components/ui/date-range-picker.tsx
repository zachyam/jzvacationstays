import { useState, useRef, useEffect } from "react";
import { formatDate } from "../../lib/utils";

type DateRangePickerProps = {
  checkIn: string | null;
  checkOut: string | null;
  onDateChange: (checkIn: string, checkOut: string) => void;
  minDate?: string;
  blockedDates?: string[];
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function formatDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function DateRangePicker({
  checkIn,
  checkOut,
  onDateChange,
  minDate,
  blockedDates = [],
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [tempCheckIn, setTempCheckIn] = useState<string | null>(checkIn);
  const [tempCheckOut, setTempCheckOut] = useState<string | null>(checkOut);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const blockedSet = new Set(blockedDates);
  const today = new Date();
  const todayStr = formatDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const minDateStr = minDate || todayStr;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function goToToday() {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  }

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  }

  function handleDayClick(dateStr: string) {
    if (blockedSet.has(dateStr) || dateStr < minDateStr) return;

    if (!tempCheckIn || (tempCheckIn && tempCheckOut)) {
      setTempCheckIn(dateStr);
      setTempCheckOut(null);
    } else {
      if (dateStr < tempCheckIn) {
        setTempCheckIn(dateStr);
        setTempCheckOut(null);
      } else {
        setTempCheckOut(dateStr);
        onDateChange(tempCheckIn, dateStr);
        setIsOpen(false);
      }
    }
  }

  function isInRange(dateStr: string) {
    if (!tempCheckIn || !tempCheckOut) return false;
    return dateStr > tempCheckIn && dateStr < tempCheckOut;
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  // Generate calendar days including previous/next month overflow
  const prevMonthDays = [];
  const prevMonthIndex = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonthIndex);

  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    prevMonthDays.push({
      day,
      dateStr: formatDateStr(prevYear, prevMonthIndex, day),
      isCurrentMonth: false,
    });
  }

  const currentMonthDays = [];
  for (let day = 1; day <= daysInMonth; day++) {
    currentMonthDays.push({
      day,
      dateStr: formatDateStr(currentYear, currentMonth, day),
      isCurrentMonth: true,
    });
  }

  const nextMonthDays = [];
  const totalCells = 42; // 6 weeks * 7 days
  const remainingCells = totalCells - prevMonthDays.length - currentMonthDays.length;
  const nextMonthIndex = currentMonth === 11 ? 0 : currentMonth + 1;
  const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

  for (let day = 1; day <= remainingCells; day++) {
    nextMonthDays.push({
      day,
      dateStr: formatDateStr(nextYear, nextMonthIndex, day),
      isCurrentMonth: false,
    });
  }

  const allDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-white border border-stone-200 px-4 py-2.5 rounded-xl shadow-sm hover:border-stone-300 transition-all text-stone-900 font-medium focus:ring-2 focus:ring-sky-500/20 focus:outline-none w-full justify-start"
      >
        <iconify-icon icon="solar:calendar-linear" class="text-stone-400 text-lg" />
        <span className="flex-1 text-left">
          {checkIn && checkOut ? (
            <>
              <span>{formatDate(checkIn)}</span>
              <iconify-icon icon="solar:arrow-right-linear" class="text-stone-400 text-lg mx-2 inline" />
              <span>{formatDate(checkOut)}</span>
            </>
          ) : (
            <span className="text-stone-500">Select dates</span>
          )}
        </span>
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          className="absolute top-full left-0 mt-3 w-[21.25rem] bg-white border border-stone-200 rounded-[1.5rem] p-6 shadow-2xl shadow-stone-200/50 z-50"
        >
          {/* Header */}
          <div className="grid grid-cols-3 items-center mb-5 px-1">
            <div className="justify-self-start">
              <button
                onClick={goToToday}
                className="text-sm text-stone-500 hover:text-stone-900 transition-colors font-medium"
              >
                Today
              </button>
            </div>
            <div className="justify-self-center">
              <span className="text-xl font-medium tracking-tight text-stone-900 whitespace-nowrap">
                {MONTHS[currentMonth]} {currentYear}
              </span>
            </div>
            <div className="flex items-center gap-3 justify-self-end text-stone-500">
              <button
                onClick={prevMonth}
                className="hover:text-stone-900 transition-colors flex items-center justify-center p-1"
              >
                <iconify-icon icon="solar:alt-arrow-left-linear" class="text-xl" />
              </button>
              <button
                onClick={nextMonth}
                className="hover:text-stone-900 transition-colors flex items-center justify-center p-1"
              >
                <iconify-icon icon="solar:alt-arrow-right-linear" class="text-xl" />
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px w-full bg-stone-200 mb-5" />

          {/* Days of Week */}
          <div className="grid grid-cols-7 mb-3 text-center">
            {DAYS.map((day) => (
              <span key={day} className="text-sm font-medium text-stone-500">
                {day}
              </span>
            ))}
          </div>

          {/* Dates Grid */}
          <div className="grid grid-cols-7 gap-y-2 text-center">
            {allDays.map(({ day, dateStr, isCurrentMonth }, index) => {
              const isBlocked = blockedSet.has(dateStr);
              const isPast = dateStr < minDateStr;
              const isCheckIn = dateStr === tempCheckIn;
              const isCheckOut = dateStr === tempCheckOut;
              const inRange = isInRange(dateStr);
              const isDisabled = isBlocked || isPast;

              return (
                <button
                  key={index}
                  disabled={isDisabled}
                  onClick={() => handleDayClick(dateStr)}
                  className={`w-10 h-10 mx-auto flex items-center justify-center rounded-full text-base font-medium transition-colors ${
                    !isCurrentMonth
                      ? "text-stone-400 hover:bg-stone-100 hover:text-stone-900"
                      : isDisabled
                        ? "text-stone-300 cursor-not-allowed"
                        : isCheckIn || isCheckOut
                          ? "bg-sky-500 text-white shadow-md hover:bg-sky-400"
                          : inRange
                            ? "bg-sky-100 text-sky-700"
                            : "text-stone-900 hover:bg-stone-100"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}