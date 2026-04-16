import { useState, useEffect, useRef } from "react";
import { Send, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { formatDate } from "../../utils/formatters";
import styles from "./AdminSupportPage.module.css";

interface Ticket {
  id: string;
  user: string;
  userName: string;
  subject: string;
  status: string;
  createdAt: string;
  lastMessage?: string;
  messageCount: number;
}

interface Message {
  id: string;
  text: string;
  isAdmin: boolean;
  createdAt: string;
  senderName: string;
}

export function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem("nid_token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/admin/support/tickets", { headers });
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
        if (!selected && data.length > 0) selectTicket(data[0]);
      }
    } catch (err) { console.error("Failed to fetch tickets:", err); }
    setLoading(false);
  };

  const selectTicket = async (ticket: Ticket) => {
    setSelected(ticket);
    setReplyText("");
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticket.id}/messages`, { headers });
      if (res.ok) setMessages(await res.json());
    } catch (err) { console.error("Failed to fetch messages:", err); }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selected) return;
    try {
      const res = await fetch(`/api/admin/support/tickets/${selected.id}/reply`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ text: replyText })
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages(prev => [...prev, msg]);
        setReplyText("");
      }
    } catch (err) { console.error("Failed to send reply:", err); }
  };

  const closeTicket = async () => {
    if (!selected) return;
    try {
      await fetch(`/api/admin/support/tickets/${selected.id}/close`, { method: "POST", headers });
      setTickets(prev => prev.map(t => t.id === selected.id ? { ...t, status: "Closed" } : t));
      setSelected({ ...selected, status: "Closed" });
    } catch (err) { console.error("Failed to close ticket:", err); }
  };

  const extractDesignId = (): string | null => {
    if (!selected?.subject?.startsWith("Апелляция:")) return null;
    for (const m of messages) {
      const match = m.text.match(/ID \u0434\u0438\u0437\u0430\u0439\u043d\u0430:\s*([0-9a-f-]{36})/i);
      if (match) return match[1];
    }
    return null;
  };

  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);

  const handleDesignAction = async (designId: string, action: "approve" | "reject") => {
    setActionLoading(true);
    setActionResult(null);
    try {
      const url = `/api/admin/moderation/designs/${designId}/${action}`;
      const body = action === "reject" ? JSON.stringify({ reason: "Отклонено повторно администратором" }) : undefined;
      const res = await fetch(url, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body,
      });
      if (res.ok) {
        const label = action === "approve" ? "✅ Дизайн одобрен!" : "❌ Дизайн отклонён повторно";
        setActionResult(label);
        await fetch(`/api/admin/support/tickets/${selected!.id}/reply`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ text: label }),
        });
        const msgRes = await fetch(`/api/admin/support/tickets/${selected!.id}/messages`, { headers });
        if (msgRes.ok) setMessages(await msgRes.json());
      } else {
        const err = await res.json().catch(() => null);
        setActionResult(`Ошибка: ${err?.message || res.statusText}`);
      }
    } catch {
      setActionResult("Ошибка сети");
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const open = tickets.filter(t => t.status === "Open");
  const closed = tickets.filter(t => t.status === "Closed");

  if (loading) return <div className={styles.loading}>Загрузка...</div>;

  return (
    <div className={styles.container}>
      <div>
        <h1 className={styles.title}>Поддержка</h1>
        <p className={styles.subtitle}>
          Открытых обращений: <span className={styles.subtitleAccent}>{open.length}</span>
        </p>
      </div>

      <div className={styles.mainLayout}>
        {/* Ticket List */}
        <div className={styles.ticketList}>
          {tickets.length === 0 && (
            <div className={styles.ticketListEmpty}>Нет обращений</div>
          )}
          {open.length > 0 && (
            <>
              <div className={styles.sectionLabel}>
                <p className={styles.sectionLabelText}>Открытые ({open.length})</p>
              </div>
              {open.map(t => (
                <button key={t.id} onClick={() => selectTicket(t)}
                  className={selected?.id === t.id ? styles.ticketBtnActiveOpen : styles.ticketBtn}
                >
                  <div className={styles.ticketHeader}>
                    <p className={styles.ticketSubject}>{t.subject}</p>
                    <span className={styles.badgeOpen}>Открыт</span>
                  </div>
                  <p className={styles.ticketMeta}>{t.user} · {formatDate(t.createdAt)}</p>
                </button>
              ))}
            </>
          )}
          {closed.length > 0 && (
            <>
              <div className={styles.sectionLabelClosed}>
                <p className={styles.sectionLabelText}>Закрытые ({closed.length})</p>
              </div>
              {closed.map(t => (
                <button key={t.id} onClick={() => selectTicket(t)}
                  className={selected?.id === t.id ? styles.ticketBtnActiveClosed : styles.ticketBtnClosed}
                >
                  <div className={styles.ticketHeader}>
                    <p className={styles.ticketSubject}>{t.subject}</p>
                    <span className={styles.badgeClosed}>Закрыт</span>
                  </div>
                  <p className={styles.ticketMeta}>{t.user}</p>
                </button>
              ))}
            </>
          )}
        </div>

        {/* Conversation Panel */}
        {selected ? (
          <div className={styles.conversationPanel}>
            <div className={styles.convHeader}>
              <div className={styles.convHeaderInner}>
                <div>
                  <h2 className={styles.convSubject}>{selected.subject}</h2>
                  <p className={styles.convMeta}>{selected.user} · {formatDate(selected.createdAt)}</p>
                </div>
                <div className={styles.convActions}>
                  {selected.status === "Open" && (
                    <button onClick={closeTicket} className={styles.closeTicketBtn}>Закрыть тикет</button>
                  )}
                  {selected.status === "Closed" && (
                    <span className={styles.closedBadge}>
                      <CheckCircle2 size={14} /> Закрыт
                    </span>
                  )}
                </div>
              </div>
            </div>

            {(() => {
              const designId = extractDesignId();
              if (!designId) return null;
              return (
                <div className={styles.appealBar}>
                  <ShieldCheck size={18} color="#b45309" style={{ flexShrink: 0 }} />
                  <span className={styles.appealLabel}>Апелляция на дизайн</span>
                  {actionResult ? (
                    <span className={styles.appealResult}>{actionResult}</span>
                  ) : (
                    <>
                      <button onClick={() => handleDesignAction(designId, "approve")} disabled={actionLoading} className={styles.btnApproveSmall}>
                        <CheckCircle2 size={14} /> Одобрить
                      </button>
                      <button onClick={() => handleDesignAction(designId, "reject")} disabled={actionLoading} className={styles.btnRejectSmall}>
                        <XCircle size={14} /> Отклонить
                      </button>
                    </>
                  )}
                </div>
              );
            })()}

            <div className={styles.messagesArea}>
              {messages.map(m => (
                <div key={m.id} className={m.isAdmin ? styles.messageRowAdmin : styles.messageRowUser}>
                  <div className={m.isAdmin ? styles.msgAvatarAdmin : styles.msgAvatarUser}>
                    <span className={m.isAdmin ? styles.msgAvatarTextAdmin : styles.msgAvatarTextUser}>
                      {m.isAdmin ? "A" : m.senderName[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className={m.isAdmin ? styles.msgBubbleAdmin : styles.msgBubbleUser}>
                    <p className={m.isAdmin ? styles.msgSenderAdmin : styles.msgSenderUser}>{m.senderName}</p>
                    <p className={m.isAdmin ? styles.msgTextAdmin : styles.msgTextUser}>{m.text}</p>
                    <p className={m.isAdmin ? styles.msgTimeAdmin : styles.msgTimeUser}>{formatDate(m.createdAt)}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {selected.status === "Open" && (
              <div className={styles.replyArea}>
                <div className={styles.replyInner}>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Напишите ответ пользователю..."
                    rows={3}
                    className={styles.replyTextarea}
                  />
                  <button onClick={sendReply} disabled={!replyText.trim()} className={styles.sendBtn}>
                    <Send size={16} /> Отправить
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.emptyConversation}>
            Выберите обращение
          </div>
        )}
      </div>
    </div>
  );
}
