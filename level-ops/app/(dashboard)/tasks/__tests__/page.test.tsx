import { render, screen } from '@testing-library/react';
import TasksPage from '../page';

// Mock CopilotKit components
jest.mock('@copilotkit/react-core', () => ({
  useCopilotAction: jest.fn(),
  useCopilotReadable: jest.fn(),
}));

jest.mock('@copilotkit/react-ui', () => ({
  CopilotSidebar: ({ children }: { children: React.ReactNode }) => <div data-testid="copilot-sidebar">{children}</div>,
}));

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  }),
}));

describe('TasksPage', () => {
  it('renders page header with title and description', () => {
    render(<TasksPage />);

    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Manage your project tasks')).toBeInTheDocument();
  });

  it('renders add task button with correct aria-label', () => {
    render(<TasksPage />);

    const addButton = screen.getByTestId('add-task-button');
    expect(addButton).toBeInTheDocument();
    expect(addButton).toHaveAttribute('aria-label', 'Add new task');
  });

  it('renders empty state when no tasks exist', () => {
    render(<TasksPage />);

    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    expect(screen.getByText(/Create a task using the button above/)).toBeInTheDocument();
  });

  it('renders task list container', () => {
    render(<TasksPage />);

    expect(screen.getByTestId('task-list')).toBeInTheDocument();
  });

  it('renders CopilotSidebar', () => {
    render(<TasksPage />);

    expect(screen.getByTestId('copilot-sidebar')).toBeInTheDocument();
  });
});
