"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MessageSquare, Send, X, Headphones, Snowflake, Phone, ChevronRight, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

const ADMIN_UID = "SNOWD_ADMIN";
const SUPPORT_PHONE = "437-922-3895";

interface SupportMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: Date;
  read: boolean;
}

const PROBLEM_CATEGORIES = [
  { id: "payment", emoji: "💳", label: "Payment Issue", desc: "Charge, refund, or billing problem" },
  { id: "operator", emoji: "🚜", label: "Operator Problem", desc: "Operator didn't show, bad service" },
  { id: "account", emoji: "👤", label: "Account Help", desc: "Can't login, update info, or verify" },
  { id: "job", emoji: "📋", label: "Job Issue", desc: "Job status, scheduling, or cancellation" },
  { id: "safety", emoji: "🚨", label: "Safety Concern", desc: "Report unsafe behavior or property damage" },
  { id: "other", emoji: "💬", label: "Other", desc: "Something else" },
];

export default function SupportChatButton() {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [chatPhase, setChatPhase] = useState<"select" | "urgent" | "chat">("select");
  const [selectedProblem, setSelectedProblem] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [supportChatId, setSupportChatId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Don't show for admin/employee users
  if (profile?.role === "admin" || profile?.role === "employee") return null;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!user?.uid) return;
    const chatId = `support_${user.uid}`;
    setSupportChatId(chatId);
    const q = query(
      collection(db, "supportChats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((d) => {
        const data = d.data();
        return { id: d.id, ...data, createdAt: data.createdAt?.toDate?.() || new Date() } as SupportMessage;
      });
      setMessages(msgs);
      setUnreadCount(msgs.filter(m => m.senderId === ADMIN_UID && !m.read).length);
    }, () => {});
    return () => unsubscribe();
  }, [user?.uid]);

  // Mark messages as read when chat opened
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (isOpen && chatPhase === "chat" && supportChatId && user?.uid) {
      messages.filter(m => m.senderId === ADMIN_UID && !m.read).forEach(async (msg) => {
        try { await updateDoc(doc(db, "supportChats", supportChatId, "messages", msg.id), { read: true }); } catch {}
      });
    }
  }, [isOpen, chatPhase, messages, supportChatId, user?.uid]);

  // Auto scroll
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (chatPhase === "chat") setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [messages, chatPhase]);

  // If user already has messages, go straight to chat on open
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (isOpen && messages.length > 0 && chatPhase === "select") setChatPhase("chat");
  }, [isOpen, messages.length]);

  const startChatWithProblem = async (problemId: string) => {
    if (!user?.uid || !supportChatId) return;
    setChatPhase("chat");
    const prob = PROBLEM_CATEGORIES.find(p => p.id === problemId);
    if (!prob) return;
    const autoMsg = `Hi! I need help with: ${prob.emoji} ${prob.label} — ${prob.desc}`;
    try {
      await setDoc(doc(db, "supportChats", supportChatId), {
        userId: user.uid, userName: profile?.displayName || "User",
        userRole: profile?.role || "client", lastMessage: autoMsg,
        lastMessageTime: new Date(), updatedAt: new Date(), problemCategory: problemId,
      }, { merge: true });
      await addDoc(collection(db, "supportChats", supportChatId, "messages"), {
        senderId: user.uid, senderName: profile?.displayName || "User",
        content: autoMsg, createdAt: new Date(), read: false,
      });
    } catch (e) { console.error(e); }
  };

  const handleSelectProblem = (problemId: string) => {
    setSelectedProblem(problemId);
    if (problemId === "safety") { setChatPhase("urgent"); }
    else { startChatWithProblem(problemId); }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user?.uid || !supportChatId || sending) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");
    try {
      await setDoc(doc(db, "supportChats", supportChatId), {
        userId: user.uid, userName: profile?.displayName || "User",
        userRole: profile?.role || "client", lastMessage: content,
        lastMessageTime: new Date(), updatedAt: new Date(),
      }, { merge: true });
      await addDoc(collection(db, "supportChats", supportChatId, "messages"), {
        senderId: user.uid, senderName: profile?.displayName || "User",
        content, createdAt: new Date(), read: false,
      });
    } catch (error) { console.error(error); }
    finally { setSending(false); }
  };

  if (!user || !profile) return null;

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={() => { setIsOpen(true); if (messages.length === 0) setChatPhase("select"); }}
            className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-[100] w-14 h-14 bg-[#4361EE] hover:bg-[#3249D6] text-white rounded-full shadow-xl shadow-[#4361EE]/30 flex items-center justify-center transition-all duration-200 hover:scale-110 group"
          >
            <Headphones className="w-6 h-6" />
            {unreadCount > 0 && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow">
                {unreadCount}
              </motion.span>
            )}
            <span className="absolute right-full mr-3 bg-[var(--bg-card-solid)] text-[var(--text-primary)] text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg border border-[var(--border-color)] opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none">
              Need help?
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.94 }}
            transition={{ type: "spring", duration: 0.45, bounce: 0.18 }}
            className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-[100] w-[370px] max-w-[calc(100vw-2rem)] bg-[var(--bg-card-solid)] rounded-2xl shadow-2xl border border-[var(--border-color)] overflow-hidden flex flex-col"
            style={{ maxHeight: "80vh", minHeight: 400 }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#4361EE] to-[#7C3AED] px-4 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                  transition={{ repeat: Infinity, repeatDelay: 5, duration: 0.5 }}
                  className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
                >
                  <Snowflake className="w-4 h-4 text-white" />
                </motion.div>
                <div>
                  <p className="text-white font-semibold text-sm">snowd.ca Support</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                    <p className="text-white/70 text-xs">Online · Usually responds in minutes</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {chatPhase === "chat" && messages.length > 0 && (
                  <button onClick={() => setChatPhase("select")}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition text-white/70 hover:text-white text-xs font-medium px-2">
                    Topics
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Phases */}
            <AnimatePresence mode="wait">
              {/* Problem selection */}
              {chatPhase === "select" && (
                <motion.div key="select" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }} className="flex-1 overflow-y-auto p-4">
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Hi {profile.displayName?.split(" ")[0] || "there"}! 👋</p>
                    <p className="text-xs text-[var(--text-muted)]">What can we help you with today? Select a topic to get started.</p>
                  </div>
                  <div className="space-y-2">
                    {PROBLEM_CATEGORIES.map((cat, i) => (
                      <motion.button key={cat.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                        onClick={() => handleSelectProblem(cat.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[#4361EE]/10 border border-transparent hover:border-[#4361EE]/20 transition text-left group">
                        <span className="text-xl shrink-0">{cat.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[#4361EE] transition">{cat.label}</p>
                          <p className="text-xs text-[var(--text-muted)] truncate">{cat.desc}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#4361EE] shrink-0 transition" />
                      </motion.button>
                    ))}
                  </div>
                  <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                    onClick={() => setChatPhase("urgent")}
                    className="w-full mt-4 flex items-center justify-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 transition font-medium text-sm">
                    <AlertTriangle className="w-4 h-4" /> Mark as Urgent — I Need to Call
                  </motion.button>
                </motion.div>
              )}

              {/* Urgent */}
              {chatPhase === "urgent" && (
                <motion.div key="urgent" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.2 }} className="flex-1 overflow-y-auto p-5 flex flex-col items-center justify-center gap-5 text-center">
                  <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 1.8 }}
                    className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <Phone className="w-8 h-8 text-red-500" />
                  </motion.div>
                  <div>
                    <p className="text-lg font-bold text-[var(--text-primary)]">Urgent Support Line</p>
                    <p className="text-sm text-[var(--text-muted)] mt-1 max-w-[260px]">
                      Call us directly for immediate assistance with your account.
                    </p>
                  </div>
                  <a href={`tel:${SUPPORT_PHONE.replace(/-/g, "")}`}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-red-200 transition">
                    <Phone className="w-5 h-5" /> {SUPPORT_PHONE}
                  </a>
                  <p className="text-xs text-[var(--text-muted)]">For urgent matters only. For general questions, use the chat below.</p>
                  <button onClick={() => startChatWithProblem(selectedProblem || "other")}
                    className="flex items-center gap-1.5 text-xs text-[#4361EE] hover:underline transition">
                    <MessageSquare className="w-3.5 h-3.5" /> Continue via chat instead
                  </button>
                </motion.div>
              )}

              {/* Chat */}
              {chatPhase === "chat" && (
                <motion.div key="chat" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }} className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 && (
                      <div className="text-center py-8">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}
                          className="w-12 h-12 bg-[#4361EE]/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <MessageSquare className="w-6 h-6 text-[#4361EE]" />
                        </motion.div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">Support is ready to help!</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">Describe your issue and we&apos;ll get back to you ASAP.</p>
                      </div>
                    )}
                    {messages.map((msg, i) => {
                      const isMe = msg.senderId === user?.uid;
                      return (
                        <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.02, 0.3) }} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          {!isMe && (
                            <div className="w-6 h-6 bg-[#4361EE] rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 mt-auto shrink-0">
                              S
                            </div>
                          )}
                          <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm ${
                            isMe ? "bg-[#4361EE] text-white rounded-br-md" : "bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-bl-md"
                          }`}>
                            <p className="break-words">{msg.content}</p>
                            <p className={`text-[10px] mt-1 ${isMe ? "text-white/50" : "text-[var(--text-muted)]"}`}>
                              {format(msg.createdAt, "h:mm a")}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                  <div className="p-3 border-t border-[var(--border-color)] shrink-0">
                    <div className="flex items-center gap-2">
                      <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                        placeholder="Type a message..."
                        className="flex-1 px-3.5 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[#4361EE]/30 transition" />
                      <motion.button whileTap={{ scale: 0.9 }} onClick={handleSend} disabled={!newMessage.trim() || sending}
                        className="p-2.5 bg-[#4361EE] hover:bg-[#3249D6] text-white rounded-xl transition disabled:opacity-40">
                        <Send className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
