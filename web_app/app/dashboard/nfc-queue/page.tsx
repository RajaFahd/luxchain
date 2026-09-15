"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getWaitingNfcQueue, bindNfcItem } from "@/lib/api";
import CopyableText from "@/components/CopyableText";

export default function NfcQueuePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productIdParam = searchParams.get("id_produk");

  const [queue, setQueue] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [isNfcSupported, setIsNfcSupported] = useState<boolean>(false);
  const [isScanningActive, setIsScanningActive] = useState<boolean>(false);

  // Status of the current item being processed
  const [stepStatus, setStepStatus] = useState<
    "idle" | "ready_to_tap" | "writing_ndef" | "binding_server" | "success" | "error"
  >("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // History of items bound in this session
  const [boundHistory, setBoundHistory] = useState<any[]>([]);
  const [simulatedUidInput, setSimulatedUidInput] = useState<string>("");

  const ndefReaderRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ─── Play Audio Beep using Web Audio API ───
  const playSuccessBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15); // E6 note
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (_) {}
  };

  const playErrorBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (_) {}
  };

  // ─── Fetch Queue ───
  const fetchQueue = async () => {
    setLoading(true);
    try {
      const prodId = productIdParam ? parseInt(productIdParam) : undefined;
      const res = await getWaitingNfcQueue(prodId);
      if (res.success) {
        setQueue(res.data);
        setCurrentIndex(0);
      }
    } catch (err: any) {
      setErrorMessage("Gagal mengambil antrean NFC: " + (err.message || "Koneksi bermasalah"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // Check Web NFC availability
    if (typeof window !== "undefined" && "NDEFReader" in window) {
      setIsNfcSupported(true);
    } else {
      setIsNfcSupported(false);
    }

    return () => {
      // Clean up abort controller on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [productIdParam]);

  const currentItem = queue[currentIndex];

  // ─── Process NFC Binding ───
  const processBinding = useCallback(
    async (hardwareUid: string) => {
      if (!currentItem) return;

      try {
        setStepStatus("binding_server");
        setStatusMessage(`Menyimpan UID fisik (${hardwareUid}) ke server...`);

        const res = await bindNfcItem({
          hash: currentItem.hash_blockchain,
          uid_fisik: hardwareUid,
        });

        if (res.success) {
          playSuccessBeep();
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
          }

          setStepStatus("success");
          setStatusMessage(`Berhasil di-binding! UID: ${hardwareUid}`);

          // Add to bound history
          setBoundHistory((prev) => [
            {
              ...currentItem,
              uid_fisik: hardwareUid,
              bound_at: new Date().toLocaleTimeString(),
            },
            ...prev,
          ]);

          // Auto-advance to next item after 1 second
          setTimeout(() => {
            setCurrentIndex((prevIdx) => {
              const nextIdx = prevIdx + 1;
              if (nextIdx < queue.length) {
                setStepStatus("ready_to_tap");
                setStatusMessage("Siap! Silakan tempelkan baju berikutnya.");
              } else {
                setStepStatus("idle");
                setStatusMessage("Semua antrean berhasil selesai!");
                setIsScanningActive(false);
              }
              return nextIdx;
            });
          }, 1200);
        } else {
          playErrorBeep();
          setStepStatus("error");
          setErrorMessage(res.message || "Gagal mengikat cip NFC");
        }
      } catch (err: any) {
        playErrorBeep();
        setStepStatus("error");
        setErrorMessage("Error saat menghubungi server: " + (err.message || ""));
      }
    },
    [currentItem, queue.length]
  );

  // ─── Start Web NFC Scanning Session ───
  const startNfcSession = async () => {
    if (!isNfcSupported) {
      setErrorMessage("Browser ini tidak mendukung Web NFC. Gunakan Google Chrome pada perangkat Android dengan NFC aktif.");
      return;
    }

    try {
      setErrorMessage("");
      const NDEFReaderClass = (window as any).NDEFReader;
      const ndef = new NDEFReaderClass();
      ndefReaderRef.current = ndef;

      abortControllerRef.current = new AbortController();

      await ndef.scan({ signal: abortControllerRef.current.signal });
      setIsScanningActive(true);
      setStepStatus("ready_to_tap");
      setStatusMessage("Pemindai NFC Aktif! Dekatkan cip NFC pada barang.");

      ndef.onreading = async (event: any) => {
        if (!currentItem || stepStatus === "writing_ndef" || stepStatus === "binding_server") {
          return;
        }

        const hardwareUid = event.serialNumber;
        if (!hardwareUid) {
          setErrorMessage("Tidak dapat membaca UID fisik cip. Pastikan cip ditempelkan dengan stabil.");
          return;
        }

        try {
          // 1. Write product hash to NDEF memory
          setStepStatus("writing_ndef");
          setStatusMessage(`Menulis hash sertifikat digital ke memori cip NFC (${hardwareUid})...`);

          await ndef.write(
            {
              records: [
                {
                  recordType: "text",
                  data: currentItem.hash_blockchain,
                },
              ],
            },
            { overwrite: true }
          );

          // 2. Send to backend binding API
          await processBinding(hardwareUid);
        } catch (writeErr: any) {
          console.error("Gagal menulis NDEF:", writeErr);
          playErrorBeep();
          setStepStatus("error");
          setErrorMessage("Gagal menulis data ke cip: " + (writeErr.message || "Tag terlepas terlalu cepat. Coba tap lagi."));
        }
      };

      ndef.onreadingerror = () => {
        playErrorBeep();
        setStepStatus("error");
        setErrorMessage("Gagal membaca tag NFC. Tag mungkin tidak kompatibel atau terlepas terlalu cepat.");
      };
    } catch (err: any) {
      console.error("Error memulai sesi NFC:", err);
      setIsScanningActive(false);
      setStepStatus("error");
      if (err.name === "NotAllowedError") {
        setErrorMessage("Izin akses NFC ditolak oleh pengguna atau sistem.");
      } else {
        setErrorMessage("Tidak dapat mengaktifkan NFC: " + (err.message || ""));
      }
    }
  };

  const stopNfcSession = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsScanningActive(false);
    setStepStatus("idle");
    setStatusMessage("");
  };

  // ─── Simulation / Development Trigger ───
  const handleSimulatedTap = () => {
    if (!currentItem) return;
    const mockUid = simulatedUidInput.trim() || `04:${Array.from({ length: 6 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")).join(":")}`;
    processBinding(mockUid);
  };

  const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:3001";

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "350px", color: "var(--muted-foreground)" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite", marginBottom: "12px" }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <p style={{ fontSize: "14px" }}>Memuat antrean item waiting_nfc...</p>
      </div>
    );
  }

  const isCompleted = queue.length > 0 && currentIndex >= queue.length;

  return (
    <div className="animate-fade-in" style={{ maxWidth: "1000px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <button
            onClick={() => router.push("/dashboard/product-items")}
            style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", color: "var(--muted-foreground)", fontSize: "13px", cursor: "pointer", marginBottom: "8px", padding: 0 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
            Kembali ke Product Items
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "-0.5px" }}>
              Stasiun Antrean Web NFC
            </h1>
            <span style={{
              background: isScanningActive ? "var(--lc-success-bg)" : "var(--muted)",
              color: isScanningActive ? "var(--lc-success)" : "var(--muted-foreground)",
              padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600,
              display: "flex", alignItems: "center", gap: "6px"
            }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: isScanningActive ? "var(--lc-success)" : "var(--muted-foreground)", display: "inline-block" }} />
              {isScanningActive ? "NFC STANDBY" : "IDLE"}
            </span>
          </div>
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginTop: "4px" }}>
            Sentuhkan perangkat ke cip NFC fisik pakaian/barang secara berurutan. Sistem menulis hash digital dan mengikat UID fisik secara instan.
          </p>
        </div>

        <button
          onClick={fetchQueue}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "8px 14px", background: "var(--card)",
            color: "var(--foreground)", border: "1px solid var(--border)",
            borderRadius: "calc(var(--radius) - 2px)", fontSize: "12px", cursor: "pointer"
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Refresh Antrean
        </button>
      </div>

      {/* Web NFC Support Alert */}
      {!isNfcSupported && (
        <div style={{
          background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)",
          borderRadius: "var(--radius)", padding: "14px 18px", marginBottom: "20px",
          display: "flex", alignItems: "flex-start", gap: "12px", fontSize: "13px", color: "var(--lc-warning)"
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: "2px" }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <strong>Web NFC API Tidak Terdeteksi di Browser Ini</strong>
            <p style={{ marginTop: "4px", color: "var(--foreground)", fontSize: "12px", lineHeight: 1.5 }}>
              Browser ini belum mendukung <code style={{ background: "var(--muted)", padding: "2px 4px", borderRadius: "3px" }}>window.NDEFReader</code> (biasanya didukung pada Google Chrome di Android dengan NFC menyala).
              Namun, Anda dapat menggunakan <strong>Mode Simulasi / Tap Virtual</strong> di bawah untuk menguji alur antrean otomatis, penulisan, dan binding server.
            </p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div style={{
          background: "rgba(224, 92, 92, 0.08)", border: "1px solid rgba(224, 92, 92, 0.25)",
          borderRadius: "var(--radius)", padding: "12px 16px", marginBottom: "20px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px",
          fontSize: "13px", color: "var(--destructive)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage("")}
            style={{ background: "none", border: "none", color: "var(--destructive)", cursor: "pointer", fontWeight: 600 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Queue State Empty */}
      {queue.length === 0 ? (
        <div style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)", padding: "60px 24px", textAlign: "center"
        }}>
          <div style={{ width: "54px", height: "54px", borderRadius: "50%", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3 style={{ fontSize: "18px", fontWeight: 600, color: "var(--foreground)", marginBottom: "6px" }}>
            Tidak Ada Antrean NFC
          </h3>
          <p style={{ color: "var(--muted-foreground)", fontSize: "13px", maxWidth: "400px", margin: "0 auto 20px" }}>
            Semua produk sudah memiliki cip NFC terikat, atau belum ada produk yang di-generate dengan status waiting_nfc.
          </p>
          <button
            onClick={() => router.push("/dashboard/products/new")}
            style={{
              padding: "10px 20px", background: "var(--primary)", color: "var(--primary-foreground)",
              border: "none", borderRadius: "calc(var(--radius) - 2px)", fontSize: "13px", fontWeight: 600, cursor: "pointer"
            }}
          >
            Generate Produk Baru
          </button>
        </div>
      ) : isCompleted ? (
        /* Queue Finished Screen */
        <div style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)", padding: "50px 24px", textAlign: "center"
        }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "var(--lc-success-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--lc-success)" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: 600, color: "var(--foreground)", marginBottom: "8px" }}>
            Semua {queue.length} Unit Selesai Di-Binding! 🎉
          </h2>
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px", maxWidth: "450px", margin: "0 auto 24px" }}>
            Seluruh cip NFC fisik telah terisi hash blockchain resmi dan tercatat di database dengan status aktif (minted).
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
            <button
              onClick={() => router.push("/dashboard/product-items")}
              style={{
                padding: "10px 20px", background: "var(--primary)", color: "var(--primary-foreground)",
                border: "none", borderRadius: "calc(var(--radius) - 2px)", fontSize: "13px", fontWeight: 600, cursor: "pointer"
              }}
            >
              Lihat Daftar Unit Fisik
            </button>
            <button
              onClick={() => {
                fetchQueue();
                setBoundHistory([]);
              }}
              style={{
                padding: "10px 20px", background: "transparent", color: "var(--foreground)",
                border: "1px solid var(--border)", borderRadius: "calc(var(--radius) - 2px)", fontSize: "13px", fontWeight: 500, cursor: "pointer"
              }}
            >
              Cek Antrean Baru
            </button>
          </div>
        </div>
      ) : (
        /* Main Active Queue Interactive View */
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px" }}>
          {/* Active Tap Panel */}
          <div style={{
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)", padding: "28px", display: "flex", flexDirection: "column"
          }}>
            {/* Progress Badge */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <span style={{
                background: "var(--accent)", color: "var(--foreground)",
                padding: "4px 12px", borderRadius: "16px", fontSize: "12px", fontWeight: 600, letterSpacing: "0.5px"
              }}>
                ANTREAN UNIT {currentIndex + 1} DARI {queue.length}
              </span>
              <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                {queue.length - currentIndex} unit tersisa
              </span>
            </div>

            {/* Tap Prompt Card */}
            <div style={{
              background: stepStatus === "success"
                ? "var(--lc-success-bg)"
                : stepStatus === "error"
                ? "rgba(224, 92, 92, 0.08)"
                : isScanningActive
                ? "rgba(184, 150, 62, 0.08)"
                : "var(--input-background)",
              border: `2px dashed ${
                stepStatus === "success"
                  ? "var(--lc-success)"
                  : stepStatus === "error"
                  ? "var(--destructive)"
                  : isScanningActive
                  ? "var(--primary)"
                  : "var(--border)"
              }`,
              borderRadius: "var(--radius)",
              padding: "40px 24px",
              textAlign: "center",
              transition: "all 0.25s ease",
              marginBottom: "24px"
            }}>
              {/* Animated Tap Icon */}
              <div style={{
                width: "80px", height: "80px", borderRadius: "50%",
                background: isScanningActive ? "var(--primary)" : "var(--muted)",
                color: isScanningActive ? "var(--primary-foreground)" : "var(--muted-foreground)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
                boxShadow: isScanningActive ? "0 0 25px rgba(184, 150, 62, 0.35)" : "none",
                transition: "all 0.2s ease"
              }}>
                {stepStatus === "writing_ndef" || stepStatus === "binding_server" ? (
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                ) : stepStatus === "success" ? (
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  /* NFC Tap Icon */
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                )}
              </div>

              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--foreground)", marginBottom: "6px" }}>
                {stepStatus === "writing_ndef"
                  ? "Menulis ke Cip NFC..."
                  : stepStatus === "binding_server"
                  ? "Mengikat ke Database Server..."
                  : stepStatus === "success"
                  ? "✓ Berhasil Diikat!"
                  : `Silakan Tap Baju ${currentIndex + 1} dari ${queue.length}`}
              </h2>

              <p style={{ fontSize: "14px", color: "var(--muted-foreground)", maxWidth: "420px", margin: "0 auto" }}>
                {statusMessage || "Dekatkan perangkat HP/Reader ke cip pakaian untuk menulis hash sertifikat & mengambil UID fisik pabrik."}
              </p>
            </div>

            {/* Current Item Specs */}
            <div style={{
              background: "var(--input-background)", border: "1px solid var(--border)",
              borderRadius: "var(--radius)", padding: "18px", marginBottom: "20px"
            }}>
              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                {currentItem.gambar_url ? (
                  <img
                    src={`${API_BASE}${currentItem.gambar_url}`}
                    alt={currentItem.nama_produk}
                    style={{ width: "64px", height: "64px", objectFit: "cover", borderRadius: "8px" }}
                  />
                ) : (
                  <div style={{ width: "64px", height: "64px", background: "var(--muted)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>
                    🏷️
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--muted-foreground)", letterSpacing: "0.5px" }}>
                    {currentItem.tipe_artikel} • {currentItem.nama_kategori || "Fashion"}
                  </p>
                  <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--foreground)", margin: "2px 0 4px" }}>
                    {currentItem.nama_produk}
                  </h3>
                  <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--primary)" }}>
                    Rp {Number(currentItem.harga || 0).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border)", marginTop: "14px", paddingTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px" }}>
                <div>
                  <span style={{ color: "var(--muted-foreground)" }}>UUID Item:</span>
                  <div style={{ fontFamily: "monospace", color: "var(--foreground)", marginTop: "2px" }}>
                    <CopyableText text={currentItem.id_item} truncateText={currentItem.id_item.substring(0, 14) + "..."} />
                  </div>
                </div>
                <div>
                  <span style={{ color: "var(--muted-foreground)" }}>Hash Blockchain:</span>
                  <div style={{ fontFamily: "monospace", color: "var(--foreground)", marginTop: "2px" }}>
                    <CopyableText text={currentItem.hash_blockchain} truncateText={currentItem.hash_blockchain.substring(0, 14) + "..."} />
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: "10px", marginTop: "auto" }}>
              {isNfcSupported ? (
                !isScanningActive ? (
                  <button
                    onClick={startNfcSession}
                    style={{
                      flex: 1, height: "46px", background: "var(--primary)", color: "var(--primary-foreground)",
                      border: "none", borderRadius: "calc(var(--radius) - 2px)", fontSize: "13px", fontWeight: 600,
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>
                    Mulai Sesi Web NFC Otomatis
                  </button>
                ) : (
                  <button
                    onClick={stopNfcSession}
                    style={{
                      flex: 1, height: "46px", background: "var(--destructive)", color: "#fff",
                      border: "none", borderRadius: "calc(var(--radius) - 2px)", fontSize: "13px", fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    Hentikan Sesi NFC
                  </button>
                )
              ) : null}

              {/* Simulation fallback button */}
              <button
                onClick={handleSimulatedTap}
                disabled={stepStatus === "writing_ndef" || stepStatus === "binding_server"}
                style={{
                  flex: isNfcSupported ? "0 0 160px" : "1",
                  height: "46px", background: isNfcSupported ? "var(--secondary)" : "var(--primary)",
                  color: isNfcSupported ? "var(--foreground)" : "var(--primary-foreground)",
                  border: isNfcSupported ? "1px solid var(--border)" : "none",
                  borderRadius: "calc(var(--radius) - 2px)", fontSize: "13px", fontWeight: 600,
                  cursor: "pointer", transition: "all 0.15s"
                }}
              >
                Simulasi Tap Cip
              </button>
            </div>

            {/* Custom UID simulation input */}
            <div style={{ marginTop: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="text"
                placeholder="Custom UID fisik simulasi (opsional, misal: 04:a2:3b:4f:c1:80:2a)..."
                value={simulatedUidInput}
                onChange={(e) => setSimulatedUidInput(e.target.value)}
                style={{
                  flex: 1, height: "32px", padding: "0 10px", fontSize: "12px",
                  background: "var(--input-background)", border: "1px solid var(--border)",
                  borderRadius: "calc(var(--radius) - 2px)", color: "var(--foreground)", outline: "none"
                }}
              />
            </div>
          </div>

          {/* Right Sidebar: Session Progress & Bound History */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Progress Card */}
            <div style={{
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)", padding: "20px"
            }}>
              <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "14px" }}>
                Progres Produksi
              </h4>
              
              <div style={{ width: "100%", height: "8px", background: "var(--muted)", borderRadius: "4px", overflow: "hidden", marginBottom: "10px" }}>
                <div style={{
                  width: `${(boundHistory.length / queue.length) * 100}%`,
                  height: "100%", background: "var(--primary)",
                  transition: "width 0.3s ease"
                }} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--muted-foreground)" }}>
                <span>Tuntas: <strong>{boundHistory.length}</strong></span>
                <span>Total: <strong>{queue.length}</strong></span>
              </div>
            </div>

            {/* Live Binding History */}
            <div style={{
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)", padding: "20px", flex: 1, overflowY: "auto", maxHeight: "420px"
            }}>
              <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
                Riwayat Binding ({boundHistory.length})
              </h4>

              {boundHistory.length === 0 ? (
                <p style={{ fontSize: "12px", color: "var(--muted-foreground)", textAlign: "center", padding: "20px 0" }}>
                  Belum ada item yang di-binding pada sesi ini.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {boundHistory.map((item, idx) => (
                    <div
                      key={item.id_item + idx}
                      className="animate-fade-in"
                      style={{
                        background: "var(--input-background)", border: "1px solid var(--border)",
                        borderRadius: "calc(var(--radius) - 2px)", padding: "10px 12px", fontSize: "12px"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{item.nama_produk}</span>
                        <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{item.bound_at}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: "monospace", color: "var(--primary)", fontSize: "11px" }}>
                        <span>UID:</span>
                        <span>{item.uid_fisik}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
