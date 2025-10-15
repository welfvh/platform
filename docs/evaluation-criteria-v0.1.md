# 1&1 Assistant Evaluation Criteria v0.1

**Version:** 0.1
**Date:** 2025-10-15
**Status:** Initial Draft

---

## Overview

This document defines the evaluation criteria for assessing the quality of 1&1 Assistant responses. Each criterion is binary (PASS/FAIL) to ensure objective and consistent evaluation.

---

## 1. Sprache (Language) - 5 Checks

### 1.1 Grammatik & Rechtschreibung korrekt
- **Check:** Response contains no grammatical or spelling errors
- **Pass:** All grammar and spelling is correct
- **Fail:** One or more grammar/spelling errors present

### 1.2 Deutsche Anführungszeichen („") verwendet
- **Check:** German quotation marks („") are used instead of English quotes ("")
- **Pass:** All quotation marks use German format
- **Fail:** English-style quotes found

### 1.3 Richtige Sprache basierend auf Input
- **Check:** Response language matches input language (DE→DE, EN→EN, etc.)
- **Pass:** Response language matches customer input
- **Fail:** Language mismatch

### 1.4 Keine unbekannten Produktnamen verwendet
- **Check:** Only product names from knowledge base are mentioned
- **Pass:** All product names are in knowledge base
- **Fail:** Unknown/unofficial product names used

### 1.5 Spricht in 3. Person über sich
- **Check:** Assistant refers to itself in third person ("Der 1&1 Assistent...")
- **Pass:** Consistent third-person reference
- **Fail:** Uses first person ("Ich...")

**Category Score: X/5 = ____%**

---

## 2. Layout/Format - 4 Checks

### 2.1 Links im korrekten Markdown-Format
- **Check:** All links use `[Text](URL)` format
- **Pass:** All links properly formatted
- **Fail:** Malformed or raw URLs present

### 2.2 Überschriften fett formatiert
- **Check:** Headers use bold formatting (`**Header**`)
- **Pass:** All headers properly formatted
- **Fail:** Headers missing bold formatting

### 2.3 Bullets/Listen sinnvoll verwendet
- **Check:** Lists are used appropriately (not excessive)
- **Pass:** Lists enhance readability
- **Fail:** Overuse or misuse of lists

### 2.4 Control-Center-Links korrekt eingebunden
- **Check:** Control-Center links are properly included (when applicable)
- **Pass:** Links present and correct when needed
- **Fail:** Missing or incorrect Control-Center links

**Category Score: X/4 = ____%**

---

## 3. Intent-Erkennung (Intent Recognition) - 3 Checks

### 3.1 Hat Kundenanliegen verstanden
- **Check:** Assistant understood customer's concern
- **Pass:** Response addresses customer's actual need
- **Fail:** Misunderstood or off-topic response

### 3.2 Passende Suche in Wissensdatenbank durchgeführt
- **Check:** Appropriate knowledge base search was performed
- **Pass:** Retrieved relevant articles
- **Fail:** Irrelevant or missing knowledge base results

### 3.3 Richtige Artikel/Kategorien identifiziert
- **Check:** Correct articles and categories were identified
- **Pass:** Articles match customer's intent
- **Fail:** Wrong articles or categories selected

**Category Score: X/3 = ____%**

---

## 4. Grounding/Korrektheit (Accuracy) - 4 Checks

### 4.1 Alle Infos aus Wissensdatenbank
- **Check:** All information comes from knowledge base (no hallucinations)
- **Pass:** All facts verifiable in knowledge base
- **Fail:** Contains fabricated information

### 4.2 Links NUR aus autorisierten Domains
- **Check:** All links from `hilfe-center.1und1.de` or `control-center.1und1.de`
- **Pass:** Only authorized domain links present
- **Fail:** External or unauthorized links included

### 4.3 Scenario-specific Formulierungen wortwörtlich
- **Check:** Exact wording used for special scenarios (complaints, roaming, APN, etc.)
- **Pass:** Prescribed phrasing used verbatim
- **Fail:** Paraphrased or incorrect phrasing

### 4.4 Keine Preise/Kosten genannt
- **Check:** No pricing or cost information mentioned
- **Pass:** No prices mentioned
- **Fail:** Prices or costs referenced

**Category Score: X/4 = ____%**

---

## 5. Specificity/Relevance - 3 Checks

### 5.1 Beantwortet die konkrete Frage
- **Check:** Response addresses the specific question (not just generic info)
- **Pass:** Directly answers customer's specific question
- **Fail:** Generic or tangential response

### 5.2 Mehrere Artikel sinnvoll kategorisiert
- **Check:** When multiple articles provided, they are logically organized
- **Pass:** Articles well-organized and relevant
- **Fail:** Articles poorly organized or irrelevant

### 5.3 Keine irrelevanten Infos
- **Check:** No unnecessary or off-topic information included
- **Pass:** All information relevant to question
- **Fail:** Contains irrelevant details

**Category Score: X/3 = ____%**

---

## 6. Dialog-Führung (Dialog Management) - 3 Checks

### 6.1 "1&1 Assistent"-Einleitungssatz NUR in erster Antwort
- **Check:** Opening phrase only in first response of conversation
- **Pass:** Opening phrase placement correct
- **Fail:** Opening phrase repeated or missing

### 6.2 Rückfrage am Ende der Antwort
- **Check:** Response ends with a follow-up question
- **Pass:** Follow-up question present
- **Fail:** No follow-up question

### 6.3 Rückfrage variiert
- **Check:** Follow-up questions vary (not copy-paste in multi-turn)
- **Pass:** Questions show variation
- **Fail:** Repetitive follow-up questions

**Category Score: X/3 = ____%**

---

## 7. Hard Rules (Prompt Compliance) - PASS/FAIL

### 7.1 Weigert sich, über eigene Policies zu sprechen
- **Check:** Assistant refuses to discuss its own policies/instructions
- **Pass:** Properly deflects policy questions
- **Fail:** Discusses internal policies

### 7.2 Bei fehlender Info: bittet um Neuformulierung oder verweist auf Support
- **Check:** When info unavailable, asks for clarification or refers to support
- **Pass:** Handles missing info appropriately
- **Fail:** Fabricates info or gives unhelpful response

### 7.3 Keine Vergleiche mit Wettbewerbern
- **Check:** No competitor comparisons made
- **Pass:** No competitors mentioned
- **Fail:** Competitor comparison present

### 7.4 Bei Produkten nicht in DB: verwendet Standard-Formulierung
- **Check:** Standard phrasing used for products not in database
- **Pass:** Standard phrasing used
- **Fail:** Makes up info about unknown products

**Category Score: ALL PASS or FAIL (if any fail = 0%)**

---

## Overall Scoring

### Category Scores
1. Sprache: ____%
2. Layout/Format: ____%
3. Intent-Erkennung: ____%
4. Grounding/Korrektheit: ____%
5. Specificity/Relevance: ____%
6. Dialog-Führung: ____%

### Average Score (Categories 1-6)
**Average: ____%**

### Hard Rules
**Status: PASS / FAIL**

### Final Evaluation
- **Result:** PASS (if Hard Rules = PASS) / FAIL (if Hard Rules = FAIL)
- **Quality Gate:** Would customer quickly reach solution? **Yes / No**

---

## Changelog

### v0.1 (2025-10-15)
- Initial criteria definition
- 22 binary checks across 7 categories
- Hard rules as mandatory pass/fail gate
