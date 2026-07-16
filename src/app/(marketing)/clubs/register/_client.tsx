"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { authClient } from "@/lib/auth/client";
import {
  geocodeAddressAction,
  submitRegistrationAction,
  getRegistrationLogoUploadUrl,
  confirmLogoUploadAction,
} from "./actions";
import type { TrainingSlotInput } from "@modules/team";

const LocationMap = dynamic(() => import("./_location-map"), { ssr: false });

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Step = 1 | 2 | 3 | 4;

type ClubInfo = {
  name: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
};

type LocationState = {
  lat: number;
  lng: number;
  address: string;
};

type GeoResult = {
  display_name: string;
  lat: string;
  lon: string;
};

function StepIndicator({ step }: { step: Step }) {
  const steps: { n: Step; label: string }[] = [
    { n: 1, label: "Club Info" },
    { n: 2, label: "Location" },
    { n: 3, label: "Training" },
    { n: 4, label: "Verify" },
  ];
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                step === s.n
                  ? "bg-primary text-primary-foreground border-primary"
                  : step > s.n
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-card text-muted-foreground border-border"
              }`}
            >
              {step > s.n ? "✓" : s.n}
            </div>
            <span
              className={`text-[10px] mt-1 font-medium ${
                step === s.n ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-10 h-0.5 mx-1 mb-4 ${
                step > s.n ? "bg-accent" : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function RegisterWizard() {
  const [step, setStep] = useState<Step>(1);
  const [clubInfo, setClubInfo] = useState<ClubInfo>({
    name: "",
    description: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationState | null>(null);
  const [trainingSlots, setTrainingSlots] = useState<TrainingSlotInput[]>([]);
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 state
  const [addressQuery, setAddressQuery] = useState("");
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);

  function handleClubInfoChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setClubInfo((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
  }

  function handleStep1Next() {
    if (!clubInfo.name.trim()) {
      setError("Club name is required.");
      return;
    }
    setError(null);
    setStep(2);
  }

  async function handleAddressSearch() {
    if (!addressQuery.trim()) return;
    setGeoLoading(true);
    setGeoResults([]);
    const results = await geocodeAddressAction(addressQuery);
    setGeoResults(results);
    setGeoLoading(false);
  }

  function handleSelectGeoResult(result: GeoResult) {
    setLocation({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      address: result.display_name,
    });
    setGeoResults([]);
    setAddressQuery(result.display_name);
  }

  function handleLocationChange(lat: number, lng: number) {
    setLocation((prev) =>
      prev ? { ...prev, lat, lng } : { lat, lng, address: "" }
    );
  }

  function addSlot() {
    setTrainingSlots((prev) => [
      ...prev,
      { dayOfWeek: 5, startTime: "09:00", endTime: "11:00", venue: undefined },
    ]);
  }

  function updateSlot(
    index: number,
    field: keyof TrainingSlotInput,
    value: string | number
  ) {
    setTrainingSlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot))
    );
  }

  function removeSlot(index: number) {
    setTrainingSlots((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSendOtp() {
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    setIsLoading(true);
    setError(null);
    const result = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    });
    setIsLoading(false);
    if (result.error) {
      setError(result.error.message ?? "Failed to send verification code.");
      return;
    }
    setOtpSent(true);
  }

  async function handleVerifyAndCreate() {
    if (!otp.trim()) {
      setError("Please enter the verification code.");
      return;
    }
    setIsLoading(true);
    setError(null);

    // 1. Verify OTP
    const signInResult = await authClient.signIn.emailOtp({ email, otp });
    if (signInResult.error) {
      setIsLoading(false);
      setError(signInResult.error.message ?? "Invalid verification code.");
      return;
    }

    // 2. Create team
    const result = await submitRegistrationAction({
      name: clubInfo.name,
      description: clubInfo.description || undefined,
      contactEmail: clubInfo.contactEmail || undefined,
      contactPhone: clubInfo.contactPhone || undefined,
      lat: location?.lat,
      lng: location?.lng,
      address: location?.address,
      trainingSlots,
    });

    if (!result.ok) {
      setIsLoading(false);
      setError(result.error);
      return;
    }

    // 3. Upload logo if provided (non-blocking — logo is optional)
    if (logoFile) {
      try {
        const contentType = logoFile.type || "image/jpeg";
        const uploadUrl = await getRegistrationLogoUploadUrl(
          result.teamId,
          contentType
        );
        await fetch(uploadUrl, {
          method: "PUT",
          body: logoFile,
          headers: { "Content-Type": contentType },
        });
        await confirmLogoUploadAction(result.teamId, contentType);
      } catch {
        // Logo upload failed — not blocking, team already created
      }
    }

    setIsLoading(false);

    // 4. Redirect to TM portal
    const tmUrl =
      process.env.NODE_ENV === "development"
        ? "http://app.localhost.skrammm.com:3000/tm"
        : "https://app.skrammm.com/tm";
    window.location.href = tmUrl;
  }

  return (
    <div className="bg-card border-2 border-primary/20 rounded-lg p-6 shadow-brutalist-navy">
      <StepIndicator step={step} />

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded px-3 py-2">
          {error}
        </div>
      )}

      {/* Step 1 — Club Info + Logo */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="font-[family-name:var(--font-lexend)] font-extrabold tracking-tight text-lg">
            Club Information
          </h2>

          {/* Logo upload */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Club logo{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-full border-2 border-dashed border-border hover:border-primary transition-colors overflow-hidden bg-muted flex items-center justify-center flex-shrink-0"
              >
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl text-muted-foreground/50">+</span>
                )}
              </button>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Tap to upload your club crest or logo.</p>
                <p>JPG, PNG or WebP. Shown on the map and directory.</p>
                {logoPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoFile(null);
                      setLogoPreview(null);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Club name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={clubInfo.name}
              onChange={handleClubInfoChange}
              placeholder="e.g. KL Rhinos RFC"
              className="w-full border-2 border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Description{" "}
              <span className="text-muted-foreground text-xs">
                (optional, max 500 chars)
              </span>
            </label>
            <textarea
              name="description"
              value={clubInfo.description}
              onChange={handleClubInfoChange}
              rows={3}
              maxLength={500}
              placeholder="Tell players about your club…"
              className="w-full border-2 border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Contact email{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </label>
            <input
              type="email"
              name="contactEmail"
              value={clubInfo.contactEmail}
              onChange={handleClubInfoChange}
              placeholder="coach@yourclub.com"
              className="w-full border-2 border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Contact phone{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </label>
            <input
              type="tel"
              name="contactPhone"
              value={clubInfo.contactPhone}
              onChange={handleClubInfoChange}
              placeholder="+60 12-345 6789"
              className="w-full border-2 border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={handleStep1Next}
            className="w-full bg-primary text-primary-foreground font-bold py-2.5 rounded shadow-brutalist-navy-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
          >
            Next →
          </button>
        </div>
      )}

      {/* Step 2 — Location */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="font-[family-name:var(--font-lexend)] font-extrabold tracking-tight text-lg">
            Location
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={addressQuery}
              onChange={(e) => setAddressQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleAddressSearch()}
              placeholder="Search for an address or venue…"
              className="flex-1 border-2 border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
            <button
              onClick={() => void handleAddressSearch()}
              disabled={geoLoading}
              className="bg-primary text-primary-foreground font-bold px-4 py-2 rounded text-sm disabled:opacity-50"
            >
              {geoLoading ? "…" : "Search"}
            </button>
          </div>

          {geoResults.length > 0 && (
            <ul className="border rounded divide-y text-sm max-h-48 overflow-y-auto">
              {geoResults.map((r, i) => (
                <li key={i}>
                  <button
                    onClick={() => handleSelectGeoResult(r)}
                    className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                  >
                    {r.display_name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {location && (
            <div>
              <div className="h-52 rounded border overflow-hidden">
                <LocationMap
                  lat={location.lat}
                  lng={location.lng}
                  onChange={handleLocationChange}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Drag the pin to fine-tune the location.
              </p>
              <p className="text-xs text-foreground mt-1 font-medium truncate">
                📍 {location.address}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setStep(1)}
              className="flex-1 border-2 border-border text-foreground font-bold py-2.5 rounded hover:bg-muted transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => {
                setError(null);
                setStep(3);
              }}
              className="flex-1 bg-primary text-primary-foreground font-bold py-2.5 rounded shadow-brutalist-navy-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
            >
              Next →
            </button>
          </div>
          {!location && (
            <p className="text-xs text-muted-foreground text-center">
              Location is optional — you can skip this step.
            </p>
          )}
        </div>
      )}

      {/* Step 3 — Training Schedule */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="font-[family-name:var(--font-lexend)] font-extrabold tracking-tight text-lg">
            Training Schedule
          </h2>
          <p className="text-muted-foreground text-sm">
            Add your regular training sessions. You can edit these later.
          </p>

          {trainingSlots.length > 0 && (
            <div className="space-y-2">
              {trainingSlots.map((slot, i) => (
                <div
                  key={i}
                  className="border rounded p-3 flex flex-wrap gap-2 items-start"
                >
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      Day
                    </label>
                    <select
                      value={slot.dayOfWeek}
                      onChange={(e) =>
                        updateSlot(i, "dayOfWeek", parseInt(e.target.value))
                      }
                      className="border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-primary"
                    >
                      {DAY_NAMES.map((d, idx) => (
                        <option key={d} value={idx}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      Start
                    </label>
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => updateSlot(i, "startTime", e.target.value)}
                      className="border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      End
                    </label>
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => updateSlot(i, "endTime", e.target.value)}
                      className="border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      Venue (optional)
                    </label>
                    <input
                      type="text"
                      value={slot.venue ?? ""}
                      onChange={(e) => updateSlot(i, "venue", e.target.value)}
                      placeholder="Field name or address"
                      className="border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <button
                      onClick={() => removeSlot(i)}
                      className="text-red-500 hover:text-red-700 text-sm font-bold px-2 py-1.5 mt-4"
                      title="Remove slot"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={addSlot}
            className="w-full border-2 border-dashed border-border rounded py-2 text-sm text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
          >
            + Add training slot
          </button>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setStep(2)}
              className="flex-1 border-2 border-border text-foreground font-bold py-2.5 rounded hover:bg-muted transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => {
                setError(null);
                setStep(4);
              }}
              className="flex-1 bg-primary text-primary-foreground font-bold py-2.5 rounded shadow-brutalist-navy-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 4 — Verify Email */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="font-[family-name:var(--font-lexend)] font-extrabold tracking-tight text-lg">
            Verify Email
          </h2>

          {/* Summary */}
          <div className="bg-muted rounded p-3 text-sm space-y-2">
            <div className="flex items-center gap-3">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo"
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-border"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-lg flex-shrink-0">
                  {clubInfo.name[0] ?? "?"}
                </div>
              )}
              <div>
                <p className="font-semibold text-foreground">{clubInfo.name}</p>
                {location?.address && (
                  <p className="text-muted-foreground text-xs truncate">
                    📍 {location.address}
                  </p>
                )}
                <p className="text-muted-foreground text-xs">
                  {trainingSlots.length} training slot
                  {trainingSlots.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Your email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={otpSent}
              className="w-full border-2 border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary disabled:bg-muted disabled:text-muted-foreground"
            />
          </div>

          {!otpSent && (
            <button
              onClick={() => void handleSendOtp()}
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground font-bold py-2.5 rounded shadow-brutalist-navy-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-brutalist-navy-sm"
            >
              {isLoading ? "Sending…" : "Send code"}
            </button>
          )}

          {otpSent && (
            <>
              <p className="text-sm text-muted-foreground">
                A 6-digit code was sent to{" "}
                <span className="font-medium text-foreground">{email}</span>.
              </p>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Verification code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full border-2 border-border rounded px-3 py-2 text-sm tracking-widest focus:outline-none focus:border-primary"
                />
              </div>
              <button
                onClick={() => void handleVerifyAndCreate()}
                disabled={isLoading || otp.length < 6}
                className="w-full bg-accent text-accent-foreground font-bold py-2.5 rounded shadow-brutalist hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-brutalist"
              >
                {isLoading ? "Creating…" : "Verify & Create Club"}
              </button>
            </>
          )}

          <button
            onClick={() => {
              setError(null);
              setStep(3);
            }}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}
