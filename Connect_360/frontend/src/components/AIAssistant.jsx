import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { assistantService } from '../services/assistantService';

/**
 * AIAssistant - floating role-aware assistant widget.
 *
 * - Shows a floating button; opens a slide-up chat panel.
 * - Role is derived from the auth context for mock tailoring; in real mode the
 *   backend derives role + authorization from the JWT (frontend never authorizes).
 * - Optional `bookingId` prop passes booking context; the backend only uses it
 *   if the user actually owns/assigned to that booking.
 * - Never displays phone numbers (backend guarantees they're never returned).
 */
export default function AIAssistant({ bookingId = null }) {
  const { isAuthenticated, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const scrollRef = useRef(null);

  const role = user?.role || 'customer';

  // Seed a role-aware greeting when opened the first time
  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting =
        role === 'worker'
          ? "Hi! I'm your Connect360 assistant. I can help with job prep, safe troubleshooting, and completion steps. What do you need?"
          : "Hi! I'm your Connect360 assistant. I can help you troubleshoot, choose a service, or check your booking. How can I help?";
      setMessages([{ from: 'bot', text: greeting }]);
    }
  }, [open, role, messages.length]);

  // Auto-scroll to newest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  if (!isAuthenticated) return null;

  const suggestions =
    role === 'worker'
      ? ['What should I prepare?', 'How do I mark a job complete?', 'Customer AC not cooling']
      : ['My AC isn\'t cooling', 'When is my technician coming?', 'What services do you offer?'];

  async function send(text) {
    const question = (text ?? input).trim();
    if (!question || sending) return;

    setMessages((m) => [...m, { from: 'user', text: question }]);
    setInput('');
    setSending(true);

    const updatedHistory = [...history, { role: 'user', content: question }];

    try {
      const res = await assistantService.chat({ message: question, bookingId, role, history: updatedHistory });
      const answer = res.data?.answer || 'Sorry, I could not process that.';
      // Store clean text in history (never raw JSON)
      let historyText = answer;
      try {
        const p = JSON.parse(answer);
        if (p?.reply) historyText = p.reply;
      } catch (_) {}
      setHistory([...updatedHistory, { role: 'assistant', content: historyText }]);
      setMessages((m) => [...m, { from: 'bot', text: answer }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { from: 'bot', text: 'The assistant is unavailable right now. Please try again later.', error: true },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-14 h-14 rounded-full bg-primary-container text-on-primary shadow-level-3 flex items-center justify-center hover:opacity-90 active:scale-95 transition-all"
          title="Ask the assistant"
          aria-label="Open AI assistant"
        >
          <span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            smart_toy
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed inset-0 z-50 md:inset-auto md:bottom-6 md:right-6 md:w-96 md:h-[600px] flex flex-col bg-surface-container-lowest md:rounded-xl border border-outline-variant shadow-level-3 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary-container text-on-primary flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                smart_toy
              </span>
              <div>
                <p className="font-manrope text-label-md">Connect360 Assistant</p>
                <p className="font-hanken text-label-sm text-on-primary-container capitalize">{role} help</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close assistant"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-surface">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg font-hanken text-body-sm whitespace-pre-line ${
                    m.from === 'user'
                      ? 'bg-secondary-container text-on-secondary rounded-br-sm'
                      : m.error
                      ? 'bg-error-container text-on-error-container rounded-bl-sm'
                      : 'bg-surface-container-high text-on-surface rounded-bl-sm'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-surface-container-high text-on-surface-variant px-3 py-2 rounded-lg rounded-bl-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Suggestions (only before user has typed much) */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-2 flex-shrink-0 bg-surface">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="px-3 py-1.5 rounded-full border border-outline-variant bg-surface-container-lowest text-on-surface-variant font-hanken text-label-sm hover:bg-surface-container-low transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-outline-variant flex items-center gap-2 flex-shrink-0 bg-surface-container-lowest">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask anything..."
              className="flex-1 px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest font-hanken text-body-sm text-on-surface focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
              disabled={sending}
            />
            <button
              onClick={() => send()}
              disabled={sending || !input.trim()}
              className="w-10 h-10 rounded-lg bg-primary-container text-on-primary flex items-center justify-center hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
              aria-label="Send"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </div>

          {/* Privacy note */}
          <div className="px-3 pb-2 bg-surface-container-lowest flex-shrink-0">
            <p className="font-hanken text-label-sm text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">lock</span>
              Private &amp; role-aware. Contact details are never shared.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
