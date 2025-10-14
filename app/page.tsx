'use client';

import { useState, useEffect } from 'react';
import type { QAPair, Criterion, EvaluationRun, PromptVersion } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { saveRun, getRuns, initializeDefaultPromptVersion, getCurrentPromptVersionId } from '@/lib/storage';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Home() {
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [sampleInputs, setSampleInputs] = useState<string[]>([]);
  const [qaPairs, setQAPairs] = useState<QAPair[]>([]);
  const [runPhase, setRunPhase] = useState<'idle' | 'generating' | 'generated' | 'evaluating' | 'evaluated'>('idle');
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [selectedCount, setSelectedCount] = useState<10 | 100>(10);
  const [shouldStop, setShouldStop] = useState(false);
  const [generatorModel, setGeneratorModel] = useState('claude-3-5-haiku-20241022');
  const [evaluatorModel, setEvaluatorModel] = useState('claude-sonnet-4-20250514');
  const [promptContent, setPromptContent] = useState('');
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [apiLogs, setApiLogs] = useState<Array<{timestamp: string, type: string, model: string, request: any, response: any}>>([]);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [currentPromptVersion, setCurrentPromptVersion] = useState<PromptVersion | null>(null);
  const [historicalRuns, setHistoricalRuns] = useState<EvaluationRun[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    fetch('/criteria.json').then(res => res.json()).then(setCriteria);
    fetch('/sample-inputs.json').then(res => res.json()).then((inputs: string[]) => {
      setSampleInputs(inputs);
      // Initialize qaPairs with all questions immediately
      const initialPairs: QAPair[] = inputs.map((q, i) => ({
        id: `pair-${i}`,
        question: q,
        answer: '',
        evaluation: undefined
      }));
      setQAPairs(initialPairs);
    });

    // Load prompt content and initialize version
    fetch('/api/prompt').then(res => res.text()).then((content) => {
      setPromptContent(content);
      const version = initializeDefaultPromptVersion(content);
      setCurrentPromptVersion(version);
    });

    // Load historical runs
    const runs = getRuns();
    setHistoricalRuns(runs);
  }, []);

  // Phase 1: Generate answers only
  const startGeneration = async () => {
    if (!currentPromptVersion) return;

    setRunPhase('generating');
    setShouldStop(false);
    setCurrentIndex(0);

    // Create new run
    const runId = `run-${Date.now()}`;
    setCurrentRunId(runId);

    // Work with existing qaPairs, process only the selected count
    const updatedPairs = [...qaPairs];

    // Reset answers and evaluations for the pairs we're processing
    for (let i = 0; i < selectedCount; i++) {
      updatedPairs[i] = {
        ...updatedPairs[i],
        answer: '',
        evaluation: undefined
      };
    }
    setQAPairs([...updatedPairs]);

    // Generate answers one by one
    for (let i = 0; i < selectedCount; i++) {
      if (shouldStop) break;

      setCurrentIndex(i);

      try {
        // Generate answer
        const genReqBody = { questions: [updatedPairs[i].question], model: generatorModel };
        const genRes = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(genReqBody),
        });
        const genResData = await genRes.json();
        const { qaPairs: generatedPairs } = genResData;
        updatedPairs[i].answer = generatedPairs[0].answer;
        setQAPairs([...updatedPairs]);

        // Log generation API call
        setApiLogs(prev => [...prev, {
          timestamp: new Date().toLocaleTimeString(),
          type: 'generate',
          model: generatorModel,
          request: genReqBody,
          response: genResData
        }]);
      } catch (error) {
        console.error('Error generating answer for pair', i, error);
      }
    }

    setRunPhase('generated');
    setCurrentIndex(-1);
    setShouldStop(false);

    // Save the run
    const run: EvaluationRun = {
      id: runId,
      timestamp: Date.now(),
      status: 'generated',
      promptVersionId: currentPromptVersion.id,
      generatorModel,
      evaluatorModel: undefined,
      qaPairs: updatedPairs.slice(0, selectedCount),
      aggregateScores: {
        llm: 0,
        human: undefined,
        synthesis: undefined,
      },
    };
    saveRun(run);
    setHistoricalRuns(getRuns());
  };

  // Phase 2: Evaluate existing answers
  const startEvaluation = async () => {
    if (!currentPromptVersion || !currentRunId) return;

    setRunPhase('evaluating');
    setShouldStop(false);
    setCurrentIndex(0);

    const updatedPairs = [...qaPairs];

    // Evaluate answers one by one
    for (let i = 0; i < selectedCount; i++) {
      if (shouldStop) break;
      if (!updatedPairs[i].answer) continue; // Skip if no answer

      setCurrentIndex(i);

      try {
        const evalRes = await fetch('/api/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: updatedPairs[i].question,
            answer: updatedPairs[i].answer,
            model: evaluatorModel,
          }),
        });
        const evalResData = await evalRes.json();
        const { evaluations, score } = evalResData;
        updatedPairs[i].evaluation = {
          llmEvaluations: evaluations,
          llmScore: score,
        };
        setQAPairs([...updatedPairs]);

        // Log evaluation API call
        setApiLogs(prev => [...prev, {
          timestamp: new Date().toLocaleTimeString(),
          type: 'evaluate',
          model: evaluatorModel,
          request: {
            question: updatedPairs[i].question,
            answer: updatedPairs[i].answer,
            model: evaluatorModel,
          },
          response: evalResData
        }]);
      } catch (error) {
        console.error('Error evaluating pair', i, error);
      }
    }

    setRunPhase('evaluated');
    setCurrentIndex(-1);
    setShouldStop(false);

    // Calculate aggregate scores
    const evaluatedPairs = updatedPairs.slice(0, selectedCount).filter(p => p.evaluation);
    const totalLLMScore = evaluatedPairs.reduce((sum, p) => sum + (p.evaluation?.llmScore || 0), 0);
    const avgLLMScore = evaluatedPairs.length > 0 ? totalLLMScore / evaluatedPairs.length : 0;

    // Calculate per-criterion scores
    const perCriterion: { [criterionId: string]: { llm: number } } = {};
    criteria.forEach(criterion => {
      const passCount = evaluatedPairs.filter(p =>
        p.evaluation?.llmEvaluations?.find(e => e.criterionId === criterion.id)?.passed
      ).length;
      perCriterion[criterion.id] = {
        llm: evaluatedPairs.length > 0 ? passCount / evaluatedPairs.length : 0,
      };
    });

    // Save/update the run
    const run: EvaluationRun = {
      id: currentRunId,
      timestamp: Date.now(),
      status: 'evaluated',
      promptVersionId: currentPromptVersion.id,
      generatorModel,
      evaluatorModel,
      qaPairs: updatedPairs.slice(0, selectedCount),
      aggregateScores: {
        llm: avgLLMScore,
        human: undefined,
        synthesis: undefined,
        perCriterion,
      },
    };
    saveRun(run);
    setHistoricalRuns(getRuns());
  };

  const stopProcessing = () => {
    setShouldStop(true);
    if (runPhase === 'generating') {
      setRunPhase('generated');
    } else if (runPhase === 'evaluating') {
      setRunPhase('evaluated');
    }
    setCurrentIndex(-1);
  };

  const getEvalStatus = (pair: QAPair, criterionId: string) => {
    return pair.evaluation?.llmEvaluations?.find(e => e.criterionId === criterionId);
  };

  const overallScore = qaPairs.length > 0
    ? (qaPairs.reduce((sum, p) => sum + (p.evaluation?.llmScore || 0), 0) / qaPairs.filter(p => p.evaluation).length * 100).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">1&1 Assistent Evaluator</h1>
              <p className="text-sm text-muted-foreground mt-1">Echtzeit-Auswertungs-Dashboard</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                <Button
                  onClick={() => setSelectedCount(10)}
                  disabled={runPhase === 'generating' || runPhase === 'evaluating'}
                  variant={selectedCount === 10 ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8"
                >
                  10
                </Button>
                <Button
                  onClick={() => setSelectedCount(100)}
                  disabled={runPhase === 'generating' || runPhase === 'evaluating'}
                  variant={selectedCount === 100 ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8"
                >
                  100
                </Button>
              </div>
              <Button
                onClick={() => setShowLogsModal(true)}
                variant="outline"
                size="default"
              >
                Debug-Protokolle
              </Button>
              {runPhase === 'generating' || runPhase === 'evaluating' ? (
                <Button
                  onClick={stopProcessing}
                  variant="destructive"
                  size="default"
                >
                  Stoppen
                </Button>
              ) : (
                <>
                  <Button
                    onClick={startGeneration}
                    disabled={qaPairs.length === 0}
                    size="default"
                    variant="default"
                  >
                    Antworten generieren
                  </Button>
                  <Button
                    onClick={startEvaluation}
                    disabled={runPhase !== 'generated' && runPhase !== 'evaluated'}
                    size="default"
                    variant="secondary"
                  >
                    Auswertung starten
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Gesamtpunktzahl</div>
              <div className="text-5xl font-bold text-primary mt-2">{overallScore}%</div>
            </div>
            <div className="flex gap-8">
              <div className="text-center">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gesamt</div>
                <div className="text-2xl font-semibold mt-1">{selectedCount}</div>
              </div>
              <div className="text-center">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bearbeitet</div>
                <div className="text-2xl font-semibold mt-1">
                  {qaPairs.filter(p => p.evaluation).length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="rounded-lg border bg-card">
          <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Frage</TableHead>
                  <TableHead className="w-48">Antwort</TableHead>
                  {criteria.map(c => (
                    <TableHead key={c.id} className="text-center w-24">
                      <Tooltip>
                        <TooltipTrigger className="cursor-help">{c.name}</TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">{c.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                  ))}
                  <TableHead className="text-center w-20">Punktzahl</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {qaPairs.slice(0, selectedCount).map((pair, index) => (
                <TableRow
                  key={pair.id}
                  className={(runPhase === 'generating' || runPhase === 'evaluating') && index === currentIndex ? 'bg-primary/10' : ''}
                >
                  <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>{pair.question}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {pair.answer ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="line-clamp-2 cursor-help">{pair.answer}</div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-md">
                          <p>{pair.answer}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="italic opacity-50">—</span>
                    )}
                  </TableCell>
                  {criteria.map(criterion => {
                    const evalStatus = getEvalStatus(pair, criterion.id);
                    return (
                      <TableCell key={criterion.id} className="text-center">
                        {evalStatus === undefined ? (
                          <div className="w-6 h-6 rounded border-2 border-border bg-background mx-auto" />
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              {evalStatus.passed ? (
                                <div className="w-6 h-6 rounded bg-green-500 flex items-center justify-center mx-auto cursor-help">
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded bg-red-500 flex items-center justify-center mx-auto cursor-help">
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </div>
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{evalStatus.reasoning}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center">
                    {pair.evaluation ? (
                      <Badge variant="secondary">
                        {(pair.evaluation.llmScore * 100).toFixed(0)}%
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <tfoot className="border-t-2 bg-muted/30">
              <tr>
                <td colSpan={3} className="px-4 py-4">
                  <div className="flex items-center gap-6 text-sm">
                    <Dialog open={showPromptModal} onOpenChange={setShowPromptModal}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8">
                          <span className="font-medium">Prompt anzeigen</span>
                          <span className="ml-2 text-muted-foreground">v2.3 (10.10.25)</span>
                        </Button>
                      </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center justify-between">
                              <span>System-Prompt</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(promptContent);
                                }}
                              >
                                Kopieren
                              </Button>
                            </DialogTitle>
                            <DialogDescription>Version 2.3 (10. Oktober 2025)</DialogDescription>
                          </DialogHeader>
                          <pre className="text-sm bg-muted p-4 rounded-md overflow-x-auto whitespace-pre-wrap">
                            {promptContent}
                          </pre>
                        </DialogContent>
                      </Dialog>

                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-medium">Modell:</span>
                      <Select value={generatorModel} onValueChange={setGeneratorModel}>
                        <SelectTrigger className="w-[160px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="claude-3-5-haiku-20241022">Haiku 3.5</SelectItem>
                          <SelectItem value="claude-sonnet-4-5-20250929">Sonnet 4.5</SelectItem>
                          <SelectItem value="claude-sonnet-4-20250514">Sonnet 4</SelectItem>
                          <SelectItem value="claude-opus-4-20250514">Opus 4</SelectItem>
                          <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                          <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                          <SelectItem value="gpt-4.1-mini">GPT-4.1 Mini</SelectItem>
                          <SelectItem value="gpt-5">GPT-5</SelectItem>
                          <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-medium">Evaluator:</span>
                      <Select value={evaluatorModel} onValueChange={setEvaluatorModel}>
                        <SelectTrigger className="w-[160px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="claude-3-5-haiku-20241022">Haiku 3.5</SelectItem>
                          <SelectItem value="claude-sonnet-4-5-20250929">Sonnet 4.5</SelectItem>
                          <SelectItem value="claude-sonnet-4-20250514">Sonnet 4</SelectItem>
                          <SelectItem value="claude-opus-4-20250514">Opus 4</SelectItem>
                          <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                          <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                          <SelectItem value="gpt-4.1-mini">GPT-4.1 Mini</SelectItem>
                          <SelectItem value="gpt-5">GPT-5</SelectItem>
                          <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    </div>
                  </td>
                  {criteria.map(criterion => {
                    const passCount = qaPairs.filter(p =>
                      p.evaluation?.llmEvaluations?.find(e => e.criterionId === criterion.id)?.passed
                    ).length;
                    const totalEvaluated = qaPairs.filter(p => p.evaluation).length;
                    const percentage = totalEvaluated > 0 ? (passCount / totalEvaluated * 100).toFixed(0) : '0';
                    return (
                      <td key={criterion.id} className="px-3 py-4 text-center">
                        <div className="text-sm font-semibold">{percentage}%</div>
                        <div className="text-xs text-muted-foreground">{passCount}/{totalEvaluated}</div>
                      </td>
                    );
                  })}
                  <td className="px-4 py-4 text-center">
                    <div className="text-sm text-muted-foreground">Durchschn.</div>
                  </td>
                </tr>
              </tfoot>
          </Table>
          </TooltipProvider>
        </div>
      </div>

      {/* Debug Logs Modal */}
      <Dialog open={showLogsModal} onOpenChange={setShowLogsModal}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>API Debug-Protokolle</DialogTitle>
            <DialogDescription>
              Alle API-Anfragen und Antworten ({apiLogs.length} insgesamt)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {apiLogs.length === 0 ? (
              <p className="text-muted-foreground text-sm">Noch keine API-Aufrufe. Starten Sie eine Auswertung, um Protokolle zu sehen.</p>
            ) : (
              apiLogs.slice().reverse().map((log, idx) => (
                <div key={idx} className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Badge variant={log.type === 'generate' ? 'default' : 'secondary'}>
                        {log.type === 'generate' ? 'Generieren' : 'Bewerten'}
                      </Badge>
                      <span className="text-sm font-medium">{log.model}</span>
                      <span className="text-xs text-muted-foreground">{log.timestamp}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(log, null, 2));
                      }}
                    >
                      Kopieren
                    </Button>
                  </div>
                  <details className="text-xs">
                    <summary className="cursor-pointer font-medium mb-2">Anfrage</summary>
                    <pre className="bg-background p-3 rounded overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(log.request, null, 2)}
                    </pre>
                  </details>
                  <details className="text-xs mt-2">
                    <summary className="cursor-pointer font-medium mb-2">Antwort</summary>
                    <pre className="bg-background p-3 rounded overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(log.response, null, 2)}
                    </pre>
                  </details>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
