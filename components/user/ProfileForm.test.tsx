import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileForm } from '@/components/user/ProfileForm';

// Note: ResizeObserver and matchMedia polyfills are in tests/setup.ts

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: 'Profile',
      name: 'Name',
      email: 'Email',
      memberSince: 'Member Since',
      editProfile: 'Edit Profile',
      saveChanges: 'Save Changes',
      cancel: 'Cancel',
    };
    return translations[key] || key;
  },
}));

// Mock date-format utilities
vi.mock('@/lib/utils/date-format', () => ({
  formatDateLong: (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  },
}));

// Create mock store functions
const mockUpdateProfile = vi.fn();

// Define default profile
const defaultProfile: {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
} = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'John Doe',
  image: null,
  emailVerified: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
};

// Mutable store state for tests
let mockStoreState = {
  profile: defaultProfile as typeof defaultProfile | null,
  isLoadingProfile: false,
  updateProfile: mockUpdateProfile,
};

// Mock the user store
vi.mock('@/lib/stores/user-store', () => ({
  useUserStore: () => mockStoreState,
}));

describe('ProfileForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateProfile.mockResolvedValue(undefined);
    // Reset store state to default
    mockStoreState = {
      profile: { ...defaultProfile },
      isLoadingProfile: false,
      updateProfile: mockUpdateProfile,
    };
  });

  describe('display mode', () => {
    it('should render user profile information correctly', () => {
      render(<ProfileForm />);

      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('January 1, 2024')).toBeInTheDocument();
    });

    it('should display edit button in display mode', () => {
      render(<ProfileForm />);

      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
    });

    it('should render dash when name is null', () => {
      mockStoreState = {
        profile: {
          ...defaultProfile,
          name: null,
        },
        isLoadingProfile: false,
        updateProfile: mockUpdateProfile,
      };

      render(<ProfileForm />);

      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('should return null when profile is not available', () => {
      mockStoreState = {
        profile: null,
        isLoadingProfile: false,
        updateProfile: mockUpdateProfile,
      };

      const { container } = render(<ProfileForm />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('edit mode', () => {
    it('should enter edit mode when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<ProfileForm />);

      await user.click(screen.getByRole('button', { name: /edit profile/i }));

      // Input field should be visible
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      // Save and Cancel buttons should be visible
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should show input field with current name in edit mode', async () => {
      const user = userEvent.setup();
      render(<ProfileForm />);

      await user.click(screen.getByRole('button', { name: /edit profile/i }));

      const input = screen.getByDisplayValue('John Doe');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', 'Name');
    });
  });

  describe('save button validation', () => {
    it('should disable save button when name is empty', async () => {
      const user = userEvent.setup();
      render(<ProfileForm />);

      await user.click(screen.getByRole('button', { name: /edit profile/i }));

      const input = screen.getByDisplayValue('John Doe');
      await user.clear(input);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeDisabled();
    });

    it('should disable save button when name is unchanged', async () => {
      const user = userEvent.setup();
      render(<ProfileForm />);

      await user.click(screen.getByRole('button', { name: /edit profile/i }));

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeDisabled();
    });

    it('should enable save button when name is changed', async () => {
      const user = userEvent.setup();
      render(<ProfileForm />);

      await user.click(screen.getByRole('button', { name: /edit profile/i }));

      const input = screen.getByDisplayValue('John Doe');
      await user.clear(input);
      await user.type(input, 'Jane Doe');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('cancel behavior', () => {
    it('should restore original value and exit edit mode when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<ProfileForm />);

      // Enter edit mode
      await user.click(screen.getByRole('button', { name: /edit profile/i }));

      // Change the name
      const input = screen.getByDisplayValue('John Doe');
      await user.clear(input);
      await user.type(input, 'New Name');

      // Click cancel
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      // Should be back in display mode with original name
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('New Name')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
    });
  });
});
