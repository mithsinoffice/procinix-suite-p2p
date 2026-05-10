import { Sparkles, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

// Simple AI Insight/Action types for OCR workflow
export interface SimpleAIInsight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  category: string;
  title: string;
  message: string;
  explanation: string;
  confidence: number;
  impact: string;
  suggested_action: string;
}

export interface SimpleAIAction {
  id: string;
  label: string;
  description: string;
  type: 'primary' | 'secondary';
  icon: string;
}

interface SimpleAIInsightsPanelProps {
  insights: SimpleAIInsight[];
  actions: SimpleAIAction[];
  onActionClick: (actionId: string) => void;
}

export function SimpleAIInsightsPanel({
  insights,
  actions,
  onActionClick,
}: SimpleAIInsightsPanelProps) {
  const getInsightIcon = (type: SimpleAIInsight['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getInsightColors = (type: SimpleAIInsight['type']) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-900',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-900',
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-900',
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-900',
        };
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 sticky top-24">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2 mb-2">
          <Sparkles className="w-5 h-5 text-teal-600" />
          <h3 className="text-gray-900">AI Insights</h3>
        </div>
        <p className="text-sm text-gray-600">Real-time analysis and suggestions</p>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
          {insights.map((insight) => {
            const colors = getInsightColors(insight.type);
            return (
              <div
                key={insight.id}
                className={`p-3 rounded-lg border ${colors.bg} ${colors.border}`}
              >
                <div className="flex items-start space-x-2 mb-2">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1">
                    <h4 className={`text-sm ${colors.text}`}>{insight.title}</h4>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-2">{insight.message}</p>
                {insight.explanation && (
                  <p className="text-xs text-gray-500 italic">{insight.explanation}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">{insight.category}</span>
                  <span className="text-xs text-gray-500">Confidence: {insight.confidence}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Actions */}
      {actions.length > 0 && (
        <div className="p-4 border-t border-gray-200 space-y-2">
          <h4 className="text-sm text-gray-700 mb-3">Suggested Actions</h4>
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => onActionClick(action.id)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                action.type === 'primary'
                  ? 'border-teal-200 bg-teal-50 hover:bg-teal-100'
                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-sm ${
                    action.type === 'primary' ? 'text-teal-900' : 'text-gray-900'
                  }`}
                >
                  {action.label}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    action.type === 'primary'
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {action.type}
                </span>
              </div>
              <p className="text-xs text-gray-600">{action.description}</p>
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {insights.length === 0 && actions.length === 0 && (
        <div className="p-8 text-center">
          <Sparkles className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No insights available yet</p>
        </div>
      )}
    </div>
  );
}
