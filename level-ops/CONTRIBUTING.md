# CONTRIBUTING.md

## Development Workflow

### Getting Started
1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Copy environment: `cp .env.example .env.local`
4. Run dev server: `npm run dev`

### Before You Commit
```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Tests
npm run test

# Build
npm run build
```

All checks must pass. Pre-commit hooks enforce this.

## Code Standards

### TypeScript
- Strict mode enabled
- Explicit return types for functions
- No `any` types without justification
- Interfaces over type aliases for objects

### React Components
```typescript
// Good
interface ButtonProps {
  variant: 'primary' | 'secondary';
  onClick: () => void;
  children: React.ReactNode;
}

export function Button({ variant, onClick, children }: ButtonProps) {
  return (
    <button
      className={cn('...', variant === 'primary' && '...')}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

### File Organization
```
components/
  Button/
    Button.tsx        # Component
    Button.test.tsx   # Tests
    index.ts          # Export
```

## Git Conventions

### Branch Names
- `feat/description` — New features
- `fix/description` — Bug fixes
- `docs/description` — Documentation
- `refactor/description` — Code improvements
- `test/description` — Test additions
- `chore/description` — Maintenance

### Commit Messages
```
type(scope): description

Longer explanation if needed.

Closes #123
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Pull Requests
1. Update from main branch
2. Ensure all checks pass
3. Add tests for new features
4. Update documentation
5. PR descriptions should reflect premium positioning (exec-level features, not generic task management)
6. Request review from maintainer

## Testing

### Unit Tests
```typescript
describe('Button', () => {
  it('renders children', () => {
    render(<Button variant="primary" onClick={jest.fn()}>
      Click me
    </Button>);
    
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

### Integration Tests
- Test user flows end-to-end
- Mock external services
- Cover happy and error paths

### E2E Tests (when applicable)
- Critical user journeys only
- Run against test tenant
- Screenshot on failure

## Accessibility

### Requirements
- WCAG 2.2 AA compliance
- Keyboard navigation for all interactive elements
- Proper ARIA labels and roles
- Color contrast ratios (4.5:1 minimum)

### Testing
```bash
# Run accessibility audit
npm run test:a11y

# Manual testing with screen reader
# Test with keyboard only navigation
```

## Security

### Code Review Checklist
- [ ] No hardcoded secrets
- [ ] Input validation on all forms
- [ ] SQL injection prevention (use parameterized queries)
- [ ] XSS prevention (sanitize user content)
- [ ] CSRF tokens on state-changing operations
- [ ] Proper error handling (no stack traces to users)

### Dependency Updates
- Check for vulnerabilities: `npm audit`
- Update carefully, test thoroughly
- Document breaking changes

## Documentation

### Code Comments
- Explain **why**, not what
- Document complex algorithms
- Add JSDoc for public APIs

### README Updates
- Keep installation steps current
- Update environment variables
- Document new features

### API Documentation
- OpenAPI/Swagger for REST APIs
- GraphQL schema descriptions
- Example requests/responses

## Performance

### Guidelines
- Lazy load routes and heavy components
- Optimize images (WebP, proper sizing)
- Minimize bundle size
- Use React.memo() judiciously
- Profile before optimizing

### Monitoring
- Lighthouse CI in pull requests
- Bundle size tracking
- Core Web Vitals monitoring

## Questions?

- Technical: Create a GitHub issue
- Security: security@levelops.com
- General: Open a discussion