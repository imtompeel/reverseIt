"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ClientGameState } from "@/lib/types";
import { reverseAudioBlob, blobToDataUrl } from "@/lib/audio";
import { QRCodeDisplay } from "./QRCodeDisplay";
import { VoiceRecorder } from "./VoiceRecorder";
import { AudioPlayer } from "./AudioPlayer";

interface GameRoomProps {
  gameState: ClientGameState;
  connected: boolean;
  emit: (event: string, data?: unknown) => void;
}

function playerName(state: ClientGameState, id: string) {
  return state.players.find((p) => p.id === id)?.name ?? "Player";
}

function RoleBadge({ role }: { role: string }) {
  const labels: Record<string, string> = {
    original: "Speaker",
    mimic: "Mimic",
    waiting: "Waiting",
  };
  const cls =
    role === "original"
      ? "role-original"
      : role === "mimic"
        ? "role-mimic"
        : "";
  return <span className={`role-badge ${cls}`}>{labels[role] ?? role}</span>;
}

export function GameRoom({ gameState, connected, emit }: GameRoomProps) {
  const [joinUrl, setJoinUrl] = useState("");
  const [phrase, setPhrase] = useState("");
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isHost = gameState.myPlayerId === gameState.hostId;
  const round = gameState.round;

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/join/${gameState.id}`);
  }, [gameState.id]);

  const handleOriginalRecorded = useCallback((blob: Blob) => {
    setPendingBlob(blob);
  }, []);

  const submitOriginal = async () => {
    if (!pendingBlob) return;
    setSubmitting(true);
    try {
      const audio = await blobToDataUrl(pendingBlob);
      const reversedAudio = await reverseAudioBlob(pendingBlob);
      emit("submit_original", { audio, reversedAudio, phrase: phrase || undefined });
      setPendingBlob(null);
      setPhrase("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMimicRecorded = useCallback(
    async (blob: Blob) => {
      setSubmitting(true);
      try {
        const audio = await blobToDataUrl(blob);
        emit("submit_mimic", { audio });
      } finally {
        setSubmitting(false);
      }
    },
    [emit]
  );

  const roundInfo = useMemo(() => {
    if (!round) return null;
    const currentMimic = round.currentMimicPlayerId
      ? playerName(gameState, round.currentMimicPlayerId)
      : null;
    return {
      speaker: playerName(gameState, round.originalPlayerId),
      currentMimic,
      num: round.roundNumber,
      mimicDone: round.completedMimicPlayerIds.length,
      mimicTotal: round.mimickerIds.length,
    };
  }, [gameState, round]);

  if (gameState.phase === "lobby") {
    return (
      <LobbyView
        gameState={gameState}
        joinUrl={joinUrl}
        isHost={isHost}
        connected={connected}
        onStart={() => emit("start_game")}
      />
    );
  }

  if (gameState.phase === "finished") {
    return (
      <div className="card">
        <h2 className="phase-title">Game over</h2>
        <p className="phase-desc">Thanks for playing ReverseIt!</p>
        {isHost && (
          <button type="button" className="btn-primary" onClick={() => emit("back_to_lobby")}>
            Back to lobby
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {roundInfo && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              Round {roundInfo.num} of {gameState.maxRounds}
            </span>
            <RoleBadge role={gameState.myRole} />
          </div>
          <ul className="player-list" style={{ marginTop: "0.75rem" }}>
            <li>
              <span>Speaker</span>
              <strong>{roundInfo.speaker}</strong>
            </li>
            {gameState.phase === "recording_mimic" && round && (
              <>
                <li>
                  <span>Mimics</span>
                  <strong>
                    {roundInfo.mimicDone} / {roundInfo.mimicTotal} done
                  </strong>
                </li>
                {round.mimickerIds.map((id) => {
                  const done = round.completedMimicPlayerIds.includes(id);
                  const current = id === round.currentMimicPlayerId;
                  return (
                    <li key={id}>
                      <span style={{ color: done ? "var(--success)" : "var(--muted)" }}>
                        {done ? "✓" : current ? "→" : "○"} {playerName(gameState, id)}
                      </span>
                    </li>
                  );
                })}
              </>
            )}
          </ul>
        </div>
      )}

      {gameState.phase === "recording_original" && (
        <PhaseCard
          title={gameState.canAct ? "Your turn — say a phrase" : "Waiting for the speaker"}
          desc={
            gameState.canAct
              ? "Record a short phrase (3–10 seconds). Everyone else will take turns mimicking it backwards."
              : `${roundInfo?.speaker} is recording their phrase…`
          }
        >
          {gameState.canAct && (
            <>
              <input
                type="text"
                placeholder="Optional: type phrase for reveal (hidden until end)"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                style={{ marginBottom: "1rem" }}
              />
              <VoiceRecorder
                label="Tap to record your phrase"
                onRecorded={handleOriginalRecorded}
              />
              {pendingBlob && (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ marginTop: "1rem" }}
                  onClick={submitOriginal}
                  disabled={submitting}
                >
                  {submitting ? "Processing…" : "Send to mimics"}
                </button>
              )}
            </>
          )}
        </PhaseCard>
      )}

      {gameState.phase === "recording_mimic" && (
        <PhaseCard
          title={gameState.canAct ? "Your turn — mimic backwards" : "Mimic round"}
          desc={
            gameState.canAct
              ? "Listen to the reversed clip, then record yourself copying those sounds."
              : roundInfo?.currentMimic
                ? `${roundInfo.currentMimic} is mimicking… (${roundInfo.mimicDone + (gameState.canAct ? 0 : 1)} of ${roundInfo.mimicTotal})`
                : "Waiting for the next mimic…"
          }
        >
          {gameState.canAct && gameState.audioToPlay && (
            <AudioPlayer src={gameState.audioToPlay} label="Reversed audio" />
          )}
          {gameState.canAct && (
            <VoiceRecorder
              label="Record your mimic"
              onRecorded={handleMimicRecorded}
              disabled={submitting}
            />
          )}
        </PhaseCard>
      )}

      {gameState.phase === "reveal" && round && (
        <div className="card">
          <h2 className="phase-title">Reveal — everyone&apos;s attempts</h2>
          {round.originalPhrase && (
            <div className="reveal-item" style={{ marginBottom: "1rem" }}>
              <div className="reveal-label">Original phrase</div>
              <div className="reveal-value">{round.originalPhrase}</div>
            </div>
          )}
          {round.originalAudio && (
            <div className="reveal-item" style={{ marginBottom: "1rem" }}>
              <div className="reveal-label">Original recording</div>
              <AudioPlayer src={round.originalAudio} />
            </div>
          )}
          {round.reversedAudio && (
            <div className="reveal-item" style={{ marginBottom: "1rem" }}>
              <div className="reveal-label">Reversed (what mimics heard)</div>
              <AudioPlayer src={round.reversedAudio} />
            </div>
          )}
          <div className="reveal-grid">
            {round.mimics?.map((m) => (
              <div key={m.playerId} className="reveal-item">
                <div className="reveal-label">{m.playerName}&apos;s mimic</div>
                <AudioPlayer src={m.audio} />
              </div>
            ))}
          </div>
          {isHost && (
            <button
              type="button"
              className="btn-primary"
              style={{ marginTop: "1rem" }}
              onClick={() => emit("next_round")}
            >
              {round.roundNumber >= gameState.maxRounds ? "Finish game" : "Next round"}
            </button>
          )}
          {!isHost && <p className="waiting-screen">Waiting for host to continue…</p>}
        </div>
      )}

      {!gameState.canAct &&
        !["reveal", "lobby", "finished"].includes(gameState.phase) && (
          <p className="waiting-screen">Watch the action — it&apos;s not your turn yet.</p>
        )}
    </div>
  );
}

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

function LobbyView({
  gameState,
  joinUrl,
  isHost,
  connected,
  onStart,
}: {
  gameState: ClientGameState;
  joinUrl: string;
  isHost: boolean;
  connected: boolean;
  onStart: () => void;
}) {
  const canStart = gameState.players.length >= 2 && isHost;

  return (
    <>
      <div className="card">
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
          Game code
        </p>
        <p className="game-code">{gameState.id}</p>
        {joinUrl && (
          <>
            <QRCodeDisplay url={joinUrl} />
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--muted)",
                wordBreak: "break-all",
                textAlign: "center",
              }}
            >
              {joinUrl}
            </p>
          </>
        )}
      </div>

      <div className="card">
        <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>
          Players ({gameState.players.length})
        </h2>
        <ul className="player-list">
          {gameState.players.map((p) => (
            <li key={p.id}>
              <span>
                {p.name}
                {p.id === gameState.hostId && " (host)"}
              </span>
            </li>
          ))}
        </ul>
        {gameState.players.length < 2 && (
          <p style={{ color: "var(--warning)", fontSize: "0.85rem", marginTop: "0.75rem" }}>
            Need at least 2 players. Share the QR code so a friend can join.
          </p>
        )}
      </div>

      <div className="card" style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
        <strong style={{ color: "var(--text)" }}>How it works</strong>
        <ol style={{ marginTop: "0.5rem", paddingLeft: "1.25rem" }}>
          <li>One speaker records a phrase</li>
          <li>Everyone else takes a turn mimicking it backwards</li>
          <li>Reveal shows every mimic attempt side by side</li>
        </ol>
      </div>

      {isHost ? (
        <button
          type="button"
          className="btn-primary"
          onClick={onStart}
          disabled={!canStart || !connected}
        >
          Start game
        </button>
      ) : (
        <p className="waiting-screen">Waiting for the host to start…</p>
      )}
    </>
  );
}
