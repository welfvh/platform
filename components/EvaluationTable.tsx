'use client';

// Table component displaying Q&A pairs with LLM and human evaluations side-by-side
import { useState } from 'react';
import type { QAPair, Criterion } from '@/lib/types';

interface Props {
  qaPairs: QAPair[];
  criteria: Criterion[];
  onHumanEvaluation: (
    pairId: string,
    criterionId: string,
    passed: boolean,
    reasoning: string
  ) => void;
}

export function EvaluationTable({ qaPairs, criteria, onHumanEvaluation }: Props) {
  const [expandedPairs, setExpandedPairs] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{
    pairId: string;
    criterionId: string;
  } | null>(null);
  const [humanReasoning, setHumanReasoning] = useState('');

  const toggleExpanded = (pairId: string) => {
    const newExpanded = new Set(expandedPairs);
    if (newExpanded.has(pairId)) {
      newExpanded.delete(pairId);
    } else {
      newExpanded.add(pairId);
    }
    setExpandedPairs(newExpanded);
  };

  const handleHumanEval = (
    pairId: string,
    criterionId: string,
    passed: boolean
  ) => {
    setEditingCell({ pairId, criterionId });
    const pair = qaPairs.find((p) => p.id === pairId);
    const existingEval = pair?.evaluation?.humanEvaluations?.find(
      (e) => e.criterionId === criterionId
    );
    setHumanReasoning(existingEval?.reasoning || '');
  };

  const saveHumanEval = (passed: boolean) => {
    if (!editingCell) return;
    if (!humanReasoning.trim()) {
      alert('Please provide reasoning for your evaluation');
      return;
    }
    onHumanEvaluation(
      editingCell.pairId,
      editingCell.criterionId,
      passed,
      humanReasoning
    );
    setEditingCell(null);
    setHumanReasoning('');
  };

  const getEvalStatus = (
    pair: QAPair,
    criterionId: string,
    isHuman: boolean
  ) => {
    const evals = isHuman
      ? pair.evaluation?.humanEvaluations
      : pair.evaluation?.llmEvaluations;
    return evals?.find((e) => e.criterionId === criterionId);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900 w-12">
                #
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900">
                Question
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900 w-32">
                Answer
              </th>
              {criteria.map((criterion) => (
                <th
                  key={criterion.id}
                  className="px-2 py-3 text-center text-xs font-semibold text-gray-900 w-16"
                  title={criterion.description}
                >
                  {criterion.name.split(' ')[0]}
                </th>
              ))}
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-900 w-20">
                Score
              </th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-900 w-24">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {qaPairs.map((pair, index) => (
              <>
                <tr key={pair.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-3 py-3 text-xs font-medium text-gray-500">
                    {index + 1}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-900">
                    <div className="line-clamp-2">{pair.question}</div>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-900">
                    <div className="line-clamp-2">{pair.answer}</div>
                  </td>
                  {criteria.map((criterion) => {
                    const llmEval = getEvalStatus(pair, criterion.id, false);
                    return (
                      <td key={criterion.id} className="px-2 py-3 text-center">
                        {llmEval ? (
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center mx-auto ${
                              llmEval.passed
                                ? 'bg-green-500 text-white'
                                : 'bg-red-500 text-white'
                            }`}
                            title={llmEval.reasoning}
                          >
                            {llmEval.passed ? '✓' : '✗'}
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded border-2 border-gray-300 bg-gray-50 mx-auto"></div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-center">
                    {pair.evaluation ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {(pair.evaluation.llmScore * 100).toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => toggleExpanded(pair.id)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      {expandedPairs.has(pair.id) ? 'Hide' : 'Show'}
                    </button>
                  </td>
                </tr>
                {expandedPairs.has(pair.id) && (
                  <tr>
                    <td colSpan={criteria.length + 4} className="bg-gray-50 px-4 py-6">
                      <div className="space-y-6">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">
                            Question
                          </h4>
                          <p className="text-sm text-gray-700">
                            {pair.question}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">
                            Answer
                          </h4>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {pair.answer}
                          </p>
                        </div>

                        {pair.evaluation && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-4">
                              Evaluations
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="w-full border border-gray-200 rounded-lg">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 border-b">
                                      Criterion
                                    </th>
                                    <th className="px-4 py-2 text-center text-sm font-semibold text-blue-700 border-b border-l">
                                      LLM Evaluation
                                    </th>
                                    <th className="px-4 py-2 text-center text-sm font-semibold text-green-700 border-b border-l">
                                      Human Evaluation
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {criteria.map((criterion) => {
                                    const llmEval = getEvalStatus(
                                      pair,
                                      criterion.id,
                                      false
                                    );
                                    const humanEval = getEvalStatus(
                                      pair,
                                      criterion.id,
                                      true
                                    );
                                    const isEditing =
                                      editingCell?.pairId === pair.id &&
                                      editingCell?.criterionId === criterion.id;

                                    return (
                                      <tr key={criterion.id}>
                                        <td className="px-4 py-3 border-b">
                                          <div className="font-medium text-sm text-gray-900">
                                            {criterion.name}
                                          </div>
                                          <div className="text-xs text-gray-600 mt-1">
                                            {criterion.description}
                                          </div>
                                        </td>
                                        <td className="px-4 py-3 border-b border-l bg-blue-50">
                                          {llmEval ? (
                                            <div className="space-y-2">
                                              <div className="flex items-center justify-center">
                                                <span
                                                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                                    llmEval.passed
                                                      ? 'bg-green-100 text-green-800'
                                                      : 'bg-red-100 text-red-800'
                                                  }`}
                                                >
                                                  {llmEval.passed ? 'YES' : 'NO'}
                                                </span>
                                              </div>
                                              <div className="text-xs text-gray-600">
                                                {llmEval.reasoning}
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="text-center text-sm text-gray-400">
                                              -
                                            </div>
                                          )}
                                        </td>
                                        <td className="px-4 py-3 border-b border-l bg-green-50">
                                          {isEditing ? (
                                            <div className="space-y-2">
                                              <textarea
                                                value={humanReasoning}
                                                onChange={(e) =>
                                                  setHumanReasoning(e.target.value)
                                                }
                                                placeholder="Provide reasoning..."
                                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                                                rows={2}
                                              />
                                              <div className="flex gap-2 justify-center">
                                                <button
                                                  onClick={() => saveHumanEval(true)}
                                                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                                >
                                                  YES
                                                </button>
                                                <button
                                                  onClick={() => saveHumanEval(false)}
                                                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                                                >
                                                  NO
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    setEditingCell(null);
                                                    setHumanReasoning('');
                                                  }}
                                                  className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                                                >
                                                  Cancel
                                                </button>
                                              </div>
                                            </div>
                                          ) : humanEval ? (
                                            <div className="space-y-2">
                                              <div className="flex items-center justify-center">
                                                <span
                                                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                                    humanEval.passed
                                                      ? 'bg-green-100 text-green-800'
                                                      : 'bg-red-100 text-red-800'
                                                  }`}
                                                >
                                                  {humanEval.passed ? 'YES' : 'NO'}
                                                </span>
                                              </div>
                                              <div className="text-xs text-gray-600">
                                                {humanEval.reasoning}
                                              </div>
                                              <div className="flex justify-center">
                                                <button
                                                  onClick={() =>
                                                    handleHumanEval(
                                                      pair.id,
                                                      criterion.id,
                                                      humanEval.passed
                                                    )
                                                  }
                                                  className="text-xs text-blue-600 hover:text-blue-800"
                                                >
                                                  Edit
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="flex justify-center">
                                              <button
                                                onClick={() =>
                                                  handleHumanEval(
                                                    pair.id,
                                                    criterion.id,
                                                    false
                                                  )
                                                }
                                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                              >
                                                Evaluate
                                              </button>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
