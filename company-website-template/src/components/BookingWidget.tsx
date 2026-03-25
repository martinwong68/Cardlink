"use client";

import { useState } from "react";
import type { BookingService, BookingSettings, BookingSlot } from "@/lib/cardlink-api";
import { fetchBookingSlots, createBooking } from "@/lib/cardlink-api";

type Props = {
  services: BookingService[];
  settings: BookingSettings;
  primaryColor: string;
};

export default function BookingWidget({ services, settings, primaryColor }: Props) {
  const [selectedService, setSelectedService] = useState<BookingService | null>(null);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [status, setStatus] = useState<"idle" | "booking" | "booked" | "error">("idle");
  const [resultMessage, setResultMessage] = useState("");

  const loadSlots = async (serviceId: string, selectedDate: string) => {
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);
    const data = await fetchBookingSlots(serviceId, selectedDate);
    setSlots(data.slots ?? []);
    setLoadingSlots(false);
  };

  const handleSelectService = (svc: BookingService) => {
    setSelectedService(svc);
    setDate("");
    setSlots([]);
    setSelectedSlot(null);
    setStatus("idle");
  };

  const handleDateChange = (d: string) => {
    setDate(d);
    if (selectedService && d) void loadSlots(selectedService.id, d);
  };

  const handleBook = async () => {
    if (!selectedService || !selectedSlot || !form.name) return;
    setStatus("booking");
    const result = await createBooking({
      service_id: selectedService.id,
      customer_name: form.name,
      customer_email: form.email || undefined,
      customer_phone: form.phone || undefined,
      date,
      start_time: selectedSlot.start,
      notes: form.notes || undefined,
    });
    if (result.appointment) {
      setStatus("booked");
      setResultMessage(result.message ?? "Booking confirmed!");
    } else {
      setStatus("error");
      setResultMessage(result.error ?? "Booking failed. Please try another time.");
    }
  };

  if (status === "booked") {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">📅</div>
        <h3 className="text-lg font-semibold text-gray-900">{resultMessage}</h3>
        <p className="mt-2 text-sm text-gray-500">
          {selectedService?.name} on {date} at {selectedSlot?.start}
        </p>
        <button
          onClick={() => { setStatus("idle"); setSelectedService(null); setDate(""); setSlots([]); setSelectedSlot(null); setForm({ name: "", email: "", phone: "", notes: "" }); }}
          className="mt-4 text-sm font-medium hover:underline"
          style={{ color: primaryColor }}
        >
          Book another appointment
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Service selection */}
      {!selectedService ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {services.map((svc) => (
            <button
              key={svc.id}
              onClick={() => handleSelectService(svc)}
              className="text-left rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition"
            >
              {svc.image_url && <img src={svc.image_url} alt={svc.name} className="h-32 w-full object-cover rounded-lg mb-3" />}
              <h3 className="font-semibold text-gray-900">{svc.name}</h3>
              {svc.description && <p className="mt-1 text-sm text-gray-500 line-clamp-2">{svc.description}</p>}
              <div className="mt-2 flex items-center gap-3 text-sm text-gray-600">
                <span>{svc.duration_minutes} min</span>
                {svc.price > 0 && <span className="font-semibold" style={{ color: primaryColor }}>${Number(svc.price).toFixed(2)}</span>}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <button onClick={() => setSelectedService(null)} className="text-sm text-gray-500 hover:text-gray-700">← Back to services</button>
          <h3 className="text-lg font-semibold text-gray-900">{selectedService.name}</h3>
          <p className="text-sm text-gray-500">{selectedService.duration_minutes} min · ${Number(selectedService.price).toFixed(2)}</p>

          {/* Date picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => handleDateChange(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>

          {/* Time slots */}
          {date && (
            loadingSlots ? (
              <p className="text-sm text-gray-400">Loading available times...</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-gray-400">No available slots for this date.</p>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Available Times</label>
                <div className="flex flex-wrap gap-2">
                  {slots.map((slot, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedSlot(slot)}
                      className={`rounded-lg border px-4 py-2 text-sm transition ${
                        selectedSlot?.start === slot.start
                          ? "border-transparent text-white"
                          : "border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                      style={selectedSlot?.start === slot.start ? { backgroundColor: primaryColor } : {}}
                    >
                      {slot.start}
                    </button>
                  ))}
                </div>
              </div>
            )
          )}

          {/* Customer info & book */}
          {selectedSlot && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <input
                type="text"
                placeholder="Your name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
              />
              {settings.require_email && (
                <input
                  type="email"
                  placeholder="Email *"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                />
              )}
              {settings.require_phone && (
                <input
                  type="tel"
                  placeholder="Phone *"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                />
              )}
              <textarea
                placeholder="Notes (optional)"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
              />
              {status === "error" && <p className="text-sm text-red-500">{resultMessage}</p>}
              <button
                onClick={handleBook}
                disabled={status === "booking" || !form.name}
                className="w-full rounded-lg py-3 text-sm font-medium text-white disabled:opacity-50 transition"
                style={{ backgroundColor: primaryColor }}
              >
                {status === "booking" ? "Booking..." : "Confirm Booking"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
