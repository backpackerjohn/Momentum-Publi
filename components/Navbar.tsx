import React from 'react';
import PlusIcon from './icons/PlusIcon';
import AppLogoIcon from './icons/AppLogoIcon';
import WandIcon from './icons/WandIcon';
import MomentumMapIcon from './icons/MomentumMapIcon';
import TaskIcon from './icons/TaskIcon';
import CalendarIcon from './icons/CalendarIcon';
import GearIcon from './icons/GearIcon';
import TodayIcon from './icons/TodayIcon';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onBrainDumpClick: () => void;
  onThemeClick: () => void;
  activeTheme: string;
  previewMode: 'desktop' | 'mobile';
}

const MobileNavItem: React.FC<{
  Icon: React.FC<{className?: string}>;
  name: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ Icon, name, isActive, onClick }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center flex-1 h-16 rounded-lg transition-colors ${isActive ? 'text-[var(--color-primary-accent)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)]'}`}>
        <Icon className="h-6 w-6" />
        <span className="text-xs mt-1">{name}</span>
    </button>
);


const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate, onBrainDumpClick, onThemeClick, activeTheme, previewMode }) => {
  
  if (previewMode === 'mobile') {
        const mobileNavLinks = [
            { name: 'Today', icon: TodayIcon, page: 'Today' },
            { name: 'Map', icon: MomentumMapIcon, page: 'Momentum Map' },
            { name: 'Tasks', icon: TaskIcon, page: 'Task' },
            { name: 'Calendar', icon: CalendarIcon, page: 'Calendar' },
        ];

        return (
            <>
                <header className="mobile-preview-top-bar">
                    <button onClick={() => onNavigate('Dashboard')} className="flex items-center space-x-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary-accent)] rounded-lg">
                        <AppLogoIcon className="h-7 w-7 text-[var(--color-primary-accent)]" />
                        <span className="font-bold text-lg text-[var(--color-text-primary)]">Momentum</span>
                    </button>
                </header>

                <header className="mobile-preview-bottom-nav">
                    <nav className="h-16 flex items-center relative">
                        {mobileNavLinks.slice(0, 2).map((link) => (
                            <MobileNavItem key={link.name} Icon={link.icon} name={link.name} isActive={currentPage === link.page} onClick={() => onNavigate(link.page)} />
                        ))}
                        
                        <div className="flex-1 h-16 flex justify-center">
                            <button
                                onClick={onBrainDumpClick}
                                className="absolute -top-6 h-16 w-16 bg-[var(--color-primary-accent)] hover:bg-[var(--color-primary-accent-hover)] rounded-full text-white flex items-center justify-center shadow-lg border-4 border-[var(--color-surface)] transition-transform hover:scale-105"
                                title="Quick Brain Dump"
                            >
                                <PlusIcon className="h-7 w-7" />
                            </button>
                        </div>
                        
                        {mobileNavLinks.slice(2, 4).map((link) => (
                            <MobileNavItem key={link.name} Icon={link.icon} name={link.name} isActive={currentPage === link.page} onClick={() => onNavigate(link.page)} />
                        ))}
                    </nav>
                </header>
            </>
        );
    }

  const navLinks: { page: string; label: string }[] = [
    { page: 'Today', label: 'Today' },
    { page: 'Momentum Map', label: 'Momentum Map' },
    { page: 'Brain Dump', label: 'Brain Dump' },
    { page: 'Task', label: 'Tasks' },
    { page: 'Calendar', label: 'Calendar' },
    { page: 'Stats', label: 'Progress' },
    { page: 'Settings', label: 'Settings' },
  ];

  return (
    <header className="bg-[var(--color-bg)] border-b border-[var(--color-border)] sticky top-0 z-50">
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        {/* Left Section: Logo and Title */}
        <button onClick={() => onNavigate('Dashboard')} className="flex items-center space-x-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary-accent)] rounded-lg">
          <AppLogoIcon className="h-9 w-9 text-[var(--color-primary-accent)]" />
          <span className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Momentum
          </span>
        </button>

        {/* Center Section: Navigation Links */}
        <div className="hidden md:flex items-center space-x-1">
          {navLinks.map((link) => (
            <button
              key={link.page}
              onClick={() => onNavigate(link.page)}
              className={`px-4 py-2 transition-colors duration-200 font-semibold text-sm rounded-full ${
                currentPage === link.page
                  ? 'text-[var(--color-primary-accent)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-sunken)]'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Right Section: Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onThemeClick}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-semibold text-[var(--color-text-secondary)] bg-transparent border border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)] rounded-full transition-all"
            title="Open theme settings"
          >
            <WandIcon className="h-4 w-4 text-[var(--color-primary-accent)]" />
            <span className="hidden sm:inline">{activeTheme}</span>
          </button>
          <button
            onClick={onBrainDumpClick}
            className="flex items-center space-x-2 px-5 py-2.5 text-sm font-semibold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] hover:bg-[var(--color-primary-accent-hover)] active:bg-[var(--color-primary-accent-active)] rounded-full transition-all duration-200 shadow-sm hover:shadow-md active:shadow-inset"
            title="Quick Brain Dump (Ctrl+B)"
          >
            <PlusIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Brain Dump</span>
          </button>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;