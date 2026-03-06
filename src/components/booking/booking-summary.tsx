import { formatCurrency, formatDate } from "../../lib/utils";

type BookingSummaryProps = {
  propertyName: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  nights: number;
  cleaningFee: number;
  totalAmount: number;
};

export function BookingSummary({
  propertyName,
  checkIn,
  checkOut,
  guestsCount,
  nights,
  cleaningFee,
  totalAmount,
}: BookingSummaryProps) {
  return (
    <div className="bg-white/90 backdrop-blur-xl border border-stone-200 rounded-2xl p-6 space-y-4">
      <h3 className="text-lg font-medium text-stone-900">Booking summary</h3>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-stone-500">Property</span>
          <span className="text-stone-900 font-medium">{propertyName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">Check-in</span>
          <span className="text-stone-900">{formatDate(checkIn)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">Check-out</span>
          <span className="text-stone-900">{formatDate(checkOut)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">Guests</span>
          <span className="text-stone-900">{guestsCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">{nights} night{nights !== 1 ? "s" : ""}</span>
          <span className="text-stone-900">
            {formatCurrency(totalAmount - cleaningFee)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">Cleaning fee</span>
          <span className="text-stone-900">{formatCurrency(cleaningFee)}</span>
        </div>
      </div>

      <div className="border-t border-stone-200 pt-3 flex justify-between text-base font-medium">
        <span className="text-stone-900">Total</span>
        <span className="text-stone-900">{formatCurrency(totalAmount)}</span>
      </div>
    </div>
  );
}
