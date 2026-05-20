"use client";

import { useCallback, useRef, useState } from "react";

interface VoiceRecorderProps {
  label: string;
  onRecorded: (blob: Blob) => void;
  disabled?: boolean;
}

export function VoiceRecorder({ label, onRecorded, disabled }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setHasRecording(true);
        onRecorded(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setHasRecording(false);
    } catch {
      alert("Microphone access is required to play. Please allow access and try again.");
    }
  }, [onRecorded]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, []);

  const handleClick = () => {
    if (disabled) return;
    if (recording) stopRecording();
    else startRecording();
  };

  return (
    <div>
      <button
        type="button"
        className={`btn-record ${recording ? "recording" : ""}`}
        onClick={handleClick}
        disabled={disabled}
        aria-label={recording ? "Stop recording" : label}
      >
        {recording ? "Stop" : hasRecording ? "Re-record" : "Record"}
      </button>
      <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>
        {recording ? "Recording… tap to stop" : label}
      </p>
    </div>
  );
}
