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
  input_text: string;
  evaluation_text: string;
}

interface Conversation {
  snippet_id: string;
  snippet_name: string;
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
      const response = await fetch('/conversations.csv');
      const text = await response.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',');

      // Parse CSV and group by snippet_id
      const conversationMap = new Map<string, Conversation>();

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);
        if (values.length < 5) continue;

        const [snippet_id, snippet_name, message_id, input_text, evaluation_text] = values;

        if (!conversationMap.has(snippet_id)) {
          conversationMap.set(snippet_id, {
            snippet_id,
            snippet_name,
            messages: [],
          });
        }

        conversationMap.get(snippet_id)!.messages.push({
          message_id,
          input_text,
          evaluation_text,
        });
      }

      // Convert to array and sort messages within each conversation
      const conversationsList = Array.from(conversationMap.values()).map(conv => ({
        ...conv,
        messages: conv.messages.sort((a, b) => a.message_id.localeCompare(b.message_id)),
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

  const updateAnnotation = (snippet_id: string, annotation: string) => {
    const updated = { ...annotations, [snippet_id]: annotation };
    setAnnotations(updated);
    localStorage.setItem('conversation_annotations', JSON.stringify(updated));
  };

  const exportAnnotations = () => {
    const data = conversations.slice(0, selectedCount).map(conv => ({
      snippet_id: conv.snippet_id,
      snippet_name: conv.snippet_name,
      turn_count: conv.messages.length,
      annotation: annotations[conv.snippet_id] || '',
    }));

    const csv = [
      'snippet_id,snippet_name,turn_count,annotation',
      ...data.map(d => `${d.snippet_id},${d.snippet_name},${d.turn_count},"${d.annotation.replace(/"/g, '""')}"`)
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annotations_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const annotationStats = {
    total: selectedCount,
    annotated: conversations.slice(0, selectedCount).filter(c => annotations[c.snippet_id]).length,
    pending: selectedCount - conversations.slice(0, selectedCount).filter(c => annotations[c.snippet_id]).length,
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
          {conversations.slice(0, selectedCount).map((conv, idx) => (
            <div key={conv.snippet_id} className="rounded-lg border bg-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs">#{idx + 1}</Badge>
                  <div>
                    <div className="font-medium">{conv.snippet_name}</div>
                    <div className="text-xs text-muted-foreground mt-1">ID: {conv.snippet_id}</div>
                  </div>
                </div>
                <Badge variant="secondary">{conv.messages.length} {conv.messages.length === 1 ? 'Turn' : 'Turns'}</Badge>
              </div>

              {/* Conversation Messages */}
              <div className="space-y-3 mb-4">
                {conv.messages.map((msg, msgIdx) => (
                  <div key={msg.message_id} className="space-y-2">
                    <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground mb-1">Frage {msgIdx + 1}:</div>
                      <div className="text-sm">{msg.input_text}</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground mb-1">Antwort {msgIdx + 1}:</div>
                      <div className="text-sm">{msg.evaluation_text}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Annotation Field */}
              <div className="border-t pt-4">
                <label className="text-sm font-medium mb-2 block">Annotierung (Open Coding):</label>
                <Textarea
                  placeholder="Fehlertyp, Kategorie, Beobachtungen..."
                  value={annotations[conv.snippet_id] || ''}
                  onChange={(e) => updateAnnotation(conv.snippet_id, e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
