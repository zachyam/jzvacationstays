import { useState } from "react";

type AvailabilityCalendarProps = {
  blockedDates?: string[];
  onSelectDates?: (checkIn: string, checkOut: string) => void;
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

export function AvailabilityCalendar({
  blockedDates = [],
  onSelectDates,
}: AvailabilityCalendarProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);

  const blockedSet = new Set(blockedDates);
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

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
    if (blockedSet.has(dateStr)) return;

    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(dateStr);
      setCheckOut(null);
    } else {
      if (dateStr < checkIn) {
        setCheckIn(dateStr);
        setCheckOut(null);
      } else {
        setCheckOut(dateStr);
        onSelectDates?.(checkIn, dateStr);
      }
    }
  }

  function isInRange(dateStr: string) {
    if (!checkIn || !checkOut) return false;
    return dateStr > checkIn && dateStr < checkOut;
  }

  const todayStr = formatDateStr(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-600"
        >
          ←
        </button>
        <h4 className="font-medium text-stone-900">
          {MONTHS[currentMonth]} {currentYear}
        </h4>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-600"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs text-stone-400 font-medium py-2"
          >
            {day}
          </div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = formatDateStr(currentYear, currentMonth, day);
          const isBlocked = blockedSet.has(dateStr);
          const isPast = dateStr < todayStr;
          const isCheckIn = dateStr === checkIn;
          const isCheckOut = dateStr === checkOut;
          const inRange = isInRange(dateStr);
          const isDisabled = isBlocked || isPast;

          return (
            <button
              key={day}
              disabled={isDisabled}
              onClick={() => handleDayClick(dateStr)}
              className={`
                aspect-square flex items-center justify-center text-sm rounded-lg transition-all
                ${isDisabled ? "text-stone-300 cursor-not-allowed line-through" : "hover:bg-sky-50 cursor-pointer"}
                ${isCheckIn || isCheckOut ? "bg-sky-600 text-white font-medium" : ""}
                ${inRange ? "bg-sky-100 text-sky-800" : ""}
                ${!isDisabled && !isCheckIn && !isCheckOut && !inRange ? "text-stone-700" : ""}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      {checkIn && (
        <div className="mt-4 pt-4 border-t border-stone-100 text-sm text-stone-600">
          <span className="font-medium">Check-in:</span> {checkIn}
          {checkOut && (
            <>
              {" "}&rarr;{" "}
              <span className="font-medium">Check-out:</span> {checkOut}
            </>
          )}
        </div>
      )}
    </div>
  );
}
