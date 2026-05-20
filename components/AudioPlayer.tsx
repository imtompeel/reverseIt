"use client";

interface AudioPlayerProps {
  src: string;
  label?: string;
}

export function AudioPlayer({ src, label = "Play audio" }: AudioPlayerProps) {
  return (
    <div className="audio-controls">
      <audio controls src={src} aria-label={label} style={{ width: "100%", maxWidth: 320 }} />
    </div>
  );
}
