import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsForm } from '@/components/user/SettingsForm';

// Note: ResizeObserver and matchMedia polyfills are in tests/setup.ts

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      // Settings
      'settings.title': 'Settings',
      'settings.language': 'Language',
      'settings.languageDescription': 'Select your preferred language',
      'settings.theme': 'Theme',
      'settings.themeDescription': 'Select your preferred theme',
      'settings.notifications': 'Notifications',
      'settings.notificationsDescription': 'Manage notification preferences',
      'settings.emailNotifications': 'Email Notifications',
      'settings.pushNotifications': 'Push Notifications',
      'settings.save': 'Save',
      'settings.saved': 'Settings saved',
      // Languages
      'interview.setup.languages.zhTW': 'Traditional Chinese',
      'interview.setup.languages.en': 'English',
      // Themes
      'settings.themes.light': 'Light',
      'settings.themes.dark': 'Dark',
      'settings.themes.system': 'System',
    };
    return translations[key] || key;
  },
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => '/en/settings',
}));

// Mock heroui addToast
vi.mock('@heroui/react', async () => {
  const actual = await vi.importActual('@heroui/react');
  return {
    ...actual,
    addToast: vi.fn(),
  };
});

// Create mock store functions
const mockUpdateSettings = vi.fn();

// Define default settings
const defaultSettings = {
  id: 'settings-1',
  preferredLanguage: 'en',
  theme: 'system',
  notifications: { email: true, push: false },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
};

// Mutable store state for tests
let mockStoreState = {
  settings: defaultSettings as typeof defaultSettings | null,
  isLoadingSettings: false,
  updateSettings: mockUpdateSettings,
};

// Mock the user store
vi.mock('@/lib/stores/user-store', () => ({
  useUserStore: () => mockStoreState,
}));

describe('SettingsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateSettings.mockResolvedValue(undefined);
    // Reset store state to default
    mockStoreState = {
      settings: { ...defaultSettings, notifications: { ...defaultSettings.notifications } },
      isLoadingSettings: false,
      updateSettings: mockUpdateSettings,
    };
  });

  describe('rendering', () => {
    it('should render settings title correctly', () => {
      render(<SettingsForm />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render language section', () => {
      render(<SettingsForm />);

      expect(screen.getByText('Language')).toBeInTheDocument();
      expect(screen.getByText('Select your preferred language')).toBeInTheDocument();
    });

    it('should render theme section', () => {
      render(<SettingsForm />);

      expect(screen.getByText('Theme')).toBeInTheDocument();
      expect(screen.getByText('Select your preferred theme')).toBeInTheDocument();
    });

    it('should render notifications section', () => {
      render(<SettingsForm />);

      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Manage notification preferences')).toBeInTheDocument();
      expect(screen.getByText('Email Notifications')).toBeInTheDocument();
      expect(screen.getByText('Push Notifications')).toBeInTheDocument();
    });

    it('should return null when settings is not available', () => {
      mockStoreState = {
        settings: null,
        isLoadingSettings: false,
        updateSettings: mockUpdateSettings,
      };

      const { container } = render(<SettingsForm />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('current values display', () => {
    it('should render current language value', () => {
      render(<SettingsForm />);

      // The Select should display the current language
      expect(screen.getByLabelText('Language')).toBeInTheDocument();
    });

    it('should render current theme value', () => {
      render(<SettingsForm />);

      // The Select should display the current theme
      expect(screen.getByLabelText('Theme')).toBeInTheDocument();
    });
  });

  describe('notification toggles', () => {
    it('should render email notification switch', () => {
      render(<SettingsForm />);

      // Find the switches
      const switches = screen.getAllByRole('switch');
      expect(switches.length).toBe(2);
    });

    it('should be able to interact with email notification switch', async () => {
      const user = userEvent.setup();
      render(<SettingsForm />);

      const switches = screen.getAllByRole('switch');
      const emailSwitch = switches[0];

      // Switch should be clickable without throwing errors
      await user.click(emailSwitch);

      // Switch should still be in the document after clicking
      expect(emailSwitch).toBeInTheDocument();
    });

    it('should be able to interact with push notification switch', async () => {
      const user = userEvent.setup();
      render(<SettingsForm />);

      const switches = screen.getAllByRole('switch');
      const pushSwitch = switches[1];

      // Switch should be clickable without throwing errors
      await user.click(pushSwitch);

      // Switch should still be in the document after clicking
      expect(pushSwitch).toBeInTheDocument();
    });
  });

  describe('language selection', () => {
    it('should have language select with aria-label', async () => {
      render(<SettingsForm />);

      const languageSelect = screen.getByLabelText('Language');
      expect(languageSelect).toBeInTheDocument();
    });
  });

  describe('theme selection', () => {
    it('should have theme select with aria-label', async () => {
      render(<SettingsForm />);

      const themeSelect = screen.getByLabelText('Theme');
      expect(themeSelect).toBeInTheDocument();
    });
  });

  describe('save functionality', () => {
    it('should render save button', () => {
      render(<SettingsForm />);

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('should call updateSettings when save is clicked', async () => {
      const user = userEvent.setup();
      render(<SettingsForm />);

      // Toggle a notification to change something
      const switches = screen.getAllByRole('switch');
      await user.click(switches[1]); // Toggle push notifications

      // Click save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalledWith({
          preferredLanguage: 'en',
          theme: 'system',
          notifications: { email: true, push: true },
        });
      });
    });

    it('should call onUpdate callback after successful save', async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn();

      render(<SettingsForm onUpdate={onUpdate} />);

      // Click save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalled();
      });
    });
  });
});
