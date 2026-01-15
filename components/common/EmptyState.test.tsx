import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/common/EmptyState';
import { FileText } from 'lucide-react';

// Note: ResizeObserver and matchMedia polyfills are in tests/setup.ts

describe('EmptyState', () => {
  describe('basic rendering', () => {
    it('should render title correctly', () => {
      render(<EmptyState title="No items found" />);

      expect(screen.getByText('No items found')).toBeInTheDocument();
    });

    it('should apply default className to container', () => {
      const { container } = render(<EmptyState title="Test" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
    });

    it('should apply custom className when provided', () => {
      const { container } = render(<EmptyState title="Test" className="custom-class" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-class');
    });
  });

  describe('icon rendering', () => {
    it('should render icon when provided', () => {
      render(<EmptyState title="Test" icon={FileText} />);

      // The icon should be rendered within the icon container
      const iconElement = document.querySelector('svg');
      expect(iconElement).toBeInTheDocument();
    });

    it('should not render icon container when icon is not provided', () => {
      const { container } = render(<EmptyState title="Test" />);

      // Check that the icon container (with specific bg class) doesn't exist
      const iconContainer = container.querySelector('.mb-4.flex.h-16.w-16');
      expect(iconContainer).not.toBeInTheDocument();
    });

    it('should render icon inside a styled container', () => {
      const { container } = render(<EmptyState title="Test" icon={FileText} />);

      // The icon container should have the circular styling
      const iconContainer = container.querySelector('[class*="rounded-full"]');
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe('description rendering', () => {
    it('should render description when provided', () => {
      render(<EmptyState title="Test" description="This is a helpful description" />);

      expect(screen.getByText('This is a helpful description')).toBeInTheDocument();
    });

    it('should not render description element when not provided', () => {
      render(<EmptyState title="Test" />);

      // Check that description text doesn't exist
      expect(screen.queryByText('This is a helpful description')).not.toBeInTheDocument();
    });

    it('should render description with correct styling', () => {
      render(<EmptyState title="Test" description="Description text" />);

      const description = screen.getByText('Description text');
      expect(description).toHaveClass('text-sm');
    });
  });

  describe('action button rendering', () => {
    it('should render action button when both actionLabel and actionHref are provided', () => {
      render(<EmptyState title="Test" actionLabel="Get Started" actionHref="/getting-started" />);

      // HeroUI Button with as={Link} renders as an anchor element
      const button = screen.getByText('Get Started');
      expect(button).toBeInTheDocument();

      // The anchor should have the href
      const link = button.closest('a');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/getting-started');
    });

    it('should not render action button when only actionLabel is provided', () => {
      render(<EmptyState title="Test" actionLabel="Get Started" />);

      expect(screen.queryByText('Get Started')).not.toBeInTheDocument();
    });

    it('should not render action button when only actionHref is provided', () => {
      const { container } = render(<EmptyState title="Test" actionHref="/getting-started" />);

      // No button with actionLabel should be rendered
      const buttons = container.querySelectorAll('a[href]');
      expect(buttons.length).toBe(0);
    });

    it('should not render action button when neither actionLabel nor actionHref is provided', () => {
      const { container } = render(<EmptyState title="Test" />);

      const buttons = container.querySelectorAll('a[href]');
      expect(buttons.length).toBe(0);
    });

    it('should render action button with arrow icon', () => {
      render(<EmptyState title="Test" actionLabel="Get Started" actionHref="/getting-started" />);

      // Should have an arrow icon (SVG) inside the button
      const button = screen.getByText('Get Started');
      const link = button.closest('a');
      const svg = link?.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('full props rendering', () => {
    it('should render all props together correctly', () => {
      render(
        <EmptyState
          icon={FileText}
          title="No interviews yet"
          description="Start your first mock interview to see your history here"
          actionLabel="Start Interview"
          actionHref="/interview/setup"
          className="my-custom-class"
        />
      );

      // Check icon exists
      const iconElement = document.querySelector('svg');
      expect(iconElement).toBeInTheDocument();

      // Check title
      expect(screen.getByText('No interviews yet')).toBeInTheDocument();

      // Check description
      expect(
        screen.getByText('Start your first mock interview to see your history here')
      ).toBeInTheDocument();

      // Check action button
      const button = screen.getByText('Start Interview');
      expect(button).toBeInTheDocument();
      const link = button.closest('a');
      expect(link).toHaveAttribute('href', '/interview/setup');
    });
  });

  describe('conditional rendering logic', () => {
    it('should render only title when no optional props are provided', () => {
      const { container } = render(<EmptyState title="Just a title" />);

      // Title should exist
      expect(screen.getByText('Just a title')).toBeInTheDocument();

      // No icon container
      const iconContainer = container.querySelector('.mb-4.flex.h-16.w-16');
      expect(iconContainer).not.toBeInTheDocument();

      // No description (check by class pattern)
      const descriptions = container.querySelectorAll('.text-sm');
      expect(descriptions.length).toBe(0);

      // No button
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('should handle empty string className gracefully', () => {
      const { container } = render(<EmptyState title="Test" className="" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toBeInTheDocument();
    });
  });
});
