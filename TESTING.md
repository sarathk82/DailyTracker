# Testing & Quality Assurance

## Automated Testing

### Test Suite

The project uses Jest for automated testing with the following test types:
- Unit tests for utility functions
- Component tests for React components
- Integration tests for services

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests in CI mode (for automation)
npm run test:ci
```

### Test Coverage

Current test suite includes 93 tests covering:
- Text analysis and LLM classification
- Storage services  
- Encryption utilities
- UI components (JournalScreen, EditModal, MessageBubble, etc.)
- Authentication context

## Pre-Push Hook

### Description

An automated pre-push Git hook runs all tests before allowing code to be pushed to the remote repository. This ensures:
- No broken code reaches the repository
- All tests pass before deployment
- Code quality is maintained

### How It Works

1. When you run `git push`, the hook automatically triggers
2. Runs `npm run test:ci` to execute all tests
3. If any test fails, the push is aborted
4. If all tests pass, the push proceeds

### Bypassing the Hook  

In rare cases where you need to push without running tests (NOT recommended):

```bash
# Skip pre-push hook (use with caution!)
git push --no-verify
```

**⚠️ Warning:** Only bypass the hook if absolutely necessary (e.g., urgent hotfix). Always run tests manually afterward.

### Setup for New Contributors

The pre-push hook is located at `.git/hooks/pre-push`. If it's not executable:

```bash
chmod +x .git/hooks/pre-push
```

## Continuous Testing Strategy

### Before Committing
- Run relevant tests for changed code  
- Ensure no regressions

### Before Pushing
- All tests run automatically via pre-push hook
- Fix any failures before retrying push

### In CI/CD Pipeline
- GitHub Actions or other CI runs full test suite
- Deployment blocked if tests fail

## Test Writing Guidelines

### Naming Conventions
- Test files: `*.test.ts` or `*.test.tsx`
- Describe blocks: Use feature/component names
- It blocks: Use "should..." format

### Best Practices
- Keep tests focused and isolated
- Mock external dependencies
- Test edge cases and error conditions
- Aim for high coverage (>80%)

## Troubleshooting

### Tests Failing Locally
1. Ensure dependencies are installed: `npm install`
2. Clear Jest cache: `npx jest --clearCache`
3. Check for environment-specific issues

### Pre-Push Hook Not Running
1. Verify hook exists: `ls -la .git/hooks/pre-push`
2. Check permissions: `chmod +x .git/hooks/pre-push`
3. Ensure Git hooks are enabled

### Performance Issues
- Run specific test files: `npm test -- path/to/test.test.ts`
- Use watch mode for development: `npm run test:watch`

## Manual Testing Checklist

Beyond automated tests, perform manual testing for:

- [ ] UI/UX flows on multiple devices
- [ ] Network offline/online scenarios  
- [ ] Cross-browser compatibility (web)
- [ ] Performance under load
- [ ] Accessibility features

## Security Testing

See [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) for penetration testing and security scan results.
