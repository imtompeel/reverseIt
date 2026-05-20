"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { ClientGameState } from "@/lib/types";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = io({
      path: "/api/socket",
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("game_state", (state: ClientGameState) => {
      setGameState(state);
      setError(null);
    });
    socket.on("error", ({ message }: { message: string }) => {
      setError(message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const emit = useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { connected, gameState, error, clearError, emit };
}
