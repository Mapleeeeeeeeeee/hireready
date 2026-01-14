import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsCard } from '@/components/user/StatsCard';

// Note: ResizeObserver and matchMedia polyfills are in tests/setup.ts

describe('StatsCard', () => {
  describe('basic rendering', () => {
    it('should render title and value correctly', () => {
      render(<StatsCard title="Total Interviews" value={42} />);

      expect(screen.getByText('Total Interviews')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should render string value correctly', () => {
      render(<StatsCard title="Average Score" value="85%" />);

      expect(screen.getByText('Average Score')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });
  });

  describe('icon rendering', () => {
    it('should render icon when provided', () => {
      const TestIcon = () => <span data-testid="test-icon">Icon</span>;

      render(<StatsCard title="Test" value={10} icon={<TestIcon />} />);

      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    it('should not render icon container when icon is not provided', () => {
      const { container } = render(<StatsCard title="Test" value={10} />);

      // Check that the icon container (with bg-terracotta/10) doesn't exist
      const iconContainer = container.querySelector('.bg-terracotta\\/10');
      expect(iconContainer).not.toBeInTheDocument();
    });
  });

  describe('subtitle rendering', () => {
    it('should render subtitle when provided', () => {
      render(<StatsCard title="Test" value={10} subtitle="Last 30 days" />);

      expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    });

    it('should not render subtitle when not provided', () => {
      render(<StatsCard title="Test" value={10} />);

      // The subtitle text-xs element should not exist
      expect(screen.queryByText('Last 30 days')).not.toBeInTheDocument();
    });
  });

  describe('full props rendering', () => {
    it('should render all props together correctly', () => {
      const TestIcon = () => <span data-testid="test-icon">Icon</span>;

      render(
        <StatsCard
          title="Completed Interviews"
          value={15}
          subtitle="This month"
          icon={<TestIcon />}
        />
      );

      expect(screen.getByText('Completed Interviews')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('This month')).toBeInTheDocument();
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });
  });
});
