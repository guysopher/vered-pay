'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { ChatMessage } from '@/components/chat/ChatMessage'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'מה השכר הממוצע במערכת?',
  'מי העובד עם השכר הגבוה ביותר?',
  'כמה עובדים יש בכל מחלקה?',
  'תן לי סיכום של כל הניכויים',
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return

    const userMessage: Message = { role: 'user', content: text.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsStreaming(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!res.ok) {
        throw new Error('שגיאה בתקשורת עם השרת')
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''
      let buffer = ''

      setMessages([...newMessages, { role: 'assistant', content: '' }])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              if (data === '[DONE]') continue

              try {
                const parsed = JSON.parse(data)
                if (parsed.text) {
                  assistantContent += parsed.text
                  setMessages([
                    ...newMessages,
                    { role: 'assistant', content: assistantContent },
                  ])
                }
                if (parsed.error) {
                  assistantContent += `\n\nשגיאה: ${parsed.error}`
                  setMessages([
                    ...newMessages,
                    { role: 'assistant', content: assistantContent },
                  ])
                }
              } catch {
                // skip
              }
            }
          }
        }
      }

      if (!assistantContent) {
        setMessages([
          ...newMessages,
          { role: 'assistant', content: 'לא הצלחתי לקבל תשובה. נסי שוב.' },
        ])
      }
    } catch {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'שגיאה בתקשורת. נסי שוב.' },
      ])
    }

    setIsStreaming(false)
  }, [messages, isStreaming])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <h1 className="text-2xl font-bold text-gray-900 mb-4 shrink-0">
        צ׳אט AI — שאלי על תלושי השכר
      </h1>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-4">&#x1F4AC;</div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              שלום ורד! אני כאן לעזור
            </h2>
            <p className="text-sm text-gray-500 mb-6 max-w-md">
              את יכולה לשאול אותי כל שאלה על נתוני השכר, עובדים, מחלקות, ניכויים ועוד.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage(suggestion)}
                  className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm hover:bg-blue-100 transition"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, i) => (
          <ChatMessage
            key={i}
            role={message.role}
            content={message.content}
            isStreaming={isStreaming && i === messages.length - 1 && message.role === 'assistant'}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex gap-3 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="שאלי שאלה על תלושי השכר..."
          rows={1}
          disabled={isStreaming}
          className="flex-1 resize-none border-0 outline-none text-sm p-2 max-h-32 placeholder:text-gray-400 disabled:opacity-50"
          style={{ minHeight: '2.5rem' }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isStreaming}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {isStreaming ? 'ממתין...' : 'שלח'}
        </button>
      </div>
    </div>
  )
}
