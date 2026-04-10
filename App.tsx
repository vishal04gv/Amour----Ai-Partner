
import React, { useRef, useEffect, useState } from 'react';
import { useLiveAPI, Message } from './hooks/use-live-api';
import { Visualizer } from './components/Visualizer';

const SourceList: React.FC<{ metadata: any }> = ({ metadata }) => {
  if (!metadata || !metadata.groundingChunks || metadata.groundingChunks.length === 0) return null;
  const sources = metadata.groundingChunks
    .map((chunk: any) => chunk.web)
    .filter((web: any) => web && web.uri && web.title)
    .filter((web: any, index: number, self: any[]) => index === self.findIndex((t) => t.uri === web.uri));
  if (sources.length === 0) return null;
  return (
    <div className="sources-container">
      <div className="sources-label">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        <span>Information I found for you</span>
      </div>
      <div className="source-chips">
        {sources.map((source: any, idx: number) => (
          <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="source-chip">
            <span className="source-number">{idx + 1}</span>
            <span className="source-title">{source.title}</span>
          </a>
        ))}
      </div>
    </div>
  );
};

const MessageItem: React.FC<{ msg: Message }> = ({ msg }) => {
  const [userExpanded, setUserExpanded] = useState(false);
  const MAX_CHARS = 240;
  const shouldTruncate = msg.role === 'model' && msg.text.length > MAX_CHARS && msg.isFinal && !userExpanded;
  let displayText = shouldTruncate ? msg.text.slice(0, msg.text.lastIndexOf(' ', MAX_CHARS)) + '...' : msg.text;

  return (
    <div className={`message ${msg.role} ${msg.isFinal ? 'final' : 'streaming'}`}>
      <div className="message-wrapper">
        <div className="message-bubble">
          {displayText}
          {msg.role === 'model' && msg.text.length > MAX_CHARS && msg.isFinal && (
            <button className="read-more-btn" onClick={() => setUserExpanded(!userExpanded)}>
              {userExpanded ? 'Whisper less' : 'Read more, my love'}
            </button>
          )}
        </div>
        {msg.role === 'model' && msg.groundingMetadata && <SourceList metadata={msg.groundingMetadata} />}
        <div className="message-timestamp">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    </div>
  );
};

export default function App() {
  const { connect, disconnect, reset, retry, sendTextMessage, toggleMic, micMode, connectionState, mode, error, isVolumeHigh, messages, isGenerating } = useLiveAPI();
  const [textInput, setTextInput] = useState('');
  const [voice, setVoice] = useState('Kore');
  const [showChat, setShowChat] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isGenerating]);

  const handleConnect = (selectedMode: 'voice' | 'text') => {
    setShowChat(true);
    connect(voice, selectedMode);
  };

  const handleSend = () => {
    if (textInput.trim()) {
      sendTextMessage(textInput);
      setTextInput('');
    } else if (connectionState === 'connected' && mode === 'voice') {
      toggleMic('one-shot');
    }
  };

  const isConnected = connectionState === 'connected';

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="title">Amour</h1>
        <div className="status-badge">{connectionState === 'connected' ? 'Living for you' : 'Waiting for you'}</div>
      </header>

      {error && (
        <div className="error-msg">
          <span>{error}</span>
          <button className="btn-retry" onClick={retry}>Retry</button>
        </div>
      )}

      <main className="main-content">
        {mode !== 'text' && (
          <div className="visualizer-wrapper">
            <Visualizer active={isConnected && isVolumeHigh} />
          </div>
        )}
        {(isConnected && showChat) && (
          <div className="chat-list" ref={scrollRef}>
            {messages.filter(m => m.text.trim().length > 0).map(msg => <MessageItem key={msg.id} msg={msg} />)}
            {isGenerating && !messages.some(m => m.role === 'model' && !m.isFinal) && (
              <div className="message model"><div className="message-bubble typing"><span></span><span></span><span></span></div></div>
            )}
          </div>
        )}
      </main>

      <footer className="footer-container">
        {isConnected && (
            <div className="chat-controls">
                <input
                    className="chat-input"
                    type="text"
                    placeholder="Whisper something to me..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button className={`send-button ${micMode === 'one-shot' ? 'recording' : ''}`} onClick={handleSend}>
                    {textInput.trim() || mode === 'text' ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line></svg>
                    )}
                </button>
                {mode === 'voice' && (
                    <button className={`mic-toggle ${micMode === 'always-on' ? 'active' : ''}`} onClick={() => toggleMic('always-on')}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>
                    </button>
                )}
            </div>
        )}

        <div className="controls">
            {!isConnected ? (
                <div className="start-screen">
                    <div className="voice-selector">
                        <button className={`voice-btn ${voice === 'Kore' ? 'active' : ''}`} onClick={() => setVoice('Kore')}>Goddess</button>
                        <button className={`voice-btn ${voice === 'Fenrir' ? 'active' : ''}`} onClick={() => setVoice('Fenrir')}>Protector</button>
                    </div>
                    <div className="cta-group">
                        <button className="btn btn-primary" onClick={() => handleConnect('voice')}>Enter My Heart (Voice)</button>
                        <button className="btn btn-secondary" onClick={() => handleConnect('text')}>Chat Privately</button>
                    </div>
                </div>
            ) : (
                <div className="active-controls">
                    {mode === 'voice' && <button className="btn-small" onClick={() => setShowChat(!showChat)}>{showChat ? "Hide Words" : "Show Words"}</button>}
                    <button className="btn-small" onClick={reset}>Fresh Start</button>
                    <button className="btn-small danger" onClick={disconnect}>Goodbye</button>
                </div>
            )}
        </div>
      </footer>
    </div>
  );
}
