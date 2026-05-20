"use client";

import { useCallback, useState } from "react";
import { reverseAudioBlob, blobToDataUrl } from "@/lib/audio";
import { VoiceRecorder } from "./VoiceRecorder";
import { AudioPlayer } from "./AudioPlayer";

type SoloPhase =
  | "intro"
  | "recording_original"
  | "recording_mimic"
  | "reveal";

interface SoloRound {
  originalAudio: string;
  reversedAudio: string;
  mimicAudio: string;
  mimicReversedAudio: string;
  phrase?: string;
}

const STEPS = [
  { key: "recording_original", label: "Speak" },
  { key: "recording_mimic", label: "Mimic" },
  { key: "reveal", label: "Reveal" },
] as const;

function PhaseCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="card">
      <h2 className="phase-title">{title}</h2>
      <p className="phase-desc">{desc}</p>
      {children}
    </div>
  );
}

function StepIndicator({ phase }: { phase: SoloPhase }) {
  const activeIdx =
    phase === "recording_original"
      ? 0
      : phase === "recording_mimic"
        ? 1
        : phase === "reveal"
          ? 2
          : -1;

  if (activeIdx < 0) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: "0.5rem",
        marginBottom: "1rem",
        justifyContent: "center",
      }}
    >
      {STEPS.map((step, i) => (
        <div
          key={step.key}
          style={{
            flex: 1,
            textAlign: "center",
            padding: "0.5rem",
            borderRadius: 8,
            fontSize: "0.75rem",
            fontWeight: 600,
            background: i <= activeIdx ? "var(--surface-2)" : "transparent",
            border: `1px solid ${i === activeIdx ? "var(--accent-2)" : "var(--border)"}`,
            color: i <= activeIdx ? "var(--text)" : "var(--muted)",
          }}
        >
          {i + 1}. {step.label}
        </div>
      ))}
    </div>
  );
}

export function SoloGame() {
  const [phase, setPhase] = useState<SoloPhase>("intro");
  const [phrase, setPhrase] = useState("");
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [round, setRound] = useState<SoloRound | null>(null);
  const [roundCount, setRoundCount] = useState(0);

  const resetRound = () => {
    setPhrase("");
    setPendingBlob(null);
    setRound(null);
    setPhase("intro");
  };

  const startRound = () => {
    setPhrase("");
    setPendingBlob(null);
    setRound(null);
    setPhase("recording_original");
  };

  const submitOriginal = async () => {
    if (!pendingBlob) return;
    setSubmitting(true);
    try {
      const originalAudio = await blobToDataUrl(pendingBlob);
      const reversedAudio = await reverseAudioBlob(pendingBlob);
      setRound({
        originalAudio,
        reversedAudio,
        mimicAudio: "",
        mimicReversedAudio: "",
        phrase: phrase.trim() || undefined,
      });
      setPendingBlob(null);
      setPhrase("");
      setPhase("recording_mimic");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMimicRecorded = useCallback(async (blob: Blob) => {
    setSubmitting(true);
    try {
      const mimicAudio = await blobToDataUrl(blob);
      const mimicReversedAudio = await reverseAudioBlob(blob);
      setRound((r) => (r ? { ...r, mimicAudio, mimicReversedAudio } : r));
      setPhase("reveal");
    } finally {
      setSubmitting(false);
    }
  }, []);

  return (
    <>
      <StepIndicator phase={phase} />

      {phase === "intro" && (
        <div className="card">
          <h2 className="phase-title">Solo mode</h2>
          <p className="phase-desc">
            You play every role yourself. Record a phrase, mimic it backwards, then
            hear the full chain revealed — including what you originally said.
          </p>
          <ol
            style={{
              marginTop: "1rem",
              paddingLeft: "1.25rem",
              color: "var(--muted)",
              fontSize: "0.9rem",
            }}
          >
            <li>Record a short phrase</li>
            <li>Listen to it reversed and mimic those sounds</li>
            <li>Reveal — hear the reversed mimic, then your original words</li>
          </ol>
          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: "1.25rem" }}
            onClick={startRound}
          >
            Start round
          </button>
          {roundCount > 0 && (
            <p
              style={{
                textAlign: "center",
                color: "var(--muted)",
                marginTop: "0.75rem",
                fontSize: "0.85rem",
              }}
            >
              Rounds played: {roundCount}
            </p>
          )}
        </div>
      )}

      {phase === "recording_original" && (
        <PhaseCard
          title="Step 1 — Speak"
          desc="Record a short phrase (3–10 seconds). You won’t hear it forwards again until the reveal."
        >
          <input
            type="text"
            placeholder="Optional: type phrase to show at reveal"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            style={{ marginBottom: "1rem" }}
          />
          <VoiceRecorder label="Tap to record your phrase" onRecorded={setPendingBlob} />
          {pendingBlob && (
            <button
              type="button"
              className="btn-primary"
              style={{ marginTop: "1rem" }}
              onClick={submitOriginal}
              disabled={submitting}
            >
              {submitting ? "Reversing audio…" : "Continue to mimic"}
            </button>
          )}
        </PhaseCard>
      )}

      {phase === "recording_mimic" && round && (
        <PhaseCard
          title="Step 2 — Mimic"
          desc="Listen to your phrase backwards, then record yourself copying those sounds."
        >
          <AudioPlayer src={round.reversedAudio} label="Reversed audio" />
          <VoiceRecorder
            label="Record your mimic"
            onRecorded={handleMimicRecorded}
            disabled={submitting}
          />
        </PhaseCard>
      )}

      {phase === "reveal" && round && (
        <div className="card">
          <h2 className="phase-title">Step 3 — Reveal</h2>
          <p className="phase-desc">
            Hear your original recording and your mimic played backwards.
          </p>

          {round.phrase && (
            <div
              style={{
                textAlign: "center",
                padding: "1rem",
                marginBottom: "1rem",
                borderRadius: 12,
                background: "rgba(124, 92, 255, 0.15)",
                border: "1px solid var(--accent-2)",
              }}
            >
              <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>You said</p>
              <p style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: "0.25rem" }}>
                {round.phrase}
              </p>
            </div>
          )}

          <div className="reveal-grid">
            {round.originalAudio && (
              <div className="reveal-item">
                <div className="reveal-label">Original recording</div>
                <AudioPlayer src={round.originalAudio} />
              </div>
            )}
            {round.mimicReversedAudio && (
              <div className="reveal-item">
                <div className="reveal-label">Your mimic (reversed)</div>
                <AudioPlayer src={round.mimicReversedAudio} />
              </div>
            )}
          </div>
          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: "1rem" }}
            onClick={() => {
              setRoundCount((c) => c + 1);
              startRound();
            }}
          >
            Play again
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{ marginTop: "0.5rem" }}
            onClick={resetRound}
          >
            Back to menu
          </button>
        </div>
      )}
    </>
  );
}
