import { useState, useEffect, useRef } from "react";
import { Send, Plus, MessageCircle, ArrowLeft } from "lucide-react";
import { useSearchParams } from "react-router";
import styles from "./SupportPage.module.css";

interface Ticket {
  id: string;
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

export function UserSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem("nid_token");
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/auth/support/tickets", { headers });
      if (res.ok) setTickets(await res.json());
    } catch {}
    setLoading(false);
  };

  const selectTicket = async (ticket: Ticket) => {
    setSelected(ticket);
    setReplyText("");
    try {
      const res = await fetch(`/api/auth/support/tickets/${ticket.id}/messages`, { headers });
      if (res.ok) setMessages(await res.json());
    } catch {}
  };

  const createTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) return;
    try {
      const res = await fetch("/api/auth/support/tickets", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ subject: newSubject, message: newMessage }),
      });
      if (res.ok) {
        setNewSubject("");
        setNewMessage("");
        setShowCreate(false);
        await fetchTickets();
      }
    } catch {}
  };

  const sendMessage = async () => {
    if (!replyText.trim() || !selected) return;
    try {
      const res = await fetch(`/api/auth/support/tickets/${selected.id}/message`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ text: replyText }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        setReplyText("");
      }
    } catch {}
  };

  useEffect(() => { fetchTickets(); }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const appealId = searchParams.get("appeal");
    if (appealId) {
      const title = searchParams.get("title") || "";
      const reason = searchParams.get("reason") || "";
      const tags = searchParams.get("tags") || "";
      setNewSubject(`Апелляция: ${title}`);
      setNewMessage(
        `Прошу пересмотреть решение по моему дизайну.\n\n` +
          `📋 ID дизайна: ${appealId}\n` +
          `📌 Название: ${title}\n` +
          (tags ? `🏷️ Теги: ${tags}\n` : "") +
          `❌ Причина отклонения: ${reason}\n\n` +
          `Пожалуйста, пересмотрите моё обращение.`
      );
      setShowCreate(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  if (loading) return <div className={styles.loading}>Загрузка...</div>;

  if (selected) {
    return (
      <div className={styles.chatContainer}>
        <div className={styles.chatHeader}>
          <button
            onClick={() => { setSelected(null); setMessages([]); }}
            className={styles.backBtn}
          >
            <ArrowLeft size={20} color="#040055" />
          </button>
          <div className={styles.chatHeaderInfo}>
            <h2 className={styles.chatSubject}>{selected.subject}</h2>
            <p className={styles.chatStatus}>
              {selected.status === "Open" ? "🟢 Открыт" : "✅ Закрыт"} · {formatDate(selected.createdAt)}
            </p>
          </div>
        </div>

        <div className={styles.chatBody}>
          <div className={styles.messagesArea}>
            {messages.map((m) => (
              <div key={m.id} className={!m.isAdmin ? styles.messageRowUser : styles.messageRowAdmin}>
                <div className={m.isAdmin ? styles.messageAvatarAdmin : styles.messageAvatarUser}>
                  <span className={m.isAdmin ? styles.messageAvatarTextAdmin : styles.messageAvatarTextUser}>
                    {m.isAdmin ? "A" : "Я"}
                  </span>
                </div>
                <div className={!m.isAdmin ? styles.messageBubbleUser : styles.messageBubbleAdmin}>
                  <p className={!m.isAdmin ? styles.messageSenderUser : styles.messageSenderAdmin}>{m.senderName}</p>
                  <p className={!m.isAdmin ? styles.messageTextUser : styles.messageTextAdmin}>{m.text}</p>
                  <p className={!m.isAdmin ? styles.messageTimeUser : styles.messageTimeAdmin}>{formatDate(m.createdAt)}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className={styles.replyArea}>
            <div className={styles.replyRow}>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Ваше сообщение..."
                rows={2}
                className={styles.replyInput}
              />
              <button
                onClick={sendMessage}
                disabled={!replyText.trim()}
                className={styles.sendBtn}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.listContainer}>
      <div className={styles.listHeader}>
        <div>
          <h1 className={styles.listTitle}>Поддержка</h1>
          <p className={styles.listSubtitle}>Ваши обращения</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className={styles.newTicketBtn}
        >
          <Plus size={16} /> Новое обращение
        </button>
      </div>

      {tickets.length === 0 && !showCreate && (
        <div className={styles.emptyState}>
          <MessageCircle size={48} color="#e5e7eb" style={{ marginBottom: 12 }} />
          <p className={styles.emptyTitle}>Нет обращений</p>
          <p className={styles.emptySubtitle}>Напишите нам, если у вас есть вопросы</p>
        </div>
      )}

      {tickets.map((t) => (
        <button
          key={t.id}
          onClick={() => selectTicket(t)}
          className={styles.ticketItem}
        >
          <div className={styles.ticketRow}>
            <div className={styles.ticketLeft}>
              <div className={styles.ticketTitleRow}>
                <p className={styles.ticketSubject}>{t.subject}</p>
                <span className={t.status === "Open" ? styles.ticketStatusOpen : styles.ticketStatusClosed}>
                  {t.status === "Open" ? "Открыт" : "Закрыт"}
                </span>
              </div>
              {t.lastMessage && <p className={styles.ticketLastMessage}>{t.lastMessage}</p>}
            </div>
            <div className={styles.ticketRight}>
              <p className={styles.ticketDate}>{formatDate(t.createdAt)}</p>
              <p className={styles.ticketMsgCount}>{t.messageCount} сообщ.</p>
            </div>
          </div>
        </button>
      ))}

      {showCreate && (
        <div className={styles.modalOverlay} onClick={() => setShowCreate(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Новое обращение</h3>
            <div className={styles.modalFields}>
              <input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Тема обращения"
                className={styles.modalInput}
              />
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Опишите вашу проблему или вопрос..."
                rows={5}
                className={styles.modalTextarea}
              />
            </div>
            <div className={styles.modalBtns}>
              <button
                onClick={() => setShowCreate(false)}
                className={styles.modalCancelBtn}
              >Отмена</button>
              <button
                onClick={createTicket}
                disabled={!newSubject.trim() || !newMessage.trim()}
                className={styles.modalSubmitBtn}
              >Отправить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
