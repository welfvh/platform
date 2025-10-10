# 1&1 Assistant Evaluation Platform

A prototype evaluation platform for testing and evaluating the 1&1 customer service chatbot assistant. This platform enables running automated evaluations using Claude Sonnet 4 and allows human reviewers to validate and compare results.

## Features

- **Automated Answer Generation**: Generate responses to 100 sample customer queries using Claude Sonnet 4
- **LLM-Based Evaluation**: Automatically evaluate responses against 4 binary criteria
- **Human Review Interface**: Side-by-side comparison of LLM and human evaluations
- **Scoring System**: Calculate aggregate scores for LLM, human, and synthesis metrics
- **Run Comparison**: Save and compare multiple evaluation runs
- **Interactive UI**: Expandable table view for detailed Q&A pair inspection

## Evaluation Criteria

The platform evaluates responses based on four binary criteria:

1. **Relevance**: Does the response directly address the customer's question?
2. **Accuracy**: Is the information factually correct for a 1&1 telecom context?
3. **Helpfulness**: Does the response provide actionable guidance?
4. **Professional Tone**: Is the tone appropriate for customer service?

## Setup

### Prerequisites

- Node.js 18+ installed
- Anthropic API key

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file with your Anthropic API key:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and add your API key:
   ```
   ANTHROPIC_API_KEY=your_actual_api_key_here
   ```

### Running the Application

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Running an Evaluation

1. **Start New Run**: Click the "Start New Run" button to generate answers for all 100 sample inputs
2. **Start Evaluation**: Once answers are generated, click "Start Evaluation" to have the LLM evaluate each Q&A pair
3. **Review Results**: View the table showing all Q&A pairs with their LLM scores

### Human Review

1. Click "Show" on any Q&A pair to expand the details
2. In the evaluation table, click "Evaluate" in the Human Evaluation column
3. Enter your reasoning and click YES or NO
4. Repeat for all criteria you want to evaluate
5. The human score and synthesis score will update automatically

### Comparing Runs

- Previous runs are saved and displayed below the current run
- Click on any previous run to view its results
- Compare LLM and human scores across different runs

## Project Structure

```
1and1-eval-platform/
├── app/
│   ├── api/
│   │   ├── generate/route.ts    # API for generating answers
│   │   └── evaluate/route.ts    # API for evaluating Q&A pairs
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Main page component
│   └── globals.css              # Global styles
├── components/
│   └── EvaluationTable.tsx      # Table component for Q&A pairs
├── lib/
│   ├── types.ts                 # TypeScript type definitions
│   └── anthropic.ts             # Anthropic API client utilities
├── prompt.md                    # System prompt for 1&1 assistant
├── sample-inputs.json           # 100 sample customer queries
├── criteria.json                # Evaluation criteria definitions
└── README.md
```

## Deployment to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add the `ANTHROPIC_API_KEY` environment variable in Vercel project settings
4. Deploy

## Technical Details

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **LLM**: Claude Sonnet 4 (claude-sonnet-4-5-20250929)
- **API**: Anthropic Messages API

## Customization

### Modifying the Prompt

Edit `prompt.md` to change the system prompt for the 1&1 assistant.

### Adding/Removing Sample Inputs

Edit `sample-inputs.json` to modify the test questions.

### Changing Evaluation Criteria

Edit `criteria.json` to add, remove, or modify evaluation criteria. Each criterion requires:
- `id`: Unique identifier
- `name`: Display name
- `description`: Short description
- `prompt`: Evaluation prompt for the LLM

## License

ISC
