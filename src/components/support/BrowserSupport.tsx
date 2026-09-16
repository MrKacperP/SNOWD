"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useAuth } from "@/context/AuthContext";
import styles from "./browser-support.module.css";

type Incoming = { id: string; callerName: string };
type Call = Incoming & { status: string; offer?: RTCSessionDescriptionInit; answer?: RTCSessionDescriptionInit };
type Pointer = { x: number; y: number; click: boolean };
const SupportContext = createContext<{ start: () => void; busy: boolean }>({ start: () => {}, busy: false });
export const useBrowserSupport = () => useContext(SupportContext);

function Media({ stream, muted = false, video = true, onPointer }: { stream: MediaStream | null; muted?: boolean; video?: boolean; onPointer?: (point: Pointer | null) => void }) {
  const ref = useRef<HTMLVideoElement & HTMLAudioElement>(null);
  useEffect(() => { if (ref.current) { ref.current.srcObject = stream; void ref.current.play().catch(() => {}); } }, [stream]);
  if (!video) return <audio ref={ref} autoPlay controls aria-label="Call audio" />;
  return <video ref={ref} autoPlay playsInline muted={muted} className={styles.video}
    onPointerLeave={() => onPointer?.(null)}
    onPointerMove={event => {
      const el = event.currentTarget, rect = el.getBoundingClientRect();
      if (!el.videoWidth || !el.videoHeight) return;
      const scale = Math.min(rect.width / el.videoWidth, rect.height / el.videoHeight);
      const width = el.videoWidth * scale, height = el.videoHeight * scale;
      const x = (event.clientX - rect.left - (rect.width - width) / 2) / width;
      const y = (event.clientY - rect.top - (rect.height - height) / 2) / height;
      onPointer?.(x >= 0 && x <= 1 && y >= 0 && y <= 1 ? { x, y, click: false } : null);
    }}
    onClick={event => {
      const el = event.currentTarget, rect = el.getBoundingClientRect();
      if (!el.videoWidth || !el.videoHeight) return;
      const scale = Math.min(rect.width / el.videoWidth, rect.height / el.videoHeight);
      const width = el.videoWidth * scale, height = el.videoHeight * scale;
      const x = (event.clientX - rect.left - (rect.width - width) / 2) / width;
      const y = (event.clientY - rect.top - (rect.height - height) / 2) / height;
      if (x >= 0 && x <= 1 && y >= 0 && y <= 1) onPointer?.({ x, y, click: true });
    }} />;
}

async function localDescription(pc: RTCPeerConnection, type: "offer" | "answer") {
  await pc.setLocalDescription(type === "offer" ? await pc.createOffer() : await pc.createAnswer());
  if (pc.iceGatheringState !== "complete") await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => { pc.removeEventListener("icegatheringstatechange", listener); reject(new Error("Connection setup timed out. Please try again.")); }, 15000);
    const listener = () => { if (pc.iceGatheringState === "complete") { clearTimeout(timeout); pc.removeEventListener("icegatheringstatechange", listener); resolve(); } };
    pc.addEventListener("icegatheringstatechange", listener);
    listener();
  });
  return pc.localDescription?.toJSON();
}

export default function BrowserSupport({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const pathname = usePathname();
  const staff = profile?.role === "admin" || profile?.role === "employee";
  const [incoming, setIncoming] = useState<Incoming[]>([]);
  const [call, setCall] = useState<Incoming | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [camera, setCamera] = useState<MediaStream | null>(null);
  const [screen, setScreen] = useState<MediaStream | null>(null);
  const [audio, setAudio] = useState<MediaStream | null>(null);
  const [remoteCamera, setRemoteCamera] = useState<MediaStream | null>(null);
  const [remoteScreen, setRemoteScreen] = useState<MediaStream | null>(null);
  const [remoteSharing, setRemoteSharing] = useState({ camera: false, screen: false, guidance: false });
  const [guidance, setGuidance] = useState(false);
  const [pointer, setPointer] = useState<Pointer | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [mediaBusy, setMediaBusy] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channel = useRef<RTCDataChannel | null>(null);
  const streams = useRef<MediaStream[]>([]);
  const activeId = useRef<string | null>(null);
  const generation = useRef(0);
  const busyRef = useRef(false);
  const pointerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sharing = useRef({ camera: false, screen: false, guidance: false });
  const lastPoint = useRef(0);
  const ringtone = useRef<AudioContext | null>(null);
  const connectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const api = useCallback(async (params: string | Record<string, unknown>) => {
    if (!user) throw new Error("Please sign in to call support.");
    const res = await fetch(`/api/support-calls${typeof params === "string" ? params : ""}`, {
      method: typeof params === "string" ? "GET" : "POST",
      headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
      ...(typeof params === "string" ? {} : { body: JSON.stringify(params) }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Call unavailable.");
    return data;
  }, [user]);
  const send = useCallback((data: unknown) => { if (channel.current?.readyState === "open") channel.current.send(JSON.stringify(data)); }, []);
  const clean = useCallback(() => {
    generation.current++;
    if (connectionTimer.current) clearTimeout(connectionTimer.current);
    setMediaBusy(false);
    streams.current.forEach(stream => stream.getTracks().forEach(track => track.stop()));
    streams.current = [];
    if (pcRef.current) { pcRef.current.onconnectionstatechange = null; pcRef.current.close(); }
    pcRef.current = null; channel.current = null; activeId.current = null; busyRef.current = false;
    sharing.current = { camera: false, screen: false, guidance: false };
    if (pointerTimer.current) clearTimeout(pointerTimer.current);
    setCall(null); setBusy(false); setConnected(false); setCamera(null); setScreen(null); setAudio(null);
    setRemoteCamera(null); setRemoteScreen(null); setPointer(null); setGuidance(false); setMuted(false);
    setRemoteSharing({ camera: false, screen: false, guidance: false });
  }, []);
  const end = useCallback(async () => {
    const id = activeId.current;
    send({ type: "end" }); clean(); setStatus("");
    if (id) try { await api({ action: "end", id }); } catch (e) { setError((e as Error).message); }
  }, [api, clean, send]);

  useEffect(() => {
    return () => {
      const id = activeId.current;
      if (id) void api({ action: "end", id }).catch(() => {});
      clean();
    };
  }, [api, clean]);

  useEffect(() => {
    if (!user || !staff || !pathname.startsWith("/admin") || busy) return;
    let cancelled = false, timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try { const result = await api(""); if (!cancelled) setIncoming(result.calls); }
      catch { if (!cancelled) setIncoming([]); }
      if (!cancelled) timer = setTimeout(poll, 4000);
    };
    void poll(); return () => { cancelled = true; clearTimeout(timer); };
  }, [api, user, staff, pathname, busy]);

  const ringingId = !busy && staff && pathname.startsWith("/admin") ? incoming[0]?.id : undefined;
  useEffect(() => {
    if (!ringingId) return;
    const title = document.title;
    document.title = "Incoming support call · SNOWD";
    const context = new AudioContext(); ringtone.current = context;
    const ring = () => {
      if (context.state !== "running") return;
      for (const offset of [0, 0.35]) {
        const tone = context.createOscillator(), gain = context.createGain();
        tone.frequency.value = 660; gain.gain.value = 0.035;
        tone.connect(gain); gain.connect(context.destination);
        tone.start(context.currentTime + offset); tone.stop(context.currentTime + offset + 0.18);
      }
    };
    ring(); const timer = setInterval(ring, 4000);
    return () => { clearInterval(timer); void context.close(); ringtone.current = null; document.title = title; };
  }, [ringingId]);

  useEffect(() => {
    if (!call) return;
    let cancelled = false, timer: ReturnType<typeof setTimeout>, lastHeartbeat = 0, lastSuccess = Date.now();
    const poll = async () => {
      try {
        const data: Call = await api(`?id=${call.id}`);
        if (cancelled) return;
        lastSuccess = Date.now();
        if (data.status === "ended") { clean(); setStatus("Call ended or was not answered. You can try again or call 437-922-3895."); return; }
        const pc = pcRef.current;
        if (!staff && data.answer && pc && !pc.currentRemoteDescription) await pc.setRemoteDescription(data.answer);
        if (data.status === "active" && Date.now() - lastHeartbeat > 30000) { await api({ action: "heartbeat", id: call.id }); lastHeartbeat = Date.now(); }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          if (Date.now() - lastSuccess > 30000) { clean(); setStatus("Call ended after losing the support connection."); return; }
        }
      }
      if (!cancelled) timer = setTimeout(poll, 2000);
    };
    void poll(); return () => { cancelled = true; clearTimeout(timer); };
  }, [call, api, staff, clean]);

  const wireChannel = (dc: RTCDataChannel) => {
    channel.current = dc;
    dc.onopen = () => send({ type: "sharing", ...sharing.current });
    dc.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "end") { const id = activeId.current; clean(); setStatus("Call ended."); if (id) void api({ action: "end", id }).catch(() => {}); }
        if (staff && data.type === "sharing") setRemoteSharing({ camera: data.camera === true, screen: data.screen === true, guidance: data.guidance === true });
        if (!staff && data.type === "pointer" && sharing.current.screen && sharing.current.guidance) {
          if (pointerTimer.current) clearTimeout(pointerTimer.current);
          if (Number.isFinite(data.x) && Number.isFinite(data.y) && data.x >= 0 && data.x <= 1 && data.y >= 0 && data.y <= 1) {
            setPointer({ x: data.x, y: data.y, click: data.click === true });
            pointerTimer.current = setTimeout(() => setPointer(null), 1500);
          } else setPointer(null);
        }
      } catch { /* Ignore malformed peer messages. */ }
    };
  };

  const begin = async (incomingCall?: Incoming) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setExpanded(true); setError(""); setStatus(incomingCall ? "Answering…" : "Starting browser call…");
    const attempt = ++generation.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) throw new Error("Browser calling requires HTTPS and a browser with microphone support.");
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (attempt !== generation.current) { mic.getTracks().forEach(track => track.stop()); return; }
      streams.current.push(mic);
      const config = await api("?config=1");
      if (attempt !== generation.current) return;
      const pc = new RTCPeerConnection(config); pcRef.current = pc;
      pc.onconnectionstatechange = () => {
        if (connectionTimer.current) clearTimeout(connectionTimer.current);
        if (["connecting", "disconnected"].includes(pc.connectionState)) connectionTimer.current = setTimeout(() => { setError("Connection lost. Please call again."); void end(); }, 30000);
        if (pc.connectionState === "connected") { setConnected(true); setStatus("Connected to support"); setError(""); }
        if (pc.connectionState === "disconnected") setStatus("Connection interrupted. Reconnecting…");
        if (pc.connectionState === "failed") { setError("The call could not connect. Try another network or call 437-922-3895."); void end(); }
      };
      pc.ontrack = event => {
        const stream = new MediaStream([event.track]);
        if (event.track.kind === "audio") setAudio(stream);
        else if (pc.getTransceivers().indexOf(event.transceiver) === 1) setRemoteCamera(stream);
        else setRemoteScreen(stream);
      };
      if (incomingCall) {
        const data: Call = await api(`?id=${incomingCall.id}`);
        if (attempt !== generation.current) return;
        if (data.status !== "ringing" || !data.offer) throw new Error("This call is no longer ringing.");
        pc.ondatachannel = event => wireChannel(event.channel);
        await pc.setRemoteDescription(data.offer);
        const audioTransceiver = pc.getTransceivers()[0];
        await audioTransceiver.sender.replaceTrack(mic.getAudioTracks()[0]);
        audioTransceiver.direction = "sendrecv";
        pc.getTransceivers().slice(1).forEach(transceiver => { transceiver.direction = "recvonly"; });
        const answer = await localDescription(pc, "answer");
        if (attempt !== generation.current) return;
        await api({ action: "answer", id: incomingCall.id, answer });
        if (attempt !== generation.current) { void api({ action: "end", id: incomingCall.id }).catch(() => {}); return; }
        activeId.current = incomingCall.id; setCall(incomingCall); setIncoming([]); setStatus("Connecting…");
      } else {
        pc.addTransceiver(mic.getAudioTracks()[0], { direction: "sendrecv", streams: [mic] });
        pc.addTransceiver("video", { direction: "sendonly" });
        pc.addTransceiver("video", { direction: "sendonly" });
        wireChannel(pc.createDataChannel("support-guidance"));
        const offer = await localDescription(pc, "offer");
        if (attempt !== generation.current) return;
        const result = await api({ action: "start", offer });
        if (attempt !== generation.current) { void api({ action: "end", id: result.id }).catch(() => {}); return; }
        activeId.current = result.id; setCall({ id: result.id, callerName: "SNOWD Support" }); setStatus("Calling support… Waiting for an admin to answer.");
      }
    } catch (e) { if (attempt === generation.current) { clean(); setStatus(""); setError((e as Error).message); } }
  };

  const toggleMedia = async (kind: "camera" | "screen") => {
    if (mediaBusy || !connected) return;
    setMediaBusy(true); setError("");
    const pc = pcRef.current;
    const existing = kind === "camera" ? camera : screen;
    const update = (stream: MediaStream | null) => {
      if (kind === "camera") setCamera(stream); else { setScreen(stream); setGuidance(false); setPointer(null); sharing.current.guidance = false; }
      sharing.current[kind] = Boolean(stream); send({ type: "sharing", ...sharing.current });
    };
    try {
      const sender = pc?.getTransceivers()[kind === "camera" ? 1 : 2]?.sender;
      if (!sender) return;
      if (existing) { await sender.replaceTrack(null); existing.getTracks().forEach(track => track.stop()); update(null); return; }
      if (kind === "screen" && !navigator.mediaDevices.getDisplayMedia) throw new Error("Screen sharing is unavailable in this browser. Try a desktop browser.");
      const stream = kind === "camera" ? await navigator.mediaDevices.getUserMedia({ video: true, audio: false }) : await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false, preferCurrentTab: true } as DisplayMediaStreamOptions);
      if (pc !== pcRef.current) { stream.getTracks().forEach(track => track.stop()); return; }
      streams.current.push(stream);
      try { await sender.replaceTrack(stream.getVideoTracks()[0]); } catch (e) { stream.getTracks().forEach(track => track.stop()); throw e; }
      update(stream);
      stream.getVideoTracks()[0].onended = () => { if (pc === pcRef.current) { void sender.replaceTrack(null).catch(() => {}); update(null); } };
    } catch (e) { setError((e as Error).message); } finally { setMediaBusy(false); }
  };

  const sendPointer = (point: Pointer | null) => {
    if (!remoteSharing.screen || !remoteSharing.guidance) return;
    if (point && !point.click && Date.now() - lastPoint.current < 50) return;
    lastPoint.current = Date.now(); send({ type: "pointer", ...point });
  };

  return <SupportContext.Provider value={{ start: () => { void begin(); }, busy }}>
    {children}
    {typeof document !== "undefined" && createPortal(<>
      {pointer && !staff && screen && guidance && <div className={`${styles.pointer} ${pointer.click ? styles.clicked : ""}`} style={{ left: `${pointer.x * 100}vw`, top: `${pointer.y * 100}vh` }}><span>↖</span><b>Support{pointer.click ? " · click" : ""}</b></div>}
      {(busy || error || status || (staff && pathname.startsWith("/admin") && incoming.length > 0)) && <section className={`${styles.panel} ${staff && expanded && remoteSharing.screen ? styles.wide : ""}`} aria-label="Browser support call">
        <header><strong>{busy ? (staff ? `Call with ${call?.callerName || "caller"}` : "SNOWD browser support") : "Support calls"}</strong>{busy && <button onClick={() => setExpanded(!expanded)}>{expanded ? "Minimize" : "Expand"}</button>}</header>
        {status && <p role="status">{status}</p>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        {!busy && staff && pathname.startsWith("/admin") && incoming.map(item => <div className={styles.incoming} key={item.id}><p><strong>{item.callerName}</strong> is calling support</p><div className={styles.actions}><button onClick={() => void begin(item)}>Answer with microphone</button><button onClick={() => { void api({ action: "end", id: item.id }).then(() => setIncoming(list => list.filter(call => call.id !== item.id))).catch(e => setError(e.message)); }}>Decline</button></div></div>)}
        {ringingId && <button onClick={() => { void ringtone.current?.resume(); }}>Enable ringtone sound</button>}
        {audio && <Media stream={audio} video={false} />}
        {busy && expanded && <>
          {staff ? <>
            <p>Your camera is off. Only your microphone is shared.</p>
            {remoteSharing.camera && <div className={styles.preview}><Media stream={remoteCamera} /></div>}
            {remoteSharing.screen && <><p>{remoteSharing.guidance ? "Move or click on the shared screen to point things out to the caller." : "Screen shared. The caller can enable pointer guidance for this SNOWD tab."}</p><Media stream={remoteScreen} onPointer={sendPointer} /></>}
          </> : <>
            <p>Camera and screen sharing are optional. You can stop either at any time.</p>
            {camera && <div className={styles.preview}><Media stream={camera} muted /></div>}
            <div className={styles.actions}>
              <button disabled={!connected || mediaBusy} onClick={() => void toggleMedia("camera")}>{camera ? "Stop camera" : "Share camera"}</button>
              <button disabled={!connected || mediaBusy} onClick={() => void toggleMedia("screen")}>{screen ? "Stop sharing screen" : "Share screen"}</button>
            </div>
            {screen && <label className={styles.consent}><input type="checkbox" checked={guidance} disabled={!!screen.getVideoTracks()[0]?.getSettings().displaySurface && screen.getVideoTracks()[0]?.getSettings().displaySurface !== "browser"} onChange={event => { const enabled = event.target.checked; setGuidance(enabled); setPointer(null); sharing.current.guidance = enabled; send({ type: "sharing", ...sharing.current }); }} /> I am sharing this SNOWD tab. Show support’s pointer on my page.</label>}
            {screen && !guidance && <p>To use the pointer, select this browser tab in the screen-sharing picker and enable the checkbox above.</p>}
            {guidance && <p>Support clicks show a marker. You stay in control of buttons and forms.</p>}
          </>}
        </>}
        {busy ? <div className={`${styles.actions} ${styles.controls}`}><button onClick={() => { const next = !muted; setMuted(next); streams.current.flatMap(stream => stream.getAudioTracks()).forEach(track => { track.enabled = !next; }); }}>{muted ? "Unmute" : "Mute"}</button><button className={styles.end} onClick={() => void end()}>{connected ? "End call" : "Cancel call"}</button></div> : <button onClick={() => { setError(""); setStatus(""); }}>Dismiss</button>}
      </section>}
    </>, document.body)}
  </SupportContext.Provider>;
}
