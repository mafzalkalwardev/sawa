"use client";

import { useEffect, useRef, useState } from "react";

type Ice = { id: string; fromKind: string; candidate: string };
type CallState = {
  id: string;
  status: string;
  callerKind: string;
  offer: string | null;
  answer: string | null;
  ice: Ice[];
};

const stun = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export function CallBox({ bookingId, locale }: { bookingId: string; locale: string }) {
  const ar = locale === "ar";
  const [peer, setPeer] = useState("");
  const [role, setRole] = useState("");
  const [call, setCall] = useState<CallState | null>(null);
  const [phase, setPhase] = useState("");
  const [problem, setProblem] = useState("");
  const pc = useRef<RTCPeerConnection | null>(null);
  const callId = useRef("");
  const local = useRef<HTMLAudioElement | null>(null);
  const remote = useRef<HTMLAudioElement | null>(null);
  const seen = useRef(new Set<string>());
  const applied = useRef({ offer: false, answer: false });
  const ending = useRef(false);
  const wait = useRef(0);

  async function post(body: Record<string, string>) {
    await fetch(`/api/calls/${bookingId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  }

  function leave(message: string) {
    if (ending.current) return;
    ending.current = true;
    window.clearTimeout(wait.current);
    const id = callId.current;
    if (id) void post({ action: "hangup", id });
    pc.current?.getSenders().forEach((sender) => sender.track?.stop());
    pc.current?.close();
    pc.current = null;
    callId.current = "";
    applied.current = { offer: false, answer: false };
    setPhase("");
    setCall(null);
    if (message) setProblem(message);
  }

  function arm() {
    window.clearTimeout(wait.current);
    wait.current = window.setTimeout(() => {
      const node = pc.current;
      if (!node) return;
      const state = node.iceConnectionState;
      if (state === "connected" || state === "completed") return;
      leave(ar ? "تعذر توصيل المكالمة. أغلقت لدى الطرفين." : "The call could not connect. It closed on both phones.");
    }, 25000);
  }

  function connection() {
    if (pc.current) return pc.current;
    const next = new RTCPeerConnection(stun);
    next.onicecandidate = (event) => {
      if (event.candidate && callId.current) void post({ action: "ice", id: callId.current, candidate: JSON.stringify(event.candidate) });
    };
    next.ontrack = (event) => {
      if (remote.current) remote.current.srcObject = event.streams[0];
    };
    next.oniceconnectionstatechange = () => {
      if (next.iceConnectionState === "failed") {
        leave(ar ? "تعذر توصيل المكالمة. أغلقت لدى الطرفين." : "The call could not connect. It closed on both phones.");
      }
    };
    pc.current = next;
    return next;
  }

  async function microphone() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    if (local.current) local.current.srcObject = stream;
    stream.getTracks().forEach((track) => connection().addTrack(track, stream));
    return stream;
  }

  async function start() {
    setProblem("");
    ending.current = false;
    try {
      const created = await fetch(`/api/calls/${bookingId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "ring" }),
      }).then((response) => response.json());
      callId.current = created.id;
      await microphone();
      const node = connection();
      const offer = await node.createOffer();
      await node.setLocalDescription(offer);
      await post({ action: "offer", id: created.id, offer: JSON.stringify(offer) });
      setPhase("calling");
      arm();
    } catch {
      setProblem(ar ? "الميكروفون غير متاح على هذا الهاتف." : "The microphone is not available on this phone.");
    }
  }

  async function accept(current: CallState) {
    setProblem("");
    ending.current = false;
    try {
      callId.current = current.id;
      await microphone();
      const node = connection();
      if (current.offer) await node.setRemoteDescription(JSON.parse(current.offer));
      const answer = await node.createAnswer();
      await node.setLocalDescription(answer);
      await post({ action: "answer", id: current.id, answer: JSON.stringify(answer) });
      setPhase("talking");
      arm();
    } catch {
      setProblem(ar ? "الميكروفون غير متاح على هذا الهاتف." : "The microphone is not available on this phone.");
    }
  }

  async function hangup(current: CallState | null) {
    window.clearTimeout(wait.current);
    ending.current = true;
    if (current) await post({ action: "hangup", id: current.id });
    pc.current?.getSenders().forEach((sender) => sender.track?.stop());
    pc.current?.close();
    pc.current = null;
    callId.current = "";
    applied.current = { offer: false, answer: false };
    setPhase("");
    setCall(null);
  }

  useEffect(() => {
    let stop = false;
    async function poll() {
      const response = await fetch(`/api/calls/${bookingId}`);
      if (!response.ok || stop) return;
      const data = await response.json();
      setPeer(data.peerName || "");
      setRole(data.role || "");
      const next = data.call as CallState | null;
      setCall(next);
      if (!next || next.status === "declined" || next.status === "ended") {
        if (pc.current || callId.current) {
          window.clearTimeout(wait.current);
          ending.current = true;
          pc.current?.getSenders().forEach((sender) => sender.track?.stop());
          pc.current?.close();
          pc.current = null;
          callId.current = "";
          applied.current = { offer: false, answer: false };
          setPhase("");
        }
        return;
      }
      const node = pc.current;
      if (node && next.answer && !applied.current.answer && next.callerKind === data.role) {
        applied.current.answer = true;
        await node.setRemoteDescription(JSON.parse(next.answer));
        setPhase("talking");
      }
      if (node) {
        for (const item of next.ice) {
          if (item.fromKind === data.role || seen.current.has(item.id)) continue;
          seen.current.add(item.id);
          try {
            await node.addIceCandidate(JSON.parse(item.candidate));
          } catch {
            seen.current.delete(item.id);
          }
        }
      }
    }
    const timer = setInterval(() => void poll(), 2000);
    void poll();
    return () => {
      stop = true;
      clearInterval(timer);
      window.clearTimeout(wait.current);
    };
  }, [bookingId]);

  const incoming = call && call.status === "ringing" && call.callerKind !== role && phase !== "talking";
  return (
    <section className="card stack">
      <h2>{ar ? "مكالمة داخل التطبيق" : "Call inside the app"}</h2>
      <p className="muted">{ar ? `الرقم يبقى مخفيًا. يجب أن يفتح ${peer || "الطرف الآخر"} هذه الرحلة.` : `The number stays hidden. ${peer || "The other person"} needs this ride open.`}</p>
      <audio ref={local} autoPlay muted />
      <audio ref={remote} autoPlay />
      {problem ? <p className="alert">{problem}</p> : null}
      {phase === "talking" ? <p>{ar ? "المكالمة مفتوحة." : "The call is open."}</p> : null}
      {phase === "calling" ? <p>{ar ? "يرن الآن." : "Ringing now."}</p> : null}
      {incoming && call ? (
        <div className="row">
          <button className="btn" type="button" onClick={() => void accept(call)}>{ar ? "رد" : "Answer"}</button>
          <button className="btn ghost" type="button" onClick={() => void post({ action: "decline", id: call.id })}>{ar ? "رفض" : "Decline"}</button>
        </div>
      ) : null}
      {!phase && !incoming ? <button className="btn" type="button" onClick={() => void start()}>{ar ? "اتصل" : "Call"}</button> : null}
      {phase ? <button className="btn danger" type="button" onClick={() => void hangup(call)}>{ar ? "أغلق" : "Hang up"}</button> : null}
    </section>
  );
}
