'use client';

// Structured Evaluation Interface with Binary Criteria
// Combines open coding annotations with systematic pass/fail criteria evaluation

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
}

interface Criterion {
  id: string;
  label: string;
  description: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  criteria: Criterion[];
}

interface Evaluation {
  annotation: string;
  criteria: { [key: string]: boolean };
  qualityGate: boolean | null;
}

// Evaluation criteria definition (v0.1)
const EVALUATION_CATEGORIES: Category[] = [
  {
    id: 'sprache',
    name: 'Sprache',
    description: 'Language quality and correctness',
    criteria: [
      { id: 'sprache_1', label: 'Grammatik & Rechtschreibung korrekt', description: 'No grammatical or spelling errors' },
      { id: 'sprache_2', label: 'Deutsche Anführungszeichen („") verwendet', description: 'German quotation marks used' },
      { id: 'sprache_3', label: 'Richtige Sprache basierend auf Input', description: 'Response language matches input' },
      { id: 'sprache_4', label: 'Keine unbekannten Produktnamen verwendet', description: 'Only known product names from KB' },
      { id: 'sprache_5', label: 'Spricht in 3. Person über sich', description: 'Third person reference ("Der 1&1 Assistent...")' },
    ],
  },
  {
    id: 'layout',
    name: 'Layout/Format',
    description: 'Formatting and structure',
    criteria: [
      { id: 'layout_1', label: 'Links im korrekten Markdown-Format', description: 'Links use [Text](URL) format' },
      { id: 'layout_2', label: 'Überschriften fett formatiert', description: 'Headers use **bold** formatting' },
      { id: 'layout_3', label: 'Bullets/Listen sinnvoll verwendet', description: 'Lists used appropriately' },
      { id: 'layout_4', label: 'Control-Center-Links korrekt eingebunden', description: 'Control-Center links present when needed' },
    ],
  },
  {
    id: 'intent',
    name: 'Intent-Erkennung',
    description: 'Intent recognition quality',
    criteria: [
      { id: 'intent_1', label: 'Hat Kundenanliegen verstanden', description: 'Understood customer concern' },
      { id: 'intent_2', label: 'Passende Suche in Wissensdatenbank durchgeführt', description: 'Appropriate KB search performed' },
      { id: 'intent_3', label: 'Richtige Artikel/Kategorien identifiziert', description: 'Correct articles identified' },
    ],
  },
  {
    id: 'grounding',
    name: 'Grounding/Korrektheit',
    description: 'Factual accuracy and grounding',
    criteria: [
      { id: 'grounding_1', label: 'Alle Infos aus Wissensdatenbank', description: 'No hallucinations' },
      { id: 'grounding_2', label: 'Links NUR aus autorisierten Domains', description: 'Only hilfe-center.1und1.de or control-center.1und1.de' },
      { id: 'grounding_3', label: 'Scenario-specific Formulierungen wortwörtlich', description: 'Exact phrasing for special scenarios' },
      { id: 'grounding_4', label: 'Keine Preise/Kosten genannt', description: 'No pricing information mentioned' },
    ],
  },
  {
    id: 'specificity',
    name: 'Specificity/Relevance',
    description: 'Response relevance and specificity',
    criteria: [
      { id: 'specificity_1', label: 'Beantwortet die konkrete Frage', description: 'Addresses specific question' },
      { id: 'specificity_2', label: 'Mehrere Artikel sinnvoll kategorisiert', description: 'Multiple articles well-organized' },
      { id: 'specificity_3', label: 'Keine irrelevanten Infos', description: 'No unnecessary information' },
    ],
  },
  {
    id: 'dialog',
    name: 'Dialog-Führung',
    description: 'Dialog management',
    criteria: [
      { id: 'dialog_1', label: '"1&1 Assistent"-Einleitungssatz NUR in erster Antwort', description: 'Opening phrase only in first response' },
      { id: 'dialog_2', label: 'Rückfrage am Ende der Antwort', description: 'Follow-up question present' },
      { id: 'dialog_3', label: 'Rückfrage variiert', description: 'Follow-up questions show variation' },
    ],
  },
  {
    id: 'hard_rules',
    name: 'Hard Rules (PASS/FAIL)',
    description: 'Mandatory compliance rules',
    criteria: [
      { id: 'hard_1', label: 'Weigert sich, über eigene Policies zu sprechen', description: 'Deflects policy questions' },
      { id: 'hard_2', label: 'Bei fehlender Info: bittet um Neuformulierung', description: 'Handles missing info appropriately' },
      { id: 'hard_3', label: 'Keine Vergleiche mit Wettbewerbern', description: 'No competitor comparisons' },
      { id: 'hard_4', label: 'Bei Produkten nicht in DB: Standard-Formulierung', description: 'Standard phrasing for unknown products' },
    ],
  },
];

export default function EvaluatePage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedCount, setSelectedCount] = useState<10 | 25 | 50>(10);
  const [loading, setLoading] = useState(true);
  const [evaluations, setEvaluations] = useState<{ [key: string]: Evaluation }>({});
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await fetch('/representative-sample.csv');
      const text = await response.text();

      const rows = parseCSV(text);
      const conversationMap = new Map<string, Conversation>();
      const preloadedAnnotations: { [key: string]: string } = {};

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

        if (annotation && annotation.trim() !== '' && !preloadedAnnotations[conversation_id]) {
          preloadedAnnotations[conversation_id] = annotation.trim();
        }

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

      const savedEvaluations = localStorage.getItem('conversation_evaluations_v01');
      const loadedEvaluations: { [key: string]: Evaluation } = {};

      conversationsList.forEach(conv => {
        loadedEvaluations[conv.conversation_id] = {
          annotation: preloadedAnnotations[conv.conversation_id] || '',
          criteria: {},
          qualityGate: null,
        };
      });

      if (savedEvaluations) {
        try {
          const parsed = JSON.parse(savedEvaluations);
          Object.keys(parsed).forEach(id => {
            if (loadedEvaluations[id]) {
              loadedEvaluations[id] = {
                ...loadedEvaluations[id],
                ...parsed[id],
                annotation: parsed[id].annotation || loadedEvaluations[id].annotation,
              };
            }
          });
        } catch (e) {
          console.error('Failed to parse saved evaluations', e);
        }
      }

      setEvaluations(loadedEvaluations);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setLoading(false);
    }
  };

  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = [];
    const row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"' && inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(current);
        current = '';
      } else if (char === '\n' && !inQuotes) {
        row.push(current);
        if (row.length > 0) {
          rows.push(row.slice());
        }
        row.length = 0;
        current = '';
      } else if (char === '\r' && nextChar === '\n' && !inQuotes) {
        continue;
      } else {
        current += char;
      }
    }

    if (current || row.length > 0) {
      row.push(current);
      if (row.length > 0) {
        rows.push(row);
      }
    }

    return rows;
  };

  const updateEvaluation = (conversation_id: string, updates: Partial<Evaluation>) => {
    const updated = {
      ...evaluations,
      [conversation_id]: {
        ...evaluations[conversation_id],
        ...updates,
      },
    };
    setEvaluations(updated);
    localStorage.setItem('conversation_evaluations_v01', JSON.stringify(updated));
  };

  const toggleCriterion = (conversation_id: string, criterion_id: string) => {
    const current = evaluations[conversation_id]?.criteria[criterion_id];
    updateEvaluation(conversation_id, {
      criteria: {
        ...evaluations[conversation_id]?.criteria,
        [criterion_id]: !current,
      },
    });
  };

  const passAllCategory = (conversation_id: string, categoryId: string) => {
    const category = EVALUATION_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;

    const updates: { [key: string]: boolean } = {};
    category.criteria.forEach(c => {
      updates[c.id] = true;
    });

    updateEvaluation(conversation_id, {
      criteria: {
        ...evaluations[conversation_id]?.criteria,
        ...updates,
      },
    });
  };

  const calculateScore = (conversation_id: string) => {
    const evaluation = evaluations[conversation_id];
    if (!evaluation) return { categoryScores: {}, average: 0, hardRules: true };

    const categoryScores: { [key: string]: { passed: number; total: number; percentage: number } } = {};
    let totalPassed = 0;
    let totalCriteria = 0;
    let hardRulesPassed = true;

    EVALUATION_CATEGORIES.forEach(category => {
      let passed = 0;
      const total = category.criteria.length;

      category.criteria.forEach(criterion => {
        if (evaluation.criteria[criterion.id]) {
          passed++;
        }
        if (category.id === 'hard_rules' && !evaluation.criteria[criterion.id]) {
          hardRulesPassed = false;
        }
      });

      categoryScores[category.id] = {
        passed,
        total,
        percentage: total > 0 ? Math.round((passed / total) * 100) : 0,
      };

      if (category.id !== 'hard_rules') {
        totalPassed += passed;
        totalCriteria += total;
      }
    });

    const average = totalCriteria > 0 ? Math.round((totalPassed / totalCriteria) * 100) : 0;

    return { categoryScores, average, hardRules: hardRulesPassed };
  };

  const exportEvaluations = () => {
    const data = conversations.slice(0, selectedCount).map(conv => {
      const evaluation = evaluations[conv.conversation_id];
      const { categoryScores, average, hardRules } = calculateScore(conv.conversation_id);

      return {
        conversation_id: conv.conversation_id,
        message_count: conv.messages.length,
        turn_count: conv.messages.filter(m => m.message_type === 'USER_MESSAGE').length,
        annotation: evaluation?.annotation || '',
        quality_gate: evaluation?.qualityGate === null ? '' : evaluation?.qualityGate ? 'Yes' : 'No',
        average_score: average,
        hard_rules: hardRules ? 'PASS' : 'FAIL',
        ...Object.fromEntries(
          Object.entries(categoryScores).map(([cat, score]) => [`${cat}_score`, `${score.passed}/${score.total}`])
        ),
      };
    });

    const headers = [
      'conversation_id',
      'message_count',
      'turn_count',
      'annotation',
      'quality_gate',
      'average_score',
      'hard_rules',
      ...EVALUATION_CATEGORIES.map(c => `${c.id}_score`),
    ];

    const csv = [
      headers.join(','),
      ...data.map(d =>
        headers.map(h => {
          const value = d[h as keyof typeof d];
          return typeof value === 'string' && value.includes(',') ? `"${value.replace(/"/g, '""')}"` : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evaluations_v01_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const evaluationStats = {
    total: Math.min(selectedCount, conversations.length),
    evaluated: conversations.slice(0, selectedCount).filter(c => {
      const evalData = evaluations[c.conversation_id];
      return evalData && (evalData.annotation || Object.keys(evalData.criteria).length > 0);
    }).length,
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
              <h1 className="text-2xl font-semibold">Strukturierte Evaluation v0.1</h1>
              <p className="text-sm text-muted-foreground mt-1">Binary Criteria + Open Coding</p>
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
                <Button onClick={exportEvaluations} variant="outline" size="default">
                  Evaluationen exportieren
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
              <div className="text-2xl font-semibold mt-1">{evaluationStats.total}</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Evaluiert</div>
              <div className="text-2xl font-semibold mt-1 text-green-600">{evaluationStats.evaluated}</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fortschritt</div>
              <div className="text-2xl font-semibold mt-1">{evaluationStats.total > 0 ? Math.round((evaluationStats.evaluated / evaluationStats.total) * 100) : 0}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="space-y-6">
          {conversations.slice(0, selectedCount).map((conv, idx) => {
            const userMessages = conv.messages.filter(m => m.message_type === 'USER_MESSAGE').length;
            const evaluation = evaluations[conv.conversation_id] || { annotation: '', criteria: {}, qualityGate: null };
            const { categoryScores, average, hardRules } = calculateScore(conv.conversation_id);

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
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{userMessages} {userMessages === 1 ? 'Turn' : 'Turns'}</Badge>
                    {average > 0 && (
                      <Badge variant={hardRules ? 'default' : 'destructive'}>
                        {average}% {hardRules ? '' : '(FAIL)'}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Conversation Messages */}
                <div className="space-y-3 mb-4">
                  {conv.messages.map((msg) => (
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

                {/* Evaluation Section */}
                <div className="border-t pt-4 space-y-4">
                  {/* Open Coding Annotation */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Open Coding Annotation:</label>
                    <Textarea
                      placeholder="Fehlertyp, Kategorie, Beobachtungen..."
                      value={evaluation.annotation}
                      onChange={(e) => updateEvaluation(conv.conversation_id, { annotation: e.target.value })}
                      className="min-h-[80px]"
                    />
                  </div>

                  {/* Binary Criteria Checklist */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Evaluation Criteria v0.1:</label>
                    <Accordion type="multiple" className="w-full">
                      {EVALUATION_CATEGORIES.map((category) => {
                        const score = categoryScores[category.id];
                        return (
                          <AccordionItem key={category.id} value={category.id}>
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center justify-between w-full pr-4">
                                <div className="flex items-center gap-2">
                                  <span>{category.name}</span>
                                  <span className="text-xs text-muted-foreground">({category.description})</span>
                                </div>
                                {score && (
                                  <Badge variant={score.passed === score.total ? 'default' : 'secondary'} className="ml-2">
                                    {score.passed}/{score.total} ({score.percentage}%)
                                  </Badge>
                                )}
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="pt-2 space-y-3">
                                <div className="flex justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => passAllCategory(conv.conversation_id, category.id)}
                                  >
                                    Pass All
                                  </Button>
                                </div>
                                {category.criteria.map((criterion) => (
                                  <div key={criterion.id} className="flex items-start space-x-2">
                                    <Checkbox
                                      id={`${conv.conversation_id}-${criterion.id}`}
                                      checked={evaluation.criteria[criterion.id] || false}
                                      onCheckedChange={() => toggleCriterion(conv.conversation_id, criterion.id)}
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                      <label
                                        htmlFor={`${conv.conversation_id}-${criterion.id}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                      >
                                        {criterion.label}
                                      </label>
                                      <p className="text-xs text-muted-foreground">
                                        {criterion.description}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </div>

                  {/* Quality Gate Question */}
                  <div className="border-t pt-4">
                    <label className="text-sm font-medium mb-2 block">Final Quality Gate:</label>
                    <div className="flex items-center gap-4">
                      <span className="text-sm">Würde Kunde schnell zur Lösung kommen?</span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={evaluation.qualityGate === true ? 'default' : 'outline'}
                          onClick={() => updateEvaluation(conv.conversation_id, { qualityGate: true })}
                        >
                          Ja
                        </Button>
                        <Button
                          size="sm"
                          variant={evaluation.qualityGate === false ? 'destructive' : 'outline'}
                          onClick={() => updateEvaluation(conv.conversation_id, { qualityGate: false })}
                        >
                          Nein
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
