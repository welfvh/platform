'use client';

// Conversation Annotation Interface for Error Analysis and Open Coding
// This interface allows researchers to annotate conversations for error analysis

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Message {
  message_id: string;
  message_type: 'USER_MESSAGE' | 'AGENT_MESSAGE';
  content: string;
  timestamp: string;
}

interface Conversation {
  conversation_id: string;
  messages: Message[];
  annotation?: string;
}

export default function AnnotationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedCount, setSelectedCount] = useState<10 | 25 | 50>(10);
  const [loading, setLoading] = useState(true);
  const [annotations, setAnnotations] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadConversations();
    // Load saved annotations from localStorage
    const saved = localStorage.getItem('conversation_annotations');
    if (saved) {
      try {
        setAnnotations(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load annotations', e);
      }
    }
  }, []);

  const loadConversations = async () => {
    try {
      const response = await fetch('/m9-conversations.csv');
      const text = await response.text();
      const lines = text.split('\n');

      // CSV format: year,month,day,hour,time,solon_use_case,company,branding,conversation_id,message_type,intent_names,content_anonymized,intent_ids,message_id
      const conversationMap = new Map<string, Conversation>();

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);
        if (values.length < 14) continue;

        const [year, month, day, hour, time, solon_use_case, company, branding, conversation_id, message_type, intent_names, content_anonymized, intent_ids, message_id] = values;

        // Filter for M9 conversations only
        if (solon_use_case !== 'M9') continue;
        if (!content_anonymized || content_anonymized.trim() === '') continue;

        if (!conversationMap.has(conversation_id)) {
          conversationMap.set(conversation_id, {
            conversation_id,
            messages: [],
          });
        }

        conversationMap.get(conversation_id)!.messages.push({
          message_id,
          message_type: message_type as 'USER_MESSAGE' | 'AGENT_MESSAGE',
          content: content_anonymized.replace(/^"|"$/g, ''),
          timestamp: `${year}-${month}-${day} ${time}`,
        });
      }

      // Convert to array, sort messages within each conversation by timestamp, and limit to conversations with both user and agent messages
      const conversationsList = Array.from(conversationMap.values())
        .filter(conv => {
          const hasUser = conv.messages.some(m => m.message_type === 'USER_MESSAGE');
          const hasAgent = conv.messages.some(m => m.message_type === 'AGENT_MESSAGE');
          return hasUser && hasAgent && conv.messages.length >= 2;
        })
        .map(conv => ({
          ...conv,
          messages: conv.messages.sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
        }));

      setConversations(conversationsList);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setLoading(false);
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result;
  };

  const updateAnnotation = (conversation_id: string, annotation: string) => {
    const updated = { ...annotations, [conversation_id]: annotation };
    setAnnotations(updated);
    localStorage.setItem('conversation_annotations', JSON.stringify(updated));
  };

  const exportAnnotations = () => {
    const data = conversations.slice(0, selectedCount).map(conv => ({
      conversation_id: conv.conversation_id,
      message_count: conv.messages.length,
      turn_count: Math.floor(conv.messages.filter(m => m.message_type === 'USER_MESSAGE').length),
      annotation: annotations[conv.conversation_id] || '',
    }));

    const csv = [
      'conversation_id,message_count,turn_count,annotation',
      ...data.map(d => `${d.conversation_id},${d.message_count},${d.turn_count},"${d.annotation.replace(/"/g, '""')}"`)
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annotations_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const annotationStats = {
    total: Math.min(selectedCount, conversations.length),
    annotated: conversations.slice(0, selectedCount).filter(c => annotations[c.conversation_id]).length,
    pending: Math.min(selectedCount, conversations.length) - conversations.slice(0, selectedCount).filter(c => annotations[c.conversation_id]).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">Laden...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Konversations-Annotierung</h1>
              <p className="text-sm text-muted-foreground mt-1">Fehleranalyse und Open Coding</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                <Button
                  onClick={() => setSelectedCount(10)}
                  variant={selectedCount === 10 ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8"
                >
                  10
                </Button>
                <Button
                  onClick={() => setSelectedCount(25)}
                  variant={selectedCount === 25 ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8"
                >
                  25
                </Button>
                <Button
                  onClick={() => setSelectedCount(50)}
                  variant={selectedCount === 50 ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8"
                >
                  50
                </Button>
              </div>
              <Button onClick={exportAnnotations} variant="outline" size="default">
                Annotationen exportieren
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gesamt</div>
              <div className="text-2xl font-semibold mt-1">{annotationStats.total}</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Annotiert</div>
              <div className="text-2xl font-semibold mt-1 text-green-600">{annotationStats.annotated}</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ausstehend</div>
              <div className="text-2xl font-semibold mt-1 text-orange-600">{annotationStats.pending}</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fortschritt</div>
              <div className="text-2xl font-semibold mt-1">{((annotationStats.annotated / annotationStats.total) * 100).toFixed(0)}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="space-y-6">
          {conversations.slice(0, selectedCount).map((conv, idx) => {
            const userMessages = conv.messages.filter(m => m.message_type === 'USER_MESSAGE').length;
            const agentMessages = conv.messages.filter(m => m.message_type === 'AGENT_MESSAGE').length;

            return (
              <div key={conv.conversation_id} className="rounded-lg border bg-card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">#{idx + 1}</Badge>
                    <div>
                      <div className="font-medium">M9 Konversation</div>
                      <div className="text-xs text-muted-foreground mt-1">ID: {conv.conversation_id}</div>
                    </div>
                  </div>
                  <Badge variant="secondary">{userMessages} {userMessages === 1 ? 'Turn' : 'Turns'}</Badge>
                </div>

                {/* Conversation Messages */}
                <div className="space-y-3 mb-4">
                  {conv.messages.map((msg, msgIdx) => (
                    <div key={msg.message_id}>
                      {msg.message_type === 'USER_MESSAGE' ? (
                        <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
                          <div className="text-xs text-muted-foreground mb-1">Kunde:</div>
                          <div className="text-sm">{msg.content}</div>
                        </div>
                      ) : (
                        <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3">
                          <div className="text-xs text-muted-foreground mb-1">1&1 Assistent:</div>
                          <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Annotation Field */}
                <div className="border-t pt-4">
                  <label className="text-sm font-medium mb-2 block">Annotierung (Open Coding):</label>
                  <Textarea
                    placeholder="Fehlertyp, Kategorie, Beobachtungen..."
                    value={annotations[conv.conversation_id] || ''}
                    onChange={(e) => updateAnnotation(conv.conversation_id, e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
