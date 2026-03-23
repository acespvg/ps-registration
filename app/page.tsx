"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { Brain, Building2, ShieldCheck, Sprout, AlertTriangle, RefreshCw, Send, Users } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Stat = {
  title: string;
  track: string;
  label: string;
  count: number;
  color: string;
  soft: string;
};

type FormState = {
  [x: string]: string;
  teamName: string;
  registrationId: string;
  psId: string;
};

type SubmitStatus = "idle" | "loading" | "success" | "error";

// ─── Constants ────────────────────────────────────────────────────────────────

const TRACK_META = [
  { id: "track1", label: "Track I",   title: "Intelligent Systems",         color: "#6366f1", soft: "rgba(99,102,241,",  Icon: Brain       },
  { id: "track2", label: "Track II",  title: "Cyber Security & Smart City", color: "#38bdf8", soft: "rgba(56,189,248,",  Icon: Building2   },
  { id: "track3", label: "Track III", title: "Blockchain",                   color: "#a78bfa", soft: "rgba(167,139,250,", Icon: ShieldCheck },
  { id: "track4", label: "Track IV",  title: "Future Learning",              color: "#34d399", soft: "rgba(52,211,153,",  Icon: Sprout      },
];

const INITIAL_FORM: FormState = { teamName: "", registrationId: "", psId: "" };

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const meta = TRACK_META.find((t) => t.label === label);
  const color = meta?.color ?? "#6366f1";
  const soft  = meta?.soft  ?? "rgba(99,102,241,";
  return (
    <div style={{
      background: "rgba(6,12,26,0.95)",
      border: `1px solid ${soft}0.35)`,
      borderRadius: "12px",
      padding: "10px 16px",
      boxShadow: `0 0 24px ${soft}0.2)`,
      backdropFilter: "blur(12px)",
    }}>
      <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "2px", color, fontFamily: "'Trebuchet MS',sans-serif", marginBottom: "4px" }}>
        {meta?.title ?? label}
      </div>
      <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff", fontFamily: "'Trebuchet MS',sans-serif", lineHeight: 1 }}>
        {payload[0].value}
        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginLeft: "5px", fontWeight: 500 }}>teams</span>
      </div>
    </div>
  );
}

// ─── Animated Bar with entrance ───────────────────────────────────────────────

function AnimatedBar(props: any) {
  const { x, y, width, height, fill } = props;
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 120);
    return () => clearTimeout(t);
  }, []);

  const displayHeight = animated ? height : 0;
  const displayY     = animated ? y      : y + height;

  return (
    <rect
      x={x} y={displayY} width={width} height={displayHeight} rx={6} ry={6}
      fill={fill}
      style={{ transition: "height 0.85s cubic-bezier(0.34,1.56,0.64,1), y 0.85s cubic-bezier(0.34,1.56,0.64,1)" }}
    />
  );
}

// ─── Hook: useInView ──────────────────────────────────────────────────────────

function useInView(threshold = 0.1) {
  const ref  = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } }, { threshold });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return [ref, inView] as const;
}

// ─── Hook: useAutoRefresh (React 18+ best practice) ───────────────────────────
// Uses a ref to always hold the latest callback — avoids stale closures entirely
// without needing useCallback or listing the function in the dep array.

function useAutoRefresh(callback: () => void, interval = 15000) {
  const callbackRef = useRef(callback);

  // Keep the ref current on every render — no stale closure possible
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    // Run immediately on mount
    callbackRef.current();

    const id = setInterval(() => {
      callbackRef.current();
    }, interval);

    return () => clearInterval(id);

    // interval is the only primitive dep; callback is captured via ref
  }, [interval]);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HackathonRegistration() {
  const [form,         setForm]         = useState<FormState>(INITIAL_FORM);
  const [stats,        setStats]        = useState<Stat[]>([]);
  const [status,       setStatus]       = useState<SubmitStatus>("idle");
  const [message,      setMessage]      = useState("");
  const [lastUpdated,  setLastUpdated]  = useState<Date | null>(null);
  const [refreshing,   setRefreshing]   = useState(false);
  const [chartKey,     setChartKey]     = useState(0);   // force re-mount for animation

  const [formRef,  formInView]  = useInView(0.05);
  const [chartRef, chartInView] = useInView(0.05);

  // ── Fetch stats ─────────────────────────────────────────────────────────────
  // Plain function — safe because useAutoRefresh captures it via ref, not dep array.

  const fetchStats = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res  = await axios.get("http://localhost:5000/stats");
      const data = res.data;
      setStats(
        TRACK_META.map((t) => ({
          track: t.label,
          label: t.label,
          title: t.title,
          count: data[t.id] ?? 0,
          color: t.color,
          soft:  t.soft,
        }))
      );
      setChartKey((k) => k + 1);
      setLastUpdated(new Date());
    } catch {
      // silently ignore network errors; chart retains last known data
    } finally {
      if (showSpinner) setRefreshing(false);
    }
  };

  useAutoRefresh(fetchStats, 15000);

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.teamName.trim() || !form.registrationId.trim() || !form.psId.trim()) {
      setStatus("error");
      setMessage("Please fill in all fields before submitting.");
      return;
    }

    setStatus("loading");
    try {
      // Server derives the track from psId via ProblemStatement relation —
      // we only send the three fields the backend expects.
      const res = await axios.post("http://localhost:5000/register", {
        teamName:       form.teamName.trim(),
        registrationId: form.registrationId.trim(),
        psId:           form.psId.trim(),
      });
      setStatus("success");
      setMessage(res.data.message ?? "Registration successful!");
      fetchStats();
    } catch (err: any) {
      setStatus("error");
      setMessage(err.response?.data?.message ?? "Something went wrong. Please try again.");
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const updateField = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const minTrack = stats.length ? stats.reduce((a, b) => (a.count <= b.count ? a : b)) : null;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        @keyframes grid-scroll  { to { transform: translateY(60px); } }
        @keyframes orb-drift    { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(20px,-16px) scale(1.06)} }
        @keyframes reveal-up    { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse-dot    { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,.7)} 70%{box-shadow:0 0 0 8px rgba(99,102,241,0)} }
        @keyframes spin         { to{transform:rotate(360deg)} }
        @keyframes shimmer      { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes fade-in      { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
        @keyframes float-badge  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes border-glow  { 0%,100%{box-shadow:0 0 12px rgba(99,102,241,0.3)} 50%{box-shadow:0 0 28px rgba(99,102,241,0.6)} }
        @keyframes success-pop  { 0%{transform:scale(0.8);opacity:0} 60%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
        @keyframes warning-pulse{ 0%,100%{opacity:1} 50%{opacity:0.6} }

        .reg-page {
          min-height: 100vh;
          background: linear-gradient(180deg, #060c1a 0%, #080f20 55%, #060c1a 100%);
          font-family: 'Trebuchet MS', sans-serif;
          color: #fff;
          position: relative;
          overflow-x: hidden;
        }

        .bg-grid {
          position: fixed; inset: 0; opacity: 0.04; pointer-events: none; z-index: 0;
          background-image:
            linear-gradient(rgba(99,102,241,0.6) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.6) 1px, transparent 1px);
          background-size: 60px 60px;
          animation: grid-scroll 12s linear infinite;
        }

        .orb { position: fixed; border-radius: 50%; pointer-events: none; z-index: 0; }

        .page-inner {
          position: relative; z-index: 1;
          max-width: 980px; margin: 0 auto;
          padding: 72px 20px 96px;
          display: flex; flex-direction: column; gap: 48px;
        }

        /* ─ Header */
        .page-header { text-align: center; animation: reveal-up 0.7s ease both; }

        .header-chip {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 5px 16px; border-radius: 999px;
          background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.3);
          margin-bottom: 20px;
        }
        .header-chip-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #818cf8; box-shadow: 0 0 8px #818cf8;
          animation: pulse-dot 2s infinite;
        }
        .header-chip-text {
          color: #a5b4fc; font-size: 10px; font-weight: 700;
          letter-spacing: 3px; text-transform: uppercase;
        }

        .page-title {
          font-size: clamp(32px, 6vw, 56px); font-weight: 900;
          letter-spacing: -2px; line-height: 1; margin: 0 0 12px;
        }
        .page-title-gradient {
          background: linear-gradient(90deg, #6366f1, #38bdf8, #a78bfa);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .page-subtitle { color: rgba(255,255,255,0.38); font-size: 14px; letter-spacing: 0.3px; }

        /* ─ Warning banner */
        .warning-banner {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 16px 20px; border-radius: 14px;
          background: rgba(251,191,36,0.06); border: 1px solid rgba(251,191,36,0.25);
          box-shadow: 0 0 32px rgba(251,191,36,0.05);
          animation: reveal-up 0.7s ease 0.15s both;
        }
        .warning-icon { color: #fbbf24; flex-shrink: 0; margin-top: 1px; animation: warning-pulse 2.5s ease-in-out infinite; }
        .warning-title { font-weight: 800; font-size: 13px; color: #fde68a; margin-bottom: 4px; letter-spacing: 0.3px; }
        .warning-body  { font-size: 12px; color: rgba(253,230,138,0.65); line-height: 1.6; }

        /* ─ Two-column layout */
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
        @media (max-width: 700px) { .two-col { grid-template-columns: 1fr; } }

        /* ─ Card */
        .card {
          border-radius: 20px; padding: 28px 24px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: 0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
          backdrop-filter: blur(12px);
          position: relative; overflow: hidden;
        }
        .card::before {
          content: ''; position: absolute;
          top: 0; left: 15%; right: 15%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent);
        }

        .card-title {
          font-size: 11px; font-weight: 700; letter-spacing: 3px;
          text-transform: uppercase; color: #818cf8; margin-bottom: 20px;
          display: flex; align-items: center; gap: 8px;
        }
        .card-title-line { flex: 1; height: 1px; background: linear-gradient(90deg, rgba(99,102,241,0.3), transparent); }

        /* ─ Form inputs */
        .field-group { display: flex; flex-direction: column; gap: 14px; }

        .field-label { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.35); margin-bottom: 6px; }

        .field-input {
          width: 100%; padding: 12px 16px; border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff; font-size: 13.5px; font-family: 'Trebuchet MS', sans-serif;
          outline: none; transition: border 0.25s, box-shadow 0.25s, background 0.25s;
        }
        .field-input::placeholder { color: rgba(255,255,255,0.22); }
        .field-input:focus {
          border-color: rgba(99,102,241,0.55);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
          background: rgba(99,102,241,0.06);
        }

        .select-wrap { position: relative; }
        .select-arrow {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          pointer-events: none; color: rgba(255,255,255,0.3); font-size: 10px;
        }
        .field-select {
          width: 100%; padding: 12px 36px 12px 16px; border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff; font-size: 13.5px; font-family: 'Trebuchet MS', sans-serif;
          outline: none; appearance: none; cursor: pointer;
          transition: border 0.25s, box-shadow 0.25s;
        }
        .field-select:focus { border-color: rgba(99,102,241,0.55); box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
        .field-select option { background: #0f1829; color: #fff; }

        /* ─ Track option pills (radio) */
        .track-options { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
        .track-option  {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; border-radius: 12px; cursor: pointer;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.025);
          transition: all 0.25s;
          position: relative; overflow: hidden;
        }
        .track-option:hover { border-color: rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); }
        .track-option.selected { border-color: var(--t-border); background: var(--t-bg); box-shadow: 0 0 18px var(--t-glow); }
        .track-option-radio {
          width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.2);
          flex-shrink: 0; display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .track-option.selected .track-option-radio { border-color: var(--t-color); }
        .track-option-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--t-color); box-shadow: 0 0 6px var(--t-color); }
        .track-option-label { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; color: var(--t-color); text-transform: uppercase; }
        .track-option-title { font-size: 11.5px; color: rgba(255,255,255,0.55); }
        .track-option-badge {
          margin-left: auto; padding: 2px 10px; border-radius: 999px; font-size: 10px; font-weight: 700;
          background: var(--t-bg2); border: 1px solid var(--t-border2); color: var(--t-color);
        }

        /* ─ Submit button */
        .submit-btn {
          width: 100%; padding: 14px; border-radius: 14px; border: none; cursor: pointer;
          font-family: 'Trebuchet MS', sans-serif; font-size: 14px; font-weight: 800;
          letter-spacing: 1px; text-transform: uppercase;
          background: linear-gradient(135deg, #6366f1, #818cf8);
          color: #fff; position: relative; overflow: hidden;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 24px rgba(99,102,241,0.35);
          display: flex; align-items: center; justify-content: center; gap: 8px;
          margin-top: 6px;
        }
        .submit-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 8px 32px rgba(99,102,241,0.45); }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .submit-btn-shimmer {
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          background-size: 200% auto;
          animation: shimmer 2.5s linear infinite;
        }
        .spinner { animation: spin 0.75s linear infinite; }

        /* ─ Status message */
        .status-msg {
          padding: 12px 16px; border-radius: 12px; font-size: 12.5px; font-weight: 600;
          display: flex; align-items: flex-start; gap: 8px;
          animation: fade-in 0.3s ease;
          margin-top: 10px; line-height: 1.5;
        }
        .status-msg.success { background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.25); color: #6ee7b7; }
        .status-msg.error   { background: rgba(239,68,68,0.08);  border: 1px solid rgba(239,68,68,0.25);  color: #fca5a5; }

        /* ─ Chart card */
        .chart-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 8px; }
        .chart-title-group { display: flex; flex-direction: column; gap: 2px; }
        .chart-title { font-size: 13px; font-weight: 800; color: #fff; letter-spacing: -0.3px; }
        .chart-subtitle { font-size: 10px; color: rgba(255,255,255,0.3); letter-spacing: 0.3px; }
        .chart-refresh-btn {
          display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px;
          background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.2);
          color: #818cf8; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;
          cursor: pointer; transition: all 0.2s; font-family: 'Trebuchet MS', sans-serif;
        }
        .chart-refresh-btn:hover { background: rgba(99,102,241,0.16); border-color: rgba(99,102,241,0.4); }

        .last-updated { font-size: 9px; color: rgba(255,255,255,0.2); margin-top: 10px; text-align: right; letter-spacing: 0.5px; }

        /* ─ Insight strip */
        .insight-strip {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 16px; border-radius: 12px; margin-bottom: 16px;
          background: rgba(52,211,153,0.06); border: 1px solid rgba(52,211,153,0.2);
          animation: float-badge 4s ease-in-out infinite;
        }
        .insight-dot { width: 7px; height: 7px; border-radius: 50%; background: #34d399; box-shadow: 0 0 8px #34d399; flex-shrink: 0; animation: pulse-dot 2s infinite; }
        .insight-text { font-size: 11px; color: rgba(52,211,153,0.85); font-weight: 600; }
        .insight-text strong { color: #34d399; }

        /* ─ Track legend */
        .track-legend { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .track-legend-item { display: flex; align-items: center; gap: 5px; }
        .track-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .track-legend-name { font-size: 10px; color: rgba(255,255,255,0.35); }

        /* recharts axis */
        .recharts-cartesian-axis-tick-value { fill: rgba(255,255,255,0.35) !important; font-family: 'Trebuchet MS', sans-serif !important; font-size: 11px !important; }
        .recharts-cartesian-grid line { stroke: rgba(255,255,255,0.05) !important; }
      `}</style>

      <div className="reg-page">
        <div className="bg-grid" />
        {/* Orbs */}
        <div className="orb" style={{ top:"-100px", right:"-100px", width:"480px", height:"480px", background:"radial-gradient(circle,rgba(99,102,241,0.14) 0%,transparent 70%)", animation:"orb-drift 9s ease-in-out infinite" }} />
        <div className="orb" style={{ bottom:"-100px", left:"-100px", width:"440px", height:"440px", background:"radial-gradient(circle,rgba(56,189,248,0.10) 0%,transparent 70%)", animation:"orb-drift 11s ease-in-out infinite reverse" }} />

        <div className="page-inner">

          {/* ── Header ── */}
          <div className="page-header">
            <div className="header-chip">
              <span className="header-chip-dot" />
              <span className="header-chip-text">Hackathon · 4 Tracks · ₹1,80,000 Prize</span>
            </div>
            <h1 className="page-title">
              Team{" "}
              <span className="page-title-gradient">Registration</span>
            </h1>
            <p className="page-subtitle">Choose your track wisely — the competition starts here.</p>
          </div>

          {/* ── Warning Banner ── */}
          <div className="warning-banner">
            <AlertTriangle size={18} className="warning-icon" />
            <div>
              <div className="warning-title">⚠️ One-Time Registration — No Changes After Submission</div>
              <div className="warning-body">
                This is a permanent registration. Once submitted, your team name, registration ID, PS ID, and track selection <strong style={{color:"#fde68a"}}>cannot be modified</strong>. Review all details carefully before clicking Submit. Contact the organizers immediately for any errors.
              </div>
            </div>
          </div>

          {/* ── Two-column layout ── */}
          <div className="two-col">

            {/* ── Registration Form ── */}
            <div ref={formRef} className="card" style={{ opacity: formInView ? 1 : 0, transform: formInView ? "translateY(0)" : "translateY(28px)", transition: "opacity 0.6s ease, transform 0.6s ease" }}>
              <div className="card-title">
                Registration Form
                <div className="card-title-line" />
              </div>

              <div className="field-group">
                {/* Team Name */}
                <div>
                  <div className="field-label">Team Name</div>
                  <input
                    className="field-input"
                    placeholder="e.g. Quantum Builders"
                    value={form.teamName}
                    onChange={updateField("teamName")}
                    disabled={status === "success"}
                  />
                </div>

                {/* Registration ID */}
                <div>
                  <div className="field-label">Registration ID</div>
                  <input
                    className="field-input"
                    placeholder="e.g. 3b55c6a5-85fe-4f7j-b3be-f707bf800f73"
                    value={form.registrationId}
                    onChange={updateField("registrationId")}
                    disabled={status === "success"}
                  />
                </div>

                {/* PS ID */}
                <div>
                  <div className="field-label">PS ID</div>
                  <input
                    className="field-input"
                    placeholder="e.g. PS0101"
                    value={form.psId}
                    onChange={updateField("psId")}
                    disabled={status === "success"}
                  />
                  <div style={{
                    marginTop: "7px", fontSize: "10.5px",
                    color: "rgba(255,255,255,0.28)", lineHeight: 1.5,
                    letterSpacing: "0.2px",
                  }}>
                    Your track is automatically assigned based on your PS ID.
                    Refer to the chart on the right to choose a PS ID from the
                    track with fewer registrations for a better shot at winning.
                  </div>
                </div>

                {/* Submit */}
                <button
                  className="submit-btn"
                  onClick={handleSubmit}
                  disabled={status === "loading" || status === "success"}
                >
                  {status !== "loading" && <span className="submit-btn-shimmer" />}
                  {status === "loading" ? (
                    <><RefreshCw size={15} className="spinner" /> Registering…</>
                  ) : status === "success" ? (
                    <><span>✓</span> Registered!</>
                  ) : (
                    <><Send size={14} /> Submit Registration</>
                  )}
                </button>

                {/* Status message */}
                {status === "success" && (
                  <div className="status-msg success">
                    <span>✓</span> {message}
                  </div>
                )}
                {status === "error" && (
                  <div className="status-msg error">
                    <span>✕</span> {message}
                  </div>
                )}
              </div>
            </div>

            {/* ── Chart ── */}
            <div ref={chartRef} className="card" style={{ opacity: chartInView ? 1 : 0, transform: chartInView ? "translateY(0)" : "translateY(28px)", transition: "opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s" }}>
              <div className="chart-header">
                <div className="chart-title-group">
                  <div className="chart-title">Live Track Registrations</div>
                  <div className="chart-subtitle">Auto-refreshes every 15 seconds</div>
                </div>
                <button className="chart-refresh-btn" onClick={() => fetchStats(true)}>
                  <RefreshCw size={11} className={refreshing ? "spinner" : ""} />
                  Refresh
                </button>
              </div>

              {/* Insight strip */}
              {minTrack && (
                <div className="insight-strip">
                  <span className="insight-dot" />
                  <span className="insight-text">
                    💡 <strong>{minTrack.track} ({minTrack.title ?? ""})</strong> has the fewest registrations — consider it to improve your winning chances!
                  </span>
                </div>
              )}

              <ResponsiveContainer width="100%" height={260} key={chartKey}>
                <BarChart data={stats} margin={{ top: 16, right: 8, left: -20, bottom: 0 }} barCategoryGap="30%">
                  <XAxis dataKey="track" tick={{ fill: "rgba(255,255,255,0.35)", fontFamily: "'Trebuchet MS',sans-serif", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontFamily: "'Trebuchet MS',sans-serif", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)", radius: 6 }} />
                  <Bar dataKey="count" shape={<AnimatedBar />} radius={[6, 6, 0, 0]}>
                    {stats.map((s, i) => (
                      <Cell key={i} fill={s.color} fillOpacity={form.track === TRACK_META[i]?.id ? 1 : 0.55} />
                    ))}
                    <LabelList dataKey="count" position="top" style={{ fill: "rgba(255,255,255,0.5)", fontSize: "11px", fontFamily: "'Trebuchet MS',sans-serif", fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="track-legend">
                {TRACK_META.map((t, i) => (
                  <div key={i} className="track-legend-item">
                    <span className="track-legend-dot" style={{ background: t.color, boxShadow: `0 0 5px ${t.color}` }} />
                    <span className="track-legend-name">{t.label}</span>
                  </div>
                ))}
              </div>

              {/* Users icon strip */}
              <div style={{ display:"flex", gap:"12px", marginTop:"16px", flexWrap:"wrap" }}>
                {stats.map((s, i) => (
                  <div key={i} style={{
                    flex: "1 1 calc(50% - 6px)", padding:"10px 12px", borderRadius:"10px",
                    background:`${s.soft}0.07)`, border:`1px solid ${s.soft}0.18)`,
                    display:"flex", alignItems:"center", gap:"8px",
                  }}>
                    <Users size={13} color={s.color} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:"9px", color:s.color, fontWeight:700, letterSpacing:"1.5px" }}>{s.track}</div>
                      <div style={{ fontSize:"16px", fontWeight:900, color:"#fff", lineHeight:1.1 }}>{s.count}</div>
                    </div>
                  </div>
                ))}
              </div>

              {lastUpdated && (
                <div className="last-updated">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}