import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, X, Minus, Mic, MicOff, Sparkles, ArrowRight } from 'lucide-react';
import { mysqlApiRequest } from '../lib/mysql/client';
import procinixLogo from '../assets/Procinix Logo PNG V1.png';

// ---------- Types ----------
interface ChatAction {
  label: string;
  type: 'navigate' | 'create' | 'confirm';
  payload: Record<string, any>;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  actions?: ChatAction[];
  status?: 'pending' | 'complete' | 'error';
}

// ---------- Welcome ----------
const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! I'm the Procinix AI Assistant.\n\nI can help you:\n\u2022 Create masters, PRs, POs, invoices\n\u2022 Navigate to any page\n\u2022 Answer questions about P2P workflows\n\u2022 Execute complex multi-step operations\n\nTry saying \"Create a department called Marketing\" or \"Navigate to vendor master\"",
  timestamp: new Date(),
};

const QUICK_ACTIONS = [
  { label: 'Create a master', text: 'I want to create a new master record' },
  { label: 'Check my approvals', text: 'Navigate to approvals page' },
  { label: 'Help with invoicing', text: 'How do I create an invoice?' },
];

// ---------- Component ----------
export function ChatBot() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hovered, setHovered] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // ---------- Helpers ----------
  const addMessage = useCallback(
    (role: ChatMessage['role'], content: string, actions?: ChatAction[], status?: ChatMessage['status']) => {
      const msg: ChatMessage = {
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        role,
        content,
        timestamp: new Date(),
        actions,
        status,
      };
      setMessages((prev) => [...prev, msg]);
      if (role === 'assistant' && !isOpen) {
        setUnreadCount((c) => c + 1);
      }
      return msg;
    },
    [isOpen],
  );

  // ---------- Send ----------
  const handleSend = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text || isLoading) return;

      setInput('');
      addMessage('user', text);
      setIsLoading(true);

      try {
        // Build history (skip welcome)
        const history = messages
          .filter((m) => m.id !== 'welcome' && m.role !== 'system')
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await mysqlApiRequest<{
          success: boolean;
          message?: string;
          actions?: ChatAction[];
          needsInfo?: boolean;
          followUpQuestion?: string;
        }>('/api/chat', {
          method: 'POST',
          body: JSON.stringify({ message: text, messages: history }),
        });

        const reply = res.message || 'I received your message but had no response.';
        const actions = res.actions && res.actions.length > 0 ? res.actions : undefined;
        addMessage('assistant', reply, actions);
      } catch (err: any) {
        addMessage('assistant', `Sorry, something went wrong: ${err.message}`, undefined, 'error');
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, addMessage],
  );

  // ---------- Action execution ----------
  const executeAction = useCallback(
    async (action: ChatAction) => {
      switch (action.type) {
        case 'navigate':
          if (action.payload.route) {
            navigate(action.payload.route as string);
            addMessage('system', `Navigated to ${action.payload.route}`);
            setIsOpen(false);
          }
          break;
        case 'create':
          try {
            const masterKey = action.payload.masterKey as string;
            const data = action.payload.data as Record<string, any>;
            const existing = await mysqlApiRequest<{ data: any[] }>(`/api/masters/${masterKey}`);
            const records = [...(existing.data || []), { ...data, id: Date.now().toString() }];
            await mysqlApiRequest(`/api/masters/${masterKey}`, {
              method: 'PUT',
              body: JSON.stringify({ records }),
            });
            addMessage('assistant', 'Created successfully! The record is now pending approval.', [
              {
                label: 'View in master',
                type: 'navigate',
                payload: { route: `/masters/${(masterKey as string).replace(/_/g, '-')}` },
              },
            ]);
          } catch (err: any) {
            addMessage('assistant', `Failed to create: ${err.message}`, undefined, 'error');
          }
          break;
        case 'confirm':
          handleSend('Yes, confirmed');
          break;
      }
    },
    [navigate, addMessage, handleSend],
  );

  // ---------- Voice ----------
  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      addMessage('system', 'Speech recognition is not supported in this browser.');
      return;
    }
    const recognition = new SR();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const transcript: string = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
      handleSend(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  }, [addMessage, handleSend]);

  // ---------- Key handler ----------
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ---------- Styles ----------
  const styles = {
    fab: {
      position: 'fixed' as const,
      bottom: 24,
      right: 24,
      zIndex: 9999,
      width: 56,
      height: 56,
      borderRadius: '50%',
      backgroundColor: 'var(--color-teal)',
      color: '#FFFFFF',
      border: 'none',
      cursor: 'pointer',
      boxShadow: '0 4px 20px rgba(0, 169, 183, 0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'transform 0.2s, box-shadow 0.2s',
      transform: hovered ? 'scale(1.08)' : 'scale(1)',
    },
    badge: {
      position: 'absolute' as const,
      top: -4,
      right: -4,
      width: 20,
      height: 20,
      borderRadius: '50%',
      backgroundColor: '#EF4444',
      color: '#FFF',
      fontSize: 11,
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    panel: {
      position: 'fixed' as const,
      bottom: 96,
      right: 24,
      zIndex: 9998,
      width: 380,
      height: 560,
      borderRadius: 16,
      backgroundColor: '#FFFFFF',
      border: '1px solid var(--color-silver)',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden',
    },
    header: {
      padding: '16px 20px',
      background: 'linear-gradient(135deg, #007D87 0%, #00A9B7 100%)',
      color: '#FFFFFF',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    },
    messagesArea: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '16px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 12,
    },
    userBubble: {
      maxWidth: '80%',
      padding: '10px 16px',
      borderRadius: '16px 16px 4px 16px',
      backgroundColor: 'var(--color-teal)',
      color: '#FFFFFF',
      fontSize: 13,
      lineHeight: 1.5,
      alignSelf: 'flex-end' as const,
      whiteSpace: 'pre-wrap' as const,
    },
    assistantBubble: {
      maxWidth: '85%',
      padding: '10px 16px',
      borderRadius: '16px 16px 16px 4px',
      backgroundColor: 'var(--color-cloud)',
      color: 'var(--color-ink)',
      fontSize: 13,
      lineHeight: 1.5,
      alignSelf: 'flex-start' as const,
      whiteSpace: 'pre-wrap' as const,
    },
    systemBubble: {
      fontSize: 11,
      color: '#9CA3AF',
      textAlign: 'center' as const,
      alignSelf: 'center' as const,
      padding: '4px 12px',
    },
    actionBtn: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 14px',
      borderRadius: 20,
      border: '1px solid var(--color-teal)',
      backgroundColor: '#FFFFFF',
      color: 'var(--color-teal)',
      fontSize: 12,
      fontWeight: 600,
      cursor: 'pointer',
      marginTop: 6,
      marginRight: 6,
    },
    inputArea: {
      padding: '12px 16px',
      borderTop: '1px solid var(--color-silver)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    },
    input: {
      flex: 1,
      border: 'none',
      outline: 'none',
      fontSize: 13,
      backgroundColor: 'transparent',
      color: 'var(--color-ink)',
    },
    iconBtn: (bg: string, color: string) => ({
      width: 36,
      height: 36,
      borderRadius: '50%',
      border: 'none',
      backgroundColor: bg,
      color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      flexShrink: 0,
    }),
  };

  // ---------- Render ----------
  return (
    <>
      {/* Chat panel */}
      {isOpen && (
        <div style={styles.panel}>
          {/* Header */}
          <div style={styles.header}>
            <img src={procinixLogo} alt="Procinix" style={{ height: 22, width: 'auto', filter: 'brightness(0) invert(1)' }} />
            <span style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>AI Assistant</span>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', padding: 4 }}
              title="Minimize"
            >
              <Minus size={18} />
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                setMessages([WELCOME_MESSAGE]);
              }}
              style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', padding: 4 }}
              title="Close & reset"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div style={styles.messagesArea}>
            {messages.map((msg) => (
              <div key={msg.id}>
                <div
                  style={
                    msg.role === 'user'
                      ? styles.userBubble
                      : msg.role === 'system'
                        ? styles.systemBubble
                        : styles.assistantBubble
                  }
                >
                  {msg.content}
                </div>
                {msg.actions && msg.actions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 4, alignSelf: 'flex-start' }}>
                    {msg.actions.map((action, idx) => (
                      <button key={idx} style={styles.actionBtn} onClick={() => executeAction(action)}>
                        <ArrowRight size={12} />
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Quick actions on welcome */}
            {messages.length === 1 && messages[0].id === 'welcome' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {QUICK_ACTIONS.map((qa) => (
                  <button
                    key={qa.label}
                    style={{ ...styles.actionBtn, fontSize: 11 }}
                    onClick={() => handleSend(qa.text)}
                  >
                    <Sparkles size={12} />
                    {qa.label}
                  </button>
                ))}
              </div>
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div style={{ ...styles.assistantBubble, opacity: 0.7 }}>
                <span className="chatbot-dots">Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={styles.inputArea}>
            <input
              ref={inputRef}
              style={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask me anything or give a command..."
              disabled={isLoading}
            />
            <button
              style={styles.iconBtn(isListening ? '#EF4444' : '#F3F4F6', isListening ? '#FFF' : '#6B7280')}
              onClick={startListening}
              title={isListening ? 'Listening...' : 'Voice input'}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <button
              style={styles.iconBtn('var(--color-teal)', '#FFF')}
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              title="Send"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Floating action button */}
      <button
        style={styles.fab}
        onClick={() => setIsOpen((prev) => !prev)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title="Procinix AI Assistant"
      >
        <img src={procinixLogo} alt="P" style={{ height: 28, width: 'auto', filter: 'brightness(0) invert(1)' }} />
        {unreadCount > 0 && !isOpen && <span style={styles.badge}>{unreadCount}</span>}
      </button>
    </>
  );
}
