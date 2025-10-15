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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  useEffect(() => {
    loadConversations();
    // Annotations are now loaded within loadConversations to merge with CSV data
  }, []);

  const loadConversations = async () => {
    try {
      const response = await fetch('/representative-sample.csv');
      const text = await response.text();

      // Parse CSV with proper multi-line field handling
      const rows = parseCSV(text);

      // CSV format: conversation_id,message_number,annotation,year,month,day,time,message_type,intent_names,content_anonymized,message_id
      const conversationMap = new Map<string, Conversation>();
      const preloadedAnnotations: { [key: string]: string } = {};

      // Skip header row (index 0)
      for (let i = 1; i < rows.length; i++) {
        const values = rows[i];
        if (values.length < 11) continue;

        const [conversation_id, message_number, annotation, year, month, day, time, message_type, intent_names, content_anonymized, message_id] = values;

        if (!content_anonymized || content_anonymized.trim() === '' || content_anonymized === 'null') continue;

        if (!conversationMap.has(conversation_id)) {
          conversationMap.set(conversation_id, {
            conversation_id,
            messages: [],
          });
        }

        // Store pre-existing annotation if present (only once per conversation)
        if (annotation && annotation.trim() !== '' && !preloadedAnnotations[conversation_id]) {
          preloadedAnnotations[conversation_id] = annotation.trim();
        }

        // Create timestamp for proper sorting (YYYY-MM-DD HH:MM:SS format)
        const paddedMonth = month.padStart(2, '0');
        const paddedDay = day.padStart(2, '0');
        const timestamp = `${year}-${paddedMonth}-${paddedDay} ${time}`;

        conversationMap.get(conversation_id)!.messages.push({
          message_id,
          message_type: message_type as 'USER_MESSAGE' | 'AGENT_MESSAGE',
          content: content_anonymized.trim(),
          timestamp,
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

      // Merge pre-loaded annotations with localStorage (localStorage takes precedence)
      const savedAnnotations = localStorage.getItem('conversation_annotations');
      const mergedAnnotations = { ...preloadedAnnotations };
      if (savedAnnotations) {
        try {
          const parsed = JSON.parse(savedAnnotations);
          Object.assign(mergedAnnotations, parsed); // localStorage overrides preloaded
        } catch (e) {
          console.error('Failed to parse saved annotations', e);
        }
      }
      setAnnotations(mergedAnnotations);

      setLoading(false);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setLoading(false);
    }
  };

  // Parse CSV handling multi-line quoted fields
  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = [];
    const row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"' && inQuotes && nextChar === '"') {
        // Escaped quote (two quotes in a row)
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        // Toggle quote mode
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        // Field separator
        row.push(current);
        current = '';
      } else if (char === '\n' && !inQuotes) {
        // Row separator (only when not inside quotes)
        row.push(current);
        if (row.length > 0) {
          rows.push(row.slice());
        }
        row.length = 0;
        current = '';
        // Skip \r if present (Windows line endings)
        if (text[i - 1] === '\r') {
          // Already handled
        }
      } else if (char === '\r' && nextChar === '\n' && !inQuotes) {
        // Windows line ending - skip \r, let \n handle it
        continue;
      } else {
        // Regular character
        current += char;
      }
    }

    // Push last field and row
    if (current || row.length > 0) {
      row.push(current);
      if (row.length > 0) {
        rows.push(row);
      }
    }

    return rows;
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
              <div className="flex items-center gap-2">
                <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="default">
                      Annotationen anzeigen
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Annotationen Übersicht</DialogTitle>
                      <DialogDescription>
                        Alle annotierten Konversationen im Überblick
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">#</TableHead>
                            <TableHead className="w-[250px]">Konversation ID</TableHead>
                            <TableHead className="w-[100px]">Nachrichten</TableHead>
                            <TableHead className="w-[100px]">Turns</TableHead>
                            <TableHead>Annotierung</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {conversations.slice(0, selectedCount).map((conv, idx) => {
                            const annotation = annotations[conv.conversation_id];
                            const userMessages = conv.messages.filter(m => m.message_type === 'USER_MESSAGE').length;

                            // Only show annotated conversations
                            if (!annotation) return null;

                            return (
                              <TableRow key={conv.conversation_id}>
                                <TableCell className="font-medium">#{idx + 1}</TableCell>
                                <TableCell className="font-mono text-xs">{conv.conversation_id}</TableCell>
                                <TableCell>{conv.messages.length}</TableCell>
                                <TableCell>{userMessages}</TableCell>
                                <TableCell className="max-w-md">
                                  <div className="text-sm whitespace-pre-wrap">{annotation}</div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      {conversations.slice(0, selectedCount).filter(c => annotations[c.conversation_id]).length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          Noch keine Annotierungen vorhanden
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                <Button onClick={exportAnnotations} variant="outline" size="default">
                  Annotationen exportieren
                </Button>
              </div>
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
                      <div className="font-medium">Repräsentative Konversation</div>
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
