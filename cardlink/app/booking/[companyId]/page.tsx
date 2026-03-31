"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Calendar, Clock, Loader2, ChevronLeft, Check, User, Mail, Phone, FileText } from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  category: string | null;
};

type TimeSlot = { start: string; end: string };

type BookingSettings = {
  booking_page_title: string | null;
  booking_page_description: string | null;
};

export default function PublicBookingPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [supabase] = useState(() => createClient());

  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<BookingSettings>({ booking_page_title: null, booking_page_description: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking flow
  const [step, setStep] = useState<"services" | "date" | "form" | "success">("services");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Customer form
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [servicesRes, settingsRes] = await Promise.all([
        supabase
          .from("booking_services")
          .select("id, name, description, duration_minutes, price, category")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("booking_settings")
          .select("booking_page_title, booking_page_description")
          .eq("company_id", companyId)
          .maybeSingle(),
      ]);
      setServices((servicesRes.data ?? []) as Service[]);
      if (settingsRes.data) setSettings(settingsRes.data as BookingSettings);
    } catch {
      setError("Failed to load booking services.");
    }
    setLoading(false);
  }, [companyId, supabase]);

  useEffect(() => {
    if (companyId) void loadData();
  }, [companyId, loadData]);

  const loadSlots = useCallback(async (serviceId: string, date: string) => {
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const res = await fetch(`/api/public/booking/slots?company_id=${companyId}&service_id=${serviceId}&date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setSlots((data.slots ?? []) as TimeSlot[]);
      }
    } catch {
      /* silent */
    }
    setLoadingSlots(false);
  }, [companyId]);

  const handleSelectService = (svc: Service) => {
    setSelectedService(svc);
    setStep("date");
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    if (selectedService) void loadSlots(selectedService.id, date);
  };

  const handleSelectSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setStep("form");
  };

  const handleSubmit = async () => {
    if (!selectedService || !selectedSlot || !customerName.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/booking/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          service_id: selectedService.id,
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim() || undefined,
          customer_phone: customerPhone.trim() || undefined,
          date: selectedDate,
          start_time: selectedSlot.start,
          notes: notes.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBookingResult(data.message ?? "Booking confirmed!");
        setStep("success");
      } else {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Booking failed.");
      }
    } catch {
      setError("Failed to submit booking.");
    }
    setSubmitting(false);
  };

  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="mt-3 text-sm text-gray-500">Loading booking…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-lg px-4 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Calendar className="h-10 w-10 text-indigo-500 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">
            {settings.booking_page_title || "Book an Appointment"}
          </h1>
          {settings.booking_page_description && (
            <p className="mt-2 text-gray-600">{settings.booking_page_description}</p>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Step: Select Service */}
        {step === "services" && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Select a Service</h2>
            {services.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No services available for booking.</p>
            ) : (
              services.map((svc) => (
                <button
                  key={svc.id}
                  onClick={() => handleSelectService(svc)}
                  className="w-full text-left rounded-2xl border border-gray-100 bg-white p-4 hover:border-indigo-200 hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{svc.name}</p>
                      {svc.description && <p className="text-xs text-gray-500 mt-0.5">{svc.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{svc.duration_minutes} min</span>
                        {svc.category && <span className="bg-gray-100 rounded-full px-2 py-0.5">{svc.category}</span>}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-indigo-600">${svc.price.toFixed(2)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Step: Select Date + Time */}
        {step === "date" && selectedService && (
          <div className="space-y-4">
            <button onClick={() => { setStep("services"); setSelectedService(null); }} className="flex items-center gap-1 text-sm text-indigo-600 font-medium hover:text-indigo-700">
              <ChevronLeft className="h-4 w-4" /> Back to Services
            </button>

            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="text-sm font-semibold text-gray-900">{selectedService.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{selectedService.duration_minutes} min · ${selectedService.price.toFixed(2)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Date</label>
              <input
                type="date"
                min={today}
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
              />
            </div>

            {selectedDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Available Times</label>
                {loadingSlots ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-indigo-400" /></div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">No available slots for this date.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot.start}
                        onClick={() => handleSelectSlot(slot)}
                        className={`rounded-xl border py-2.5 text-sm font-medium transition ${
                          selectedSlot?.start === slot.start
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                            : "border-gray-200 text-gray-700 hover:border-indigo-200"
                        }`}
                      >
                        {slot.start}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step: Customer Info Form */}
        {step === "form" && selectedService && selectedSlot && (
          <div className="space-y-4">
            <button onClick={() => setStep("date")} className="flex items-center gap-1 text-sm text-indigo-600 font-medium hover:text-indigo-700">
              <ChevronLeft className="h-4 w-4" /> Back to Time Selection
            </button>

            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="text-sm font-semibold text-gray-900">{selectedService.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                {" "} at {selectedSlot.start} · {selectedService.duration_minutes} min · ${selectedService.price.toFixed(2)}
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Your Information</h3>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                  <User className="h-3 w-3" /> Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                  <Mail className="h-3 w-3" /> Email
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                  <Phone className="h-3 w-3" /> Phone
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                  <FileText className="h-3 w-3" /> Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes…"
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm resize-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                />
              </div>
            </div>

            <button
              onClick={() => void handleSubmit()}
              disabled={submitting || !customerName.trim()}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
              Confirm Booking
            </button>
          </div>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <div className="flex flex-col items-center text-center py-10">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Booking Confirmed!</h2>
            <p className="text-sm text-gray-600 mt-2">{bookingResult}</p>
            <button
              onClick={() => {
                setStep("services");
                setSelectedService(null);
                setSelectedDate("");
                setSelectedSlot(null);
                setCustomerName("");
                setCustomerEmail("");
                setCustomerPhone("");
                setNotes("");
                setBookingResult(null);
              }}
              className="mt-6 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              Book Another
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-xs text-gray-400">
            Powered by <a href="/" className="font-medium text-indigo-500 hover:text-indigo-600">Cardlink</a>
          </p>
        </div>
      </div>
    </div>
  );
}
