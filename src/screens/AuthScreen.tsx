import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { validatePassword } from '../utils/encryption';

interface AuthScreenProps {
  onAuthSuccess?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const { theme } = useTheme();
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const dynamicStyles = getStyles(theme);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      onAuthSuccess?.();
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !displayName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      Alert.alert('Weak Password', passwordValidation.message);
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, displayName);
      onAuthSuccess?.();
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      Alert.alert(
        'Email Sent',
        'Password reset instructions have been sent to your email'
      );
      setIsForgotPassword(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      onAuthSuccess?.();
    } catch (error: any) {
      Alert.alert('Google Sign In Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (isForgotPassword) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={dynamicStyles.keyboardView}
        >
          <ScrollView contentContainerStyle={dynamicStyles.scrollContent}>
            <View style={dynamicStyles.content}>
              <Text style={dynamicStyles.title}>Reset Password</Text>
              <Text style={dynamicStyles.subtitle}>
                Enter your email to receive password reset instructions
              </Text>

              <TextInput
                style={dynamicStyles.input}
                placeholder="Email"
                placeholderTextColor={theme.placeholder}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />

              <TouchableOpacity
                style={[dynamicStyles.button, dynamicStyles.primaryButton]}
                onPress={handleForgotPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={theme.surface} />
                ) : (
                  <Text style={dynamicStyles.buttonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={dynamicStyles.linkButton}
                onPress={() => setIsForgotPassword(false)}
              >
                <Text style={dynamicStyles.linkText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={dynamicStyles.keyboardView}
      >
        <ScrollView contentContainerStyle={dynamicStyles.scrollContent}>
          <View style={dynamicStyles.content}>
            {/* Logo/Branding */}
            <View style={dynamicStyles.logoContainer}>
              <Image 
                source={require('../../assets/smpljournal.png')} 
                style={dynamicStyles.logoImage}
                resizeMode="contain"
              />
            </View>

            {isSignUp && (
              <Text style={dynamicStyles.welcomeText}>
                Join thousands of users and transform your daily journaling experience
              </Text>
            )}

            {isSignUp && (
              <TextInput
                style={dynamicStyles.input}
                placeholder="Display Name"
                placeholderTextColor={theme.placeholder}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            )}

            <TextInput
              style={dynamicStyles.input}
              placeholder="Email"
              placeholderTextColor={theme.placeholder}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />

            <TextInput
              style={dynamicStyles.input}
              placeholder="Password"
              placeholderTextColor={theme.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />

            {isSignUp && (
              <TextInput
                style={dynamicStyles.input}
                placeholder="Confirm Password"
                placeholderTextColor={theme.placeholder}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            )}

            <TouchableOpacity
              style={[dynamicStyles.button, dynamicStyles.primaryButton]}
              onPress={isSignUp ? handleSignUp : handleSignIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.surface} />
              ) : (
                <Text style={dynamicStyles.buttonText}>
                  {isSignUp ? 'Sign Up' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            {!isSignUp && (
              <TouchableOpacity
                style={dynamicStyles.linkButton}
                onPress={() => setIsForgotPassword(true)}
              >
                <Text style={dynamicStyles.linkText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            {Platform.OS === 'web' && (
              <>
                <View style={dynamicStyles.divider}>
                  <View style={dynamicStyles.dividerLine} />
                  <Text style={dynamicStyles.dividerText}>OR</Text>
                  <View style={dynamicStyles.dividerLine} />
                </View>

                {/* Google Sign In Button - Web Only */}
                <TouchableOpacity
                  style={[dynamicStyles.button, dynamicStyles.googleButton]}
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                >
                  <View style={dynamicStyles.googleButtonContent}>
                    <Text style={dynamicStyles.googleIcon}>G</Text>
                    <Text style={dynamicStyles.googleButtonText}>
                      Continue with Google
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            )}

            {Platform.OS !== 'web' && (
              <Text style={dynamicStyles.mobileNote}>
                💡 Google Sign-In works on web version: smpl-journal.web.app{'\n'}
                Use email/password on mobile for now
              </Text>
            )}

            <TouchableOpacity
              style={dynamicStyles.linkButton}
              onPress={() => setIsSignUp(!isSignUp)}
            >
              <Text style={dynamicStyles.linkText}>
                {isSignUp
                  ? 'Already have an account? Sign In'
                  : "Don't have an account? Sign Up"}
              </Text>
            </TouchableOpacity>

            {isSignUp && (
              <Text style={dynamicStyles.disclaimer}>
                Your data is end-to-end encrypted. We cannot recover your password
                if you forget it.
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#ffffff', // White background
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    content: {
      padding: 24,
      maxWidth: 400,
      width: '100%',
      alignSelf: 'center',
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 48,
    },
    logoImage: {
      width: 180,
      height: 180,
      marginBottom: 0,
    },
    appName: {
      fontSize: 36,
      fontWeight: 'bold',
      color: '#7c4dff', // Purple accent
      letterSpacing: 1.5,
      marginBottom: 4,
    },
    tagline: {
      fontSize: 16,
      color: '#3498db', // Blue
      fontStyle: 'italic',
      marginTop: 8,
      letterSpacing: 0.5,
    },
    welcomeText: {
      fontSize: 18,
      color: '#555', // Dark grey
      marginBottom: 32,
      textAlign: 'center',
      lineHeight: 26,
      paddingHorizontal: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#333',
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: '#666',
      marginBottom: 32,
      textAlign: 'center',
    },
    input: {
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: '#333',
      backgroundColor: '#f8f9fa',
      marginBottom: 16,
    },
    button: {
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    primaryButton: {
      backgroundColor: '#5b7fb8', // Blue button matching logo
      shadowColor: '#5b7fb8',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    googleButton: {
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#ddd',
    },
    googleButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    googleIcon: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#4285F4',
      marginRight: 12,
    },
    googleButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#333',
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#ffffff',
    },
    linkButton: {
      padding: 12,
      alignItems: 'center',
    },
    linkText: {
      fontSize: 14,
      color: '#3498db', // Blue for links
      fontWeight: '500',
    },
    mobileNote: {
      fontSize: 12,
      color: '#666',
      textAlign: 'center',
      marginVertical: 20,
      paddingHorizontal: 20,
      lineHeight: 18,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 24,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: '#ddd',
    },
    dividerText: {
      marginHorizontal: 16,
      fontSize: 14,
      color: '#999',
    },
    disclaimer: {
      fontSize: 12,
      color: '#999',
      textAlign: 'center',
      marginTop: 16,
      fontStyle: 'italic',
    },
  });
