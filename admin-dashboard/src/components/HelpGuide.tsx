import { useState } from 'react';
import { Info, X } from 'lucide-react';

interface HelpGuideProps {
  title: string;
  description: string;
  steps?: string[];
  tips?: string[];
}

export default function HelpGuide({ title, description, steps, tips }: HelpGuideProps) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <Info size={16} className="mt-0.5 text-blue-600 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 text-sm">{title}</h3>
            {!collapsed && (
              <>
                <p className="mt-1 text-xs text-blue-700">{description}</p>
                {steps && steps.length > 0 && (
                  <ol className="mt-1.5 ml-3 list-decimal text-xs text-blue-700 space-y-0.5">
                    {steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                )}
                {tips && tips.length > 0 && (
                  <div className="mt-1.5 text-xs text-blue-700">
                    <strong>Tips:</strong>
                    <ul className="ml-3 mt-0.5 list-disc space-y-0.5">
                      {tips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-blue-600 hover:text-blue-800 flex-shrink-0 ml-2"
        >
          {collapsed ? '+' : <X size={14} />}
        </button>
      </div>
    </div>
  );
}
