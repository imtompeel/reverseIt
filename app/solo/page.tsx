"use client";

import Link from "next/link";
import { SoloGame } from "@/components/SoloGame";

export default function SoloPage() {
  return (
    <main className="container">
      <header style={{ marginBottom: "1rem" }}>
        <h1 className="logo">ReverseIt</h1>
        <p className="tagline" style={{ marginBottom: 0 }}>
          Solo mode — play every role yourself
        </p>
      </header>

      <SoloGame />

      <div className="spacer" />
      <Link
        href="/"
        style={{
          display: "block",
          textAlign: "center",
          fontSize: "0.9rem",
          color: "var(--muted)",
        }}
      >
        ← Back to multiplayer
      </Link>
    </main>
  );
}
