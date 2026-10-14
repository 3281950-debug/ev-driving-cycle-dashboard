import { useState } from 'react';
import './ThemeSwitcher.css';
import { LayoutGrid, X, ChevronDown } from 'lucide-react';
import type { PanelDefinition } from '@/panels/types';
import { getAvailablePanels, getPanel } from '@/panels/registry';

interface ThemeSwitcherProps {
  activePanelId: string;
  onChange: (id: string) => void;
}

/**
 * Floating theme/panel picker. Lists every discoverable panel from the
 * registry and switches the active theme on click.
 */
export function ThemeSwitcher({ activePanelId, onChange }: ThemeSwitcherProps) {
  const [open, setOpen] = useState(false);
  const panels: PanelDefinition[] = getAvailablePanels();
  const active = getPanel(activePanelId);

  const select = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <div className="theme-switcher">
      <button
        onClick={() => setOpen(o => !o)}
        className="theme-trigger"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <LayoutGrid className="w-4 h-4" />
        <span>{open ? '主题' : active?.name ?? '主题'}</span>
        {open ? <X className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="theme-menu">
          <div className="theme-menu-heading">
            面板主题
          </div>
          <ul className="max-h-80 overflow-y-auto p-2 space-y-1">
            {panels.map(panel => {
              const isActive = panel.id === activePanelId;
              return (
                <li key={panel.id}>
                  <button
                    type="button"
                    onClick={() => select(panel.id)}
                    className={`theme-option ${isActive ? 'is-active' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">{panel.name}</span>
                      {isActive && <span className="theme-selected" />}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{panel.description}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}