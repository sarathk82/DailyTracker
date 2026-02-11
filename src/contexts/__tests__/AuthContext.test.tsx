import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock Firebase auth
jest.mock('../../config/firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: jest.fn((callback) => {
      callback(null);
      return jest.fn(); // unsubscribe function
    }),
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    sendPasswordResetEmail: jest.fn()
  }
}));

const TestComponent = () => {
  const { user, loading } = useAuth();
  
  return (
    <>
      <Text testID="user-status">{user ? 'logged-in' : 'logged-out'}</Text>
      <Text testID="loading-status">{loading ? 'loading' : 'ready'}</Text>
    </>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide initial null user state', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('user-status').props.children).toBe('logged-out');
    });
  });

  it('should set loading to false after initialization', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('loading-status').props.children).toBe('ready');
    });
  });

  it('should render children correctly', () => {
    const { getByText } = render(
      <AuthProvider>
        <Text>Auth Child</Text>
      </AuthProvider>
    );

    expect(getByText('Auth Child')).toBeTruthy();
  });

  it('should provide auth context functions', () => {
    const FunctionChecker = () => {
      const context = useAuth();
      
      return (
        <>
          <Text testID="has-login">{typeof context?.login === 'function' ? 'yes' : 'no'}</Text>
          <Text testID="has-signup">{typeof context?.signup === 'function' ? 'yes' : 'no'}</Text>
          <Text testID="has-logout">{typeof context?.logout === 'function' ? 'yes' : 'no'}</Text>
          <Text testID="has-reset">{typeof context?.resetPassword === 'function' ? 'yes' : 'no'}</Text>
        </>
      );
    };

    const { getByTestId } = render(
      <AuthProvider>
        <FunctionChecker />
      </AuthProvider>
    );

    expect(getByTestId('has-login').props.children).toBe('yes');
    expect(getByTestId('has-signup').props.children).toBe('yes');
    expect(getByTestId('has-logout').props.children).toBe('yes');
    expect(getByTestId('has-reset').props.children).toBe('yes');
  });

  it('should allow using auth outside of provider (returns null)', () => {
    const ComponentOutsideProvider = () => {
      const context = useAuth();
      return <Text testID="context">{context === null ? 'null' : 'not-null'}</Text>;
    };

    const { getByTestId } = render(<ComponentOutsideProvider />);
    expect(getByTestId('context').props.children).toBe('null');
  });
});
