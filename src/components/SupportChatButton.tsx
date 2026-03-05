"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MessageSquare, Send, X, Headphones, Phone, ChevronRight, AlertTriangle } from "lucide-react";
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
  type?: string;
  statusValue?: string;
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
    const autoMsg = `I need help with: ${prob.label} — ${prob.desc}`;

    const FOLLOW_UP_QUESTIONS: Record<string, string> = {
      payment: "Thanks for reaching out! To help you with your payment issue, could you please provide:\n\n• What type of issue are you experiencing? (e.g., incorrect charge, missing refund, card declined)\n• The date and approximate amount of the transaction\n• Any error messages you may have received",
      operator: "Thanks for reaching out! To assist you with your operator concern, could you please tell us:\n\n• What happened, and when did this occur?\n• What was the job address or booking ID?\n• Did you receive any communication or updates from the operator?",
      account: "Thanks for reaching out! To help you with your account, we'll need a few details:\n\n• What specific issue are you experiencing? (e.g., can't log in, need to update info)\n• Which email address is associated with your account?\n• When did this issue start?",
      job: "Thanks for reaching out! To help with your job issue, please provide:\n\n• Your approximate booking date and job address\n• What status is your job currently showing in the app?\n• A brief description of what went wrong",
      safety: "Thank you for flagging this. If you are in immediate danger, please call 911.\n\nTo document your safety concern, please tell us:\n\n• What happened and when?\n• Names or account details of anyone involved\n• Any evidence or photos you may have",
      other: "Thanks for reaching out! Please describe your issue in as much detail as possible, including:\n\n• What you were trying to do\n• Any error messages or unexpected behavior\n• Relevant dates, amounts, or account details\n\nOur support team will review your message and get back to you shortly.",
    };

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
      // Send automated follow-up questions after a brief delay
      const followUp = FOLLOW_UP_QUESTIONS[problemId] || FOLLOW_UP_QUESTIONS.other;
      setTimeout(async () => {
        try {
          await addDoc(collection(db, "supportChats", supportChatId, "messages"), {
            senderId: ADMIN_UID, senderName: "SNOWD Support",
            content: followUp, createdAt: new Date(), read: false, type: "auto-reply",
          });
          await setDoc(doc(db, "supportChats", supportChatId), {
            lastMessage: followUp, lastMessageTime: new Date(), updatedAt: new Date(),
          }, { merge: true });
        } catch {}
      }, 1200);
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
            data-tour="support-chat"
            className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-[100] w-14 h-14 bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white rounded-full shadow-xl shadow-[#2F6FED]/30 flex items-center justify-center transition-all duration-200 hover:scale-105 group"
          >
            <Headphones className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow">
                {unreadCount}
              </span>
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
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
            className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-[100] w-[370px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
            style={{ maxHeight: "80vh", minHeight: 420 }}
          >
            {/* Header — clean, no gradient */}
            <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[var(--accent)] rounded-xl flex items-center justify-center shrink-0">
                  <Headphones className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">snowd.ca Support</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    <p className="text-gray-500 text-xs">Online · Replies in minutes</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {chatPhase === "chat" && messages.length > 0 && (
                  <button onClick={() => setChatPhase("select")}
                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-gray-600 text-xs font-semibold">
                    Topics
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Phases */}
            <AnimatePresence mode="wait">
              {/* Problem selection */}
              {chatPhase === "select" && (
                <motion.div key="select" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }} className="flex-1 overflow-y-auto bg-[#F8FAFC]">
                  <div className="p-4 pb-2">
                    <p className="text-sm font-bold text-gray-900">Hi, {profile.displayName?.split(" ")[0] || "there"}!</p>
                    <p className="text-xs text-gray-500 mt-0.5">What can we help you with? Select a topic below.</p>
                  </div>
                  <div className="px-3 pb-3 space-y-1.5">
                    {PROBLEM_CATEGORIES.map((cat, i) => (
                      <motion.button key={cat.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        onClick={() => handleSelectProblem(cat.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-white hover:bg-[var(--accent-soft)] border border-gray-100 hover:border-[rgba(47,111,237,0.2)] transition text-left group shadow-sm">
                        <span className="text-lg shrink-0 leading-none">{cat.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 group-hover:text-[var(--accent)] transition">{cat.label}</p>
                          <p className="text-xs text-gray-500 truncate">{cat.desc}</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[var(--accent)] shrink-0 transition" />
                      </motion.button>
                    ))}
                  </div>
                  <div className="px-3 pb-4">
                    <button onClick={() => setChatPhase("urgent")}
                      className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 transition font-semibold text-sm">
                      <AlertTriangle className="w-3.5 h-3.5" /> Urgent — I Need to Call
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Urgent */}
              {chatPhase === "urgent" && (
                <motion.div key="urgent" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.2 }} className="flex-1 overflow-y-auto p-5 flex flex-col items-center justify-center gap-5 text-center bg-white">
                  <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center">
                    <Phone className="w-7 h-7 text-red-500" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900">Urgent Support Line</p>
                    <p className="text-sm text-gray-500 mt-1 max-w-[240px]">
                      Call us directly for immediate help.
                    </p>
                  </div>
                  <a href={`tel:${SUPPORT_PHONE.replace(/-/g, "")}`}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-base shadow-sm shadow-red-200 transition">
                    <Phone className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} /> {SUPPORT_PHONE}
                  </a>
                  <p className="text-xs text-gray-400">For urgent matters only.</p>
                  <button onClick={() => startChatWithProblem(selectedProblem || "other")}
                    className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline transition">
                    <MessageSquare className="w-3.5 h-3.5" /> Continue via chat instead
                  </button>
                </motion.div>
              )}

              {/* Chat */}
              {chatPhase === "chat" && (
                <motion.div key="chat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }} className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 bg-[#EBF0F5]">
                    {messages.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm mb-2">
                          <MessageSquare className="w-5 h-5 text-[var(--accent)]" />
                        </div>
                        <p className="text-sm font-semibold text-gray-600">Support is online</p>
                        <p className="text-xs text-gray-400 mt-0.5">Describe your issue and we&apos;ll help ASAP.</p>
                      </div>
                    )}
                    {messages.map((msg, i) => {
                      const isMe = msg.senderId === user?.uid;

                      // Status-update system message
                      if (msg.type === "status-update") {
                        const isResolved = msg.statusValue === "resolved";
                        const isInProgress = msg.statusValue === "in-progress";
                        return (
                          <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(i * 0.02, 0.3) }} className="flex justify-center my-2">
                            <div className={`px-4 py-2.5 rounded-full border text-xs font-semibold flex items-center gap-2 ${
                              isResolved ? "bg-green-50 border-green-200 text-green-700"
                                : isInProgress ? "bg-blue-50 border-blue-200 text-blue-700"
                                : "bg-gray-100 border-gray-200 text-gray-600"
                            }`}>
                              <span>{isResolved ? "✅" : isInProgress ? "👀" : "🔄"}</span>
                              <span>{isResolved ? "Issue Resolved" : isInProgress ? "Under Review" : "Status Updated"}</span>
                            </div>
                          </motion.div>
                        );
                      }

                      return (
                        <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.02, 0.3) }} className={`flex ${isMe ? "justify-end" : "justify-start"} items-end gap-1.5`}>
                          {!isMe && (
                            <div className="w-6 h-6 bg-[var(--accent)] rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                              S
                            </div>
                          )}
                          <div className={`max-w-[80%] px-3 py-2 rounded-2xl shadow-sm text-sm ${
                            isMe ? "bg-[var(--accent)] text-white rounded-tr-sm" : "bg-white text-gray-900 rounded-tl-sm"
                          }`}>
                            <p className="break-words whitespace-pre-line leading-relaxed">{msg.content}</p>
                            <p className={`text-[10px] mt-0.5 text-right ${isMe ? "text-white/50" : "text-gray-400"}`}>
                              {format(msg.createdAt, "h:mm a")}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                  <div className="p-3 border-t border-gray-100 bg-white shrink-0">
                    <div className="flex items-center gap-2">
                      <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                        placeholder="Type your message..."
                        className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#2F6FED]/40 focus:bg-white transition" />
                      <button onClick={handleSend} disabled={!newMessage.trim() || sending}
                        className="p-2.5 bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white rounded-xl transition disabled:opacity-40 shrink-0">
                        <Send className="w-4 h-4" />
                      </button>
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
