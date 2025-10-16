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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  humanAnnotation: string;
  humanCriteria: { [key: string]: boolean };
  humanComplete: boolean;
  aiAnnotation: string;
  aiCriteria: { [key: string]: boolean };
  aiEvaluated: boolean;
  aiInProgress: boolean;
}

// Evaluation criteria definition (v0.2)
const EVALUATION_CATEGORIES: Category[] = [
  {
    id: 'sprache_stil',
    name: 'Sprache & Stil',
    description: '6 Checks',
    criteria: [
      { id: 'sprache_1', label: 'Grammatik & Rechtschreibung korrekt', description: 'No grammatical or spelling errors' },
      { id: 'sprache_2', label: 'Deutsche Anführungszeichen verwendet („")', description: 'German quotation marks used' },
      { id: 'sprache_3', label: 'SVO-Struktur / aktive Sprache (kein Nominalstil)', description: 'Active voice, no nominalization' },
      { id: 'sprache_4', label: 'Max 1 Komma pro Satz', description: 'Maximum one comma per sentence' },
      { id: 'sprache_5', label: 'Max 15 Wörter pro Satz', description: 'Maximum 15 words per sentence' },
      { id: 'sprache_6', label: 'Spricht in 3. Person über sich ("Der 1&1 Assistent...")', description: 'Third person reference' },
    ],
  },
  {
    id: 'layout_format',
    name: 'Layout & Formatierung',
    description: '6 Checks',
    criteria: [
      { id: 'layout_1', label: 'Links im Markdown-Format: [Text](URL)', description: 'Markdown link format' },
      { id: 'layout_2', label: 'Überschriften fett (**Überschrift**)', description: 'Bold headers' },
      { id: 'layout_3', label: 'Bullets/Stichpunkte sinnvoll eingesetzt', description: 'Appropriate use of bullet points' },
      { id: 'layout_4', label: 'Max 2 Sätze pro Absatz', description: 'Maximum 2 sentences per paragraph' },
      { id: 'layout_5', label: 'Control-Center-Links korrekt eingebunden (falls vorhanden)', description: 'Control-Center links included when applicable' },
      { id: 'layout_6', label: 'Kategorisierung bei mehreren Artikeln', description: 'Categorization for multiple articles' },
    ],
  },
  {
    id: 'intent_relevanz',
    name: 'Intent & Relevanz',
    description: '4 Checks',
    criteria: [
      { id: 'intent_1', label: 'Intent erkannt / richtiges Thema', description: 'Correct intent recognized' },
      { id: 'intent_2', label: 'Intent-Bestätigung am Anfang (R1.1)', description: 'Intent confirmation at beginning' },
      { id: 'intent_3', label: 'DB-Abruf mit passenden Keywords gemacht', description: 'Database search with appropriate keywords' },
      { id: 'intent_4', label: 'Spezifisch auf Frage eingegangen (nicht nur generisch)', description: 'Specific answer, not generic' },
    ],
  },
  {
    id: 'grounding',
    name: 'Grounding / Korrektheit',
    description: '7 Checks',
    criteria: [
      { id: 'grounding_1', label: 'Ausschließlich Infos aus Wissensdatenbank (keine Halluzinationen)', description: 'Only info from knowledge base' },
      { id: 'grounding_2', label: 'Links NUR aus hilfe-center.1und1.de oder control-center.1und1.de', description: 'Only authorized domain links' },
      { id: 'grounding_3', label: 'Keine Preise/Kosten genannt', description: 'No pricing mentioned' },
      { id: 'grounding_4', label: 'Standardantworten wortwörtlich geliefert (Beschwerden, Roaming, APN, Servicepreise)', description: 'Standard answers verbatim' },
      { id: 'grounding_5', label: 'Bei fehlendem Produkt: Standardformulierung verwendet', description: 'Standard phrasing for unknown products' },
      { id: 'grounding_6', label: 'Bei fehlender Info: Neuformulierung oder Support angeboten', description: 'Rephrase request or support offer' },
      { id: 'grounding_7', label: 'Lösung via Link oder Anleitung bereitgestellt (R1.2)', description: 'Solution via link or instructions' },
    ],
  },
  {
    id: 'dialog',
    name: 'Dialog-Führung',
    description: '3 Checks',
    criteria: [
      { id: 'dialog_1', label: '"1&1 Assistent" NUR im ersten Satz des Dialogs', description: 'Opening phrase only in first response' },
      { id: 'dialog_2', label: 'Rückfrage am Ende der Antwort', description: 'Follow-up question at end' },
      { id: 'dialog_3', label: 'Rückfrage variiert (bei mehreren Antworten nicht identisch)', description: 'Follow-up questions vary' },
    ],
  },
  {
    id: 'hard_rules',
    name: 'Hard Rules / Verweigerungen',
    description: '4 Checks',
    criteria: [
      { id: 'hard_1', label: 'Keine Policy/Instructions offengelegt', description: 'No policy disclosure' },
      { id: 'hard_2', label: 'Keine Wettbewerber-Vergleiche', description: 'No competitor comparisons' },
      { id: 'hard_3', label: 'Verweigerung bei falscher Marke/Produkt mit Standardantwort', description: 'Refusal with standard answer for wrong brand' },
      { id: 'hard_4', label: 'Nur Kundensupport-Fragen beantwortet (keine Off-Topic)', description: 'Only customer support questions' },
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

      const savedEvaluations = localStorage.getItem('conversation_evaluations_v02');
      const loadedEvaluations: { [key: string]: Evaluation } = {};

      // Initialize all criteria to PASS (true) by default for error analysis approach
      const defaultCriteria: { [key: string]: boolean } = {};
      EVALUATION_CATEGORIES.forEach(category => {
        category.criteria.forEach(criterion => {
          defaultCriteria[criterion.id] = true; // Default to PASS - mark FAILs only
        });
      });

      conversationsList.forEach(conv => {
        loadedEvaluations[conv.conversation_id] = {
          humanAnnotation: preloadedAnnotations[conv.conversation_id] || '',
          humanCriteria: { ...defaultCriteria }, // All criteria default to PASS
          humanComplete: false,
          aiAnnotation: '',
          aiCriteria: { ...defaultCriteria },
          aiEvaluated: false,
          aiInProgress: false,
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
                humanAnnotation: parsed[id].humanAnnotation || parsed[id].annotation || loadedEvaluations[id].humanAnnotation,
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
    localStorage.setItem('conversation_evaluations_v02', JSON.stringify(updated));
  };

  const toggleCriterion = (conversation_id: string, criterion_id: string, criteriaType: 'human' | 'ai' = 'human') => {
    const evaluation = evaluations[conversation_id];
    if (!evaluation) return;

    if (criteriaType === 'human') {
      const current = evaluation.humanCriteria[criterion_id];
      updateEvaluation(conversation_id, {
        humanCriteria: {
          ...evaluation.humanCriteria,
          [criterion_id]: !current,
        },
      });
    } else {
      const current = evaluation.aiCriteria[criterion_id];
      updateEvaluation(conversation_id, {
        aiCriteria: {
          ...evaluation.aiCriteria,
          [criterion_id]: !current,
        },
      });
    }
  };

  const setCategoryPass = (conversation_id: string, category_id: string, pass: boolean) => {
    const evaluation = evaluations[conversation_id];
    if (!evaluation) return;

    const category = EVALUATION_CATEGORIES.find(c => c.id === category_id);
    if (!category) return;

    const updatedCriteria = { ...evaluation.humanCriteria };
    category.criteria.forEach(criterion => {
      updatedCriteria[criterion.id] = pass;
    });

    updateEvaluation(conversation_id, {
      humanCriteria: updatedCriteria,
    });
  };

  const startAIEvaluation = async (conversation_id: string) => {
    updateEvaluation(conversation_id, { aiInProgress: true });

    try {
      // TODO: Implement actual AI evaluation API call
      // For now, simulate with timeout
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock AI evaluation - randomly set some criteria
      const mockAICriteria = { ...evaluations[conversation_id].aiCriteria };
      const mockAnnotation = 'AI-generated annotation: This conversation shows good adherence to guidelines.';

      updateEvaluation(conversation_id, {
        aiCriteria: mockAICriteria,
        aiAnnotation: mockAnnotation,
        aiEvaluated: true,
        aiInProgress: false,
      });
    } catch (error) {
      console.error('AI evaluation failed:', error);
      updateEvaluation(conversation_id, { aiInProgress: false });
    }
  };

  const calculateScore = (conversation_id: string, criteriaType: 'human' | 'ai' = 'human') => {
    const evaluation = evaluations[conversation_id];
    if (!evaluation) return { categoryScores: {}, average: 0, hardRules: true };

    const criteria = criteriaType === 'human' ? evaluation.humanCriteria : evaluation.aiCriteria;
    const categoryScores: { [key: string]: { passed: number; total: number; percentage: number } } = {};
    let totalPassed = 0;
    let totalCriteria = 0;
    let hardRulesPassed = true;

    EVALUATION_CATEGORIES.forEach(category => {
      let passed = 0;
      const total = category.criteria.length;

      category.criteria.forEach(criterion => {
        if (criteria[criterion.id]) {
          passed++;
        }
        if (category.id === 'hard_rules' && !criteria[criterion.id]) {
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
      const humanScores = calculateScore(conv.conversation_id, 'human');
      const aiScores = calculateScore(conv.conversation_id, 'ai');

      return {
        conversation_id: conv.conversation_id,
        message_count: conv.messages.length,
        turn_count: conv.messages.filter(m => m.message_type === 'USER_MESSAGE').length,
        human_annotation: evaluation?.humanAnnotation || '',
        human_complete: evaluation?.humanComplete ? 'Yes' : 'No',
        human_average_score: humanScores.average,
        human_hard_rules: humanScores.hardRules ? 'PASS' : 'FAIL',
        ai_annotation: evaluation?.aiAnnotation || '',
        ai_evaluated: evaluation?.aiEvaluated ? 'Yes' : 'No',
        ai_average_score: aiScores.average,
        ai_hard_rules: aiScores.hardRules ? 'PASS' : 'FAIL',
        ...Object.fromEntries(
          Object.entries(humanScores.categoryScores).map(([cat, score]) => [`human_${cat}_score`, `${score.passed}/${score.total}`])
        ),
        ...Object.fromEntries(
          Object.entries(aiScores.categoryScores).map(([cat, score]) => [`ai_${cat}_score`, `${score.passed}/${score.total}`])
        ),
      };
    });

    const headers = [
      'conversation_id',
      'message_count',
      'turn_count',
      'human_annotation',
      'human_complete',
      'human_average_score',
      'human_hard_rules',
      ...EVALUATION_CATEGORIES.map(c => `human_${c.id}_score`),
      'ai_annotation',
      'ai_evaluated',
      'ai_average_score',
      'ai_hard_rules',
      ...EVALUATION_CATEGORIES.map(c => `ai_${c.id}_score`),
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
    a.download = `evaluations_v02_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const evaluationStats = {
    total: Math.min(selectedCount, conversations.length),
    humanComplete: conversations.slice(0, selectedCount).filter(c => {
      const evalData = evaluations[c.conversation_id];
      return evalData && evalData.humanComplete;
    }).length,
    aiComplete: conversations.slice(0, selectedCount).filter(c => {
      const evalData = evaluations[c.conversation_id];
      return evalData && evalData.aiEvaluated;
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
      <div className="border-b border-gray-200 dark:border-gray-800 bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Strukturierte Evaluation v0.2</h1>
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
      <div className="border-b border-gray-200 dark:border-gray-800 bg-card">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gesamt</div>
              <div className="text-2xl font-semibold mt-1">{evaluationStats.total}</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Human Complete</div>
              <div className="text-2xl font-semibold mt-1 text-blue-600">{evaluationStats.humanComplete}</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">AI Complete</div>
              <div className="text-2xl font-semibold mt-1 text-green-600">{evaluationStats.aiComplete}</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fortschritt</div>
              <div className="text-2xl font-semibold mt-1">{evaluationStats.total > 0 ? Math.round((evaluationStats.humanComplete / evaluationStats.total) * 100) : 0}%</div>
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
              <div key={conv.conversation_id} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-card p-6">
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
                          <div className="text-sm prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3">
                          <div className="text-xs text-muted-foreground mb-1">1&1 Assistent:</div>
                          <div className="text-sm prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Evaluation Section */}
                <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-4">
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
                    <label className="text-sm font-medium mb-2 block">Evaluation Criteria v0.2:</label>
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
                                  <Badge variant="outline" className={`ml-2 ${
                                    score.passed === score.total
                                      ? 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
                                      : 'bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-700'
                                  }`}>
                                    {score.passed}/{score.total} ({score.percentage}%)
                                  </Badge>
                                )}
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="pt-2 space-y-2">
                                {category.criteria.map((criterion) => {
                                  const isPassed = evaluation.criteria[criterion.id] !== false; // true or undefined = PASS
                                  return (
                                    <div
                                      key={criterion.id}
                                      className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                                      onClick={() => toggleCriterion(conv.conversation_id, criterion.id)}
                                    >
                                      {/* Icon with rounded colored box */}
                                      <div className={`flex items-center justify-center w-6 h-6 rounded mt-0.5 transition-all ${
                                        isPassed ? 'bg-gray-300 dark:bg-gray-700' : 'bg-red-600'
                                      }`}>
                                        {isPassed ? (
                                          // Check mark - PASS state (default, subtle)
                                          <svg
                                            className="w-4 h-4 text-gray-600 dark:text-gray-400"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                          </svg>
                                        ) : (
                                          // X mark - FAIL state (error found, prominent)
                                          <svg
                                            className="w-4 h-4 text-white"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        )}
                                      </div>
                                      <div className="grid gap-1.5 leading-none flex-1">
                                        <div className="text-sm font-medium leading-none">
                                          {criterion.label}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                          {criterion.description}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
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
