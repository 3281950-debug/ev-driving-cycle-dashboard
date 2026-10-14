import { useState } from 'react';
import './App.css';
import { useDashboardData } from '@/hooks/useDashboardData';
import { getPanel, DEFAULT_PANEL_ID } from '@/panels/registry';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { savePanelThemeId } from '@/utils/themeStorage';
import { useEVSimulator } from '@/hooks/useEVSimulator';
import { useCycleComparison } from '@/hooks/useCycleComparison';
import { ComparisonView } from '@/components/Analysis/ComparisonView';
import type { PanelDefinition } from '@/panels/types';

function LegacyPanel({ panel }: { panel: Extract<PanelDefinition, { kind: 'obd' }> }) {
  const dashboard = useDashboardData();
  const Component = panel.component;
  return <Component {...dashboard} />;
}

function App() {
  const [activePanelId, setActivePanelId] = useState<string>(
    DEFAULT_PANEL_ID
  );

  // Single shared data source rendered by whichever theme is active.
  const dashboard = useEVSimulator();
  const comparison = useCycleComparison();
  const [activeView, setActiveView] = useState<'dashboard' | 'comparison'>('dashboard');
  const panel = getPanel(activePanelId);

  const handleThemeChange = (id: string) => {
    setActivePanelId(id);
    savePanelThemeId(id);
  };

  return (
    <div className="App">
      <nav aria-label="应用视图" className={`view-navigation ${activeView === 'comparison' ? 'analysis-navigation' : ''} ${panel.kind === 'obd' && activeView === 'dashboard' ? 'legacy-navigation' : ''}`}>
        <button aria-pressed={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')}>实时仪表盘</button><button aria-pressed={activeView === 'comparison'} onClick={() => setActiveView('comparison')}>工况对比分析</button>
      </nav>
      <div hidden={activeView !== 'dashboard'}>
        <ThemeSwitcher activePanelId={activePanelId} onChange={handleThemeChange} />
        {panel.kind === 'ev' ? <panel.component {...dashboard} /> : <LegacyPanel panel={panel} />}
      </div>
      {activeView === 'comparison' && <ComparisonView {...comparison} />}
    </div>
  );
}

export default App;
