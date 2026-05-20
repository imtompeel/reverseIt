"use client";

import { use, useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { GameRoom } from "@/components/GameRoom";

export default function JoinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = use(params);
  const { connected, gameState, error, clearError, emit } = useSocket();
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (gameState?.id === gameId.toUpperCase()) {
      setJoined(true);
    }
  }, [gameState, gameId]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    emit("join_game", { gameId: gameId.toUpperCase(), name: name.trim() });
  };

  if (gameState && joined) {
    return (
      <main className="container">
        <header style={{ marginBottom: "1rem" }}>
          <h1 className="logo">ReverseIt</h1>
          <p className="tagline" style={{ marginBottom: 0 }}>
            Game {gameState.id}
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
        <p className="tagline">Join game {gameId.toUpperCase()}</p>
      </header>

      <form onSubmit={handleJoin} className="card">
        <label htmlFor="name" style={{ display: "block", marginBottom: "0.5rem" }}>
          Your name
        </label>
        <input
          id="name"
          type="text"
          placeholder="e.g. Jordan"
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
          {connected ? "Join game" : "Connecting…"}
        </button>
      </form>

      {error && (
        <div className="error-toast" role="alert" onClick={clearError}>
          {error}
        </div>
      )}
    </main>
  );
}
