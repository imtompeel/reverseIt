"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QRCodeDisplayProps {
  url: string;
}

export function QRCodeDisplay({ url }: QRCodeDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(url, { width: 220, margin: 2, color: { dark: "#1a1228" } }).then(
      setDataUrl
    );
  }, [url]);

  if (!dataUrl) {
    return <div className="qr-wrap" style={{ minHeight: 220 }} aria-hidden />;
  }

  return (
    <div className="qr-wrap">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt="QR code to join game" width={220} height={220} />
    </div>
  );
}
