# AI Insights Panel - Implementation Guide

## Overview
The Agentic AI Insights assistant panel provides real-time, explainable insights during invoice creation to help users identify issues, ensure compliance, and prevent fraud.

## Components

### 1. AIInsightsPanel (`/components/AIInsightsPanel.tsx`)
The main UI component that displays AI insights and actions.

**Features:**
- Severity-based insight cards (Blocker, Warning, Info)
- Confidence scoring for each insight
- Recommended actions with one-click execution
- Expandable evidence sections
- AI Actions section with auto-run capabilities
- Ignore functionality with mandatory justification

**Props:**
- `insights`: Array of AI insights to display
- `aiActions`: Array of AI actions (auto-check duplicates, validate GST, etc.)
- `overallConfidence`: Overall confidence level (high/medium/low)
- `onActionClick`: Handler for insight action clicks
- `onRunAIAction`: Handler for AI action execution
- `onIgnoreInsight`: Handler for ignoring insights
- `onExplainInsight`: Handler for explaining insights
- `isExpanded`: Panel expansion state
- `onToggleExpand`: Handler for toggling panel

### 2. AI Insights Generator (`/utils/aiInsightsGenerator.ts`)
Utility functions for generating AI insights based on invoice data.

**Key Functions:**

#### `generateAIInsights()`
Generates insights based on invoice and vendor data:
- Duplicate invoice detection (exact & fuzzy match)
- MSME vendor compliance reminders
- PO/GRN mismatch detection
- GSTIN validation
- Bank details change warnings
- Unusual invoice amount detection
- Missing mandatory documents
- TDS section recommendations
- Payment terms suggestions

#### `generateAIActions()`
Creates the list of automated AI actions:
- Auto-check duplicates
- Auto-validate GST
- Auto-reconcile PO/GRN
- Auto-fill TDS section

## Insight Types

### Blocker (Critical)
- Prevents invoice submission until resolved
- Red color scheme (#FF4E5B)
- Examples: Duplicate invoices, invalid GSTIN format, major PO/GRN mismatches

### Warning (Important)
- Allows submission with justification
- Amber color scheme (#F59E0B)
- Examples: Similar invoices, GSTIN mismatches, bank account changes

### Info (Advisory)
- Non-blocking, informational insights
- Blue color scheme (#3B82F6)
- Examples: MSME reminders, TDS suggestions, payment term recommendations

## Integration

### In Invoice Form Component
```tsx
import { AIInsightsPanel, AIInsight, AIAction } from './AIInsightsPanel';
import { generateAIInsights, generateAIActions } from '../utils/aiInsightsGenerator';

// State
const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
const [aiActions, setAiActions] = useState<AIAction[]>([]);

// Generate insights when data changes
useEffect(() => {
  const insights = generateAIInsights(invoiceData, vendorData, historicalInvoices, poData, grnData);
  setAiInsights(insights);
}, [invoiceData, vendorData, ...]);

// Render panel
<AIInsightsPanel
  insights={aiInsights}
  aiActions={aiActions}
  overallConfidence={overallConfidence}
  onActionClick={handleAIActionClick}
  onRunAIAction={handleRunAIAction}
  onIgnoreInsight={handleIgnoreInsight}
  onExplainInsight={handleExplainInsight}
/>
```

## Design Principles

1. **Explainable AI**: Every insight includes clear explanations and supporting evidence
2. **Transparency**: Confidence scores and rationale are always visible
3. **Actionable**: Each insight provides specific recommended actions
4. **Non-intrusive**: Panel can be collapsed, warnings allow override with justification
5. **Audit Trail**: All ignored insights are logged with mandatory justification
6. **Enterprise-grade**: Clean UI, strong hierarchy, professional design

## Color Scheme

- **Blocker**: #FF4E5B (Red)
- **Warning**: #F59E0B (Amber)
- **Info**: #3B82F6 (Blue)
- **Success**: #10B981 (Green)
- **Primary Action**: #00A9B7 (Teal)
- **Background**: #F6F9FC (Opal White)
- **Border**: #E1E6EA (Silver Grey)

## Future Enhancements

1. Machine learning integration for anomaly detection
2. Historical pattern analysis
3. Vendor risk scoring
4. Real-time GSTIN verification via API
5. Integration with external fraud databases
6. Advanced cashflow impact predictions
7. Smart routing based on insight severity
