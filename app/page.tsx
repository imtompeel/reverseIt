"use client";

import Link from "next/link";
import { useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { GameRoom } from "@/components/GameRoom";

export default function HomePage() {
  const { connected, gameState, error, clearError, emit } = useSocket();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    emit("create_game", { name: name.trim() });
    setMode("choose");
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !joinCode.trim()) return;
    emit("join_game", { gameId: joinCode.trim().toUpperCase(), name: name.trim() });
    setMode("choose");
  };

  if (gameState) {
    return (
      <main className="container">
        <header style={{ marginBottom: "1rem" }}>
          <h1 className="logo">ReverseIt</h1>
          <p className="tagline" style={{ marginBottom: 0 }}>
            {gameState.players.find((p) => p.id === gameState.myPlayerId)?.name}
          </p>
        </header>
        <GameRoom gameState={gameState} connected={connected} emit={emit} />
        {error && (
          <div className="error-toast" role="alert" onClick={clearError}>
            {error}
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="container">
      <header>
        <h1 className="logo">ReverseIt</h1>
        <p className="tagline">
          Record a phrase, pass it backwards, mimic the sounds, then guess what was
          originally said.
        </p>
      </header>

      {mode === "choose" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <button type="button" className="btn-primary" onClick={() => setMode("create")}>
            Create a game
          </button>
          <button type="button" className="btn-secondary" onClick={() => setMode("join")}>
            Join with code
          </button>
          <Link href="/solo" className="btn-secondary" style={{ textAlign: "center", textDecoration: "none", display: "block" }}>
            Play solo
          </Link>
        </div>
      )}

      {mode === "create" && (
        <form onSubmit={handleCreate} className="card">
          <label htmlFor="create-name" style={{ display: "block", marginBottom: "0.5rem" }}>
            Your name
          </label>
          <input
            id="create-name"
            type="text"
            placeholder="e.g. Alex"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            maxLength={24}
          />
          <button
            type="submit"
            className="btn-primary"
            style={{ marginTop: "1rem" }}
            disabled={!connected || !name.trim()}
          >
            {connected ? "Create & show QR code" : "Connecting…"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{ marginTop: "0.5rem" }}
            onClick={() => setMode("choose")}
          >
            Back
          </button>
        </form>
      )}

      {mode === "join" && (
        <form onSubmit={handleJoin} className="card">
          <label htmlFor="join-name" style={{ display: "block", marginBottom: "0.5rem" }}>
            Your name
          </label>
          <input
            id="join-name"
            type="text"
            placeholder="e.g. Sam"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            maxLength={24}
          />
          <label
            htmlFor="join-code"
            style={{ display: "block", marginBottom: "0.5rem", marginTop: "1rem" }}
          >
            Game code
          </label>
          <input
            id="join-code"
            type="text"
            placeholder="e.g. A1B2C3D4"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={8}
            style={{ fontFamily: "ui-monospace, monospace", letterSpacing: "0.1em" }}
          />
          <button
            type="submit"
            className="btn-primary"
            style={{ marginTop: "1rem" }}
            disabled={!connected || !name.trim() || joinCode.length < 4}
          >
            {connected ? "Join game" : "Connecting…"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{ marginTop: "0.5rem" }}
            onClick={() => setMode("choose")}
          >
            Back
          </button>
        </form>
      )}

      <div className="spacer" />
      <p style={{ color: "var(--muted)", fontSize: "0.8rem", textAlign: "center" }}>
        Best with 2+ players on phones. Allow microphone access when prompted.
      </p>

      {error && (
        <div className="error-toast" role="alert" onClick={clearError}>
          {error}
        </div>
      )}
    </main>
  );
}
