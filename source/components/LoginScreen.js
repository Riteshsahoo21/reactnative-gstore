/* eslint-disable prettier/prettier */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
  DeviceEventEmitter,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AppHeader from '../widgets/AppHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE, HEADER_HEIGHT_THRESHOLD, getActiveApiBase, setActiveApiBase } from '../resources/data/Constants';
import tmh_styles from '../styles/tmh_styles';

// Graceful Google Sign-In import
let GoogleSignin = null;
let statusCodes = null;
try {
  const gSignin = require('@react-native-google-signin/google-signin');
  GoogleSignin = gSignin.GoogleSignin;
  statusCodes = gSignin.statusCodes;
} catch (e) {
  // Graceful fallback if native module not linked
}

const GOOGLE_WEB_CLIENT_ID = '153305069501-nrfrhnj4l2427g5dbnn1ubpajocf578a.apps.googleusercontent.com';

const LoginScreen = ({ navigation, route }) => {
  const { width, height } = Dimensions.get('window');
  const headerHeight = (HEADER_HEIGHT_THRESHOLD * height) / 100;

  // Active Auth Mode: 'otp' (Mobile OTP - Primary) or 'password' (Email + Password)
  const [authMode, setAuthMode] = useState('otp');

  // Mobile OTP State
  const [countryCode, setCountryCode] = useState('+27');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [devOtpHint, setDevOtpHint] = useState('');
  const [isAgeConfirmed, setIsAgeConfirmed] = useState(true);

  // Email + Password State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Loading States
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);

  // Setup Resend Countdown Timer
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Configure Google Sign-In if available
  useEffect(() => {
    if (GoogleSignin) {
      try {
        GoogleSignin.configure({
          webClientId: GOOGLE_WEB_CLIENT_ID,
          offlineAccess: false,
        });
      } catch (e) {
        console.log('GoogleSignin configure error:', e);
      }
    }
  }, []);

  // Multi-host candidate runner to support USB ADB reverse (localhost), emulator (10.0.2.2), and LAN
  const postAuthEndpoint = async (path, payload) => {
    const currentBase = getActiveApiBase();
    const candidates = [
      `${currentBase}${path}`,
      `${API_BASE}${path}`,
      `http://localhost:5000/api${path}`,
      `http://127.0.0.1:5000/api${path}`,
      `http://192.168.1.9:5000/api${path}`,
      `http://10.0.2.2:5000/api${path}`,
    ];
    const uniqueCandidates = [...new Set(candidates)];
    let lastError = null;

    for (const url of uniqueCandidates) {
      try {
        console.log('[postAuthEndpoint] Trying:', url);
        const res = await axios.post(url, payload, {
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          timeout: 10000,
          _skipRewrite: true,
        });
        if (res && res.data) {
          console.log('[postAuthEndpoint] Success from:', url);
          const matchedBase = url.replace(new RegExp(`${path}$`), '');
          if (matchedBase) {
            setActiveApiBase(matchedBase);
          }
          return res.data;
        }
      } catch (err) {
        console.log('[postAuthEndpoint] Error for', url, ':', err.message, err.code, err.response?.status, err.response?.data);
        lastError = err;
        if (err.response?.data?.message) {
          throw new Error(err.response.data.message);
        }
      }
    }
    throw new Error(lastError?.response?.data?.message || lastError?.message || 'Unable to connect to authentication server. Please check backend connection.');
  };

  // Persist session to AsyncStorage
  const handleAuthSuccess = async (data, welcomeMessage) => {
    try {
      if (data.token) {
        // Clear previous user-specific cached data to prevent cross-account contamination
        await AsyncStorage.multiRemove([
          'customerBankDetails',
          'userOrders',
          'userEmail',
          'userPhone',
        ]).catch(() => {});

        await AsyncStorage.setItem('userToken', data.token);
        const displayName = data.name || data.email?.split('@')[0] || data.phone || 'Valued Patron';
        await AsyncStorage.setItem('userName', displayName);
        if (data.email) {
          await AsyncStorage.setItem('userEmail', data.email);
        }
        if (data.phone || data.phoneNumber) {
          await AsyncStorage.setItem('userPhone', data.phone || data.phoneNumber);
        }
        await AsyncStorage.setItem(
          'userInfo',
          JSON.stringify({
            id: data._id,
            name: data.name,
            email: data.email,
            phone: data.phone || data.phoneNumber,
            role: data.role,
            referralCode: data.referralCode,
            ...data,
          })
        );
        await AsyncStorage.setItem('isAgeVerified', 'true');

        DeviceEventEmitter.emit('userLoggedIn', data);
        DeviceEventEmitter.emit('cartUpdated', 0);

        Alert.alert('Welcome to The Grand Store', welcomeMessage || `Signed in as ${displayName}`, [
          {
            text: 'Enter Vault',
            onPress: () => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.replace('Home');
              }
            },
          },
        ]);
      }
    } catch (e) {
      console.error('Failed to persist user session:', e);
    }
  };

  // 1. Mobile OTP: Send Verification Code
  const handleSendOtp = async () => {
    const rawNumber = phoneNumber.trim().replace(/[^\d]/g, '');
    if (!rawNumber || rawNumber.length < 8) {
      Alert.alert('Invalid Number', 'Please enter a valid South African mobile number (e.g. 82 123 4567).');
      return;
    }

    if (!isAgeConfirmed) {
      Alert.alert('Age Verification', 'You must be 18 years or older to access The Grand Store.');
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `${countryCode}${rawNumber.startsWith('0') ? rawNumber.slice(1) : rawNumber}`;
      const response = await postAuthEndpoint('/auth/send-otp', { phone: fullPhone });

      setIsOtpSent(true);
      setResendTimer(60);
      if (response.devOtp) {
        setDevOtpHint(response.devOtp);
      }
      Alert.alert('Code Dispatched', `A 6-digit verification code has been sent to ${fullPhone}.`);
    } catch (err) {
      Alert.alert('OTP Request Failed', err.message || 'Could not send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Mobile OTP: Verify & Sign In
  const handleVerifyOtp = async () => {
    const cleanOtp = otpCode.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      Alert.alert('Incomplete Code', 'Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const rawNumber = phoneNumber.trim().replace(/[^\d]/g, '');
      const fullPhone = `${countryCode}${rawNumber.startsWith('0') ? rawNumber.slice(1) : rawNumber}`;

      const data = await postAuthEndpoint('/auth/verify-otp', {
        phone: fullPhone,
        otp: cleanOtp,
      });

      await handleAuthSuccess(data, 'Your mobile account has been verified.');
    } catch (err) {
      Alert.alert('Verification Failed', err.message || 'The code entered is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Email & Password Sign In
  const handlePasswordLogin = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('Required Fields', 'Please enter your email address and account password.');
      return;
    }

    setLoading(true);
    try {
      const data = await postAuthEndpoint('/auth/login', {
        email: trimmedEmail,
        password: trimmedPassword,
      });

      await handleAuthSuccess(data, `Welcome back to The Grand Store.`);
    } catch (err) {
      Alert.alert('Sign In Failed', err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Google 1-Tap Sign-In
  const handleGoogleLogin = async () => {
    if (!GoogleSignin) {
      Alert.alert('Google Sign-In', 'Google Sign-In module is not configured for this device environment.');
      return;
    }

    setSocialLoading(true);
    try {
      console.log('[handleGoogleLogin] Step 1: Checking Play Services...');
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Clear any cached session so Google Play Services ALWAYS shows the account/mail selection sheet
      try {
        await GoogleSignin.signOut();
      } catch (signOutErr) {
        // Safe to ignore if no account was previously signed in
      }

      console.log('[handleGoogleLogin] Step 2: Calling GoogleSignin.signIn()...');
      const userInfo = await GoogleSignin.signIn();
      console.log('[handleGoogleLogin] Step 3: GoogleSignin.signIn() succeeded for:', userInfo?.user?.email);
      const idToken = userInfo?.idToken || (await GoogleSignin.getTokens())?.idToken;
      console.log('[handleGoogleLogin] Step 4: idToken received, length:', idToken ? idToken.length : 0);

      if (idToken) {
        console.log('[handleGoogleLogin] Step 5: Posting idToken to backend /auth/google...');
        const data = await postAuthEndpoint('/auth/google', { token: idToken });
        console.log('[handleGoogleLogin] Step 6: Backend auth success:', data?.email || data?.name);
        await handleAuthSuccess(data, `Signed in with Google as ${data.name || 'Patron'}.`);
      } else {
        throw new Error('No Google token received from Google Play Services.');
      }
    } catch (error) {
      console.log('Google Sign-In Error:', error, 'code:', error?.code, 'message:', error?.message);
      if (statusCodes && error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User voluntarily dismissed dialog
      } else if (statusCodes && error.code === statusCodes.IN_PROGRESS) {
        // Already processing
      } else {
        const isShaMismatch =
          String(error?.code) === '10' ||
          String(error?.message || '').includes('DEVELOPER_ERROR') ||
          String(error?.message || '').includes('10');

        if (isShaMismatch) {
          Alert.alert(
            'Google Sign-In: SHA-1 Registration Needed',
            'Google Play Services requires your device APK SHA-1 to be added in Firebase Console (grand-store-65d7c) -> Project Settings -> Your Android App:\n\nActive APK SHA-1:\n5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25\n\nPackage: com.grandstore.android\n\nYou can also sign in right now using Email & Password or Mobile OTP (+27).',
            [
              {
                text: 'Sign in with Email',
                onPress: () => setAuthMode('password'),
              },
              {
                text: 'Use Mobile OTP',
                onPress: () => setAuthMode('otp'),
              },
              { text: 'Dismiss', style: 'cancel' },
            ]
          );
        } else {
          const errorDetail = error?.message || (error?.code ? `Error code: ${error.code}` : JSON.stringify(error));
          Alert.alert(
            'Google Sign-In Notice',
            `Google authentication error: ${errorDetail}\n\nPlease use Mobile OTP (+27) or Email Sign-In.`,
            [
              {
                text: 'Use Email Sign-In',
                onPress: () => setAuthMode('password'),
              },
              { text: 'OK' },
            ]
          );
        }
      }
    } finally {
      setSocialLoading(false);
    }
  };

  // 5. Apple Sign-In
  const handleAppleLogin = () => {
    if (Platform.OS === 'ios') {
      Alert.alert('Apple Sign-In', 'Apple Authentication is active on iOS.');
    } else {
      Alert.alert('Apple Sign-In', 'Apple Sign-In is exclusively available on Apple iOS devices.');
    }
  };

  // Quick Demo Account Pre-fill
  const fillDemoCustomer = () => {
    setAuthMode('password');
    setEmail('customer@grandstore.com');
    setPassword('password123');
  };

  // Continue as Guest
  const handleGuestContinue = async () => {
    await AsyncStorage.setItem('isAgeVerified', 'true');
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('Home');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader
        title={'Sign In'}
        backgroundColor={'#c99742'}
        rightButtons={[]}
        height={headerHeight}
        titleStyle={tmh_styles.header_title_tmb}
        isShowShadow={false}
        navigation={navigation}
        isBack={true}
        backButtonStyle={{ width: 35, height: 25, alignItems: 'center' }}
        backIconColor={'black'}
        logoImage={null}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Luxury Brand Header */}
        <View style={styles.brandHeader}>
          <Text style={styles.brandCrest}>THE GRAND STORE</Text>
          <Text style={styles.brandSub}>FINE SPIRITS • PRIVATE CELLAR • RARE VAULT</Text>
          <Text style={styles.screenHeading}>Sign in or create your account</Text>
          <Text style={styles.screenSub}>Access South Africa’s finest reserve wines, rare whiskies & exclusive auctions.</Text>
        </View>

        {/* Dual Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, authMode === 'otp' && styles.tabBtnActive]}
            onPress={() => {
              setAuthMode('otp');
              setIsOtpSent(false);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, authMode === 'otp' && styles.tabTextActive]}>
              📱 Mobile OTP (Fast)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, authMode === 'password' && styles.tabBtnActive]}
            onPress={() => setAuthMode('password')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, authMode === 'password' && styles.tabTextActive]}>
              ✉️ Email & Password
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================= MODE 1: MOBILE NUMBER + OTP ================= */}
        {authMode === 'otp' && (
          <View style={styles.cardSection}>
            {!isOtpSent ? (
              <>
                <Text style={styles.fieldLabel}>MOBILE PHONE NUMBER</Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.countryBadge}>
                    <Text style={styles.countryFlag}>🇿🇦</Text>
                    <Text style={styles.countryCodeText}>{countryCode}</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="82 123 4567"
                    placeholderTextColor="#666"
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    maxLength={12}
                    autoFocus={false}
                  />
                </View>
                <Text style={styles.helperText}>
                  We'll send a 6-digit verification code. No password required.
                </Text>

                {/* 18+ Compliance Checkbox */}
                <TouchableOpacity
                  style={styles.ageCheckboxRow}
                  activeOpacity={0.7}
                  onPress={() => setIsAgeConfirmed(!isAgeConfirmed)}
                >
                  <View style={[styles.checkboxBox, isAgeConfirmed && styles.checkboxBoxChecked]}>
                    {isAgeConfirmed && <Text style={styles.checkboxCheck}>✓</Text>}
                  </View>
                  <Text style={styles.ageCheckboxLabel}>
                    I confirm I am <Text style={styles.boldText}>18 years or older</Text> as legally required by the SA Liquor Act.
                  </Text>
                </TouchableOpacity>

                {/* Send OTP Button */}
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleSendOtp}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#f5c242', '#c99742', '#a67c2e']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#111" />
                    ) : (
                      <Text style={styles.primaryBtnText}>SEND VERIFICATION CODE →</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Step 2: Enter 6-Digit OTP */}
                <View style={styles.otpSentBanner}>
                  <Text style={styles.otpSentTitle}>Verification Code Sent</Text>
                  <Text style={styles.otpSentSub}>
                    Dispatched to {countryCode} {phoneNumber}
                  </Text>
                  <TouchableOpacity onPress={() => setIsOtpSent(false)}>
                    <Text style={styles.changeNumberText}>Edit Phone Number</Text>
                  </TouchableOpacity>
                </View>

                {devOtpHint ? (
                  <View style={styles.devHintBox}>
                    <Text style={styles.devHintText}>💡 Dev Test Code: {devOtpHint} (or 123456)</Text>
                  </View>
                ) : null}

                <Text style={styles.fieldLabel}>ENTER 6-DIGIT CODE</Text>
                <TextInput
                  style={styles.otpInput}
                  placeholder="• • • • • •"
                  placeholderTextColor="#555"
                  keyboardType="number-pad"
                  value={otpCode}
                  onChangeText={setOtpCode}
                  maxLength={6}
                  autoFocus={true}
                />

                <View style={styles.resendRow}>
                  {resendTimer > 0 ? (
                    <Text style={styles.resendTimerText}>Resend code in {resendTimer}s</Text>
                  ) : (
                    <TouchableOpacity onPress={handleSendOtp} disabled={loading}>
                      <Text style={styles.resendActionText}>Resend Verification Code</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#f5c242', '#c99742', '#a67c2e']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#111" />
                    ) : (
                      <Text style={styles.primaryBtnText}>VERIFY & ENTER VAULT</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* ================= MODE 2: EMAIL & PASSWORD ================= */}
        {authMode === 'password' && (
          <View style={styles.cardSection}>
            {/* Quick Demo Customer Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={fillDemoCustomer}
              style={styles.demoCard}
            >
              <Text style={styles.demoBadge}>⚡ QUICK DEMO ACCOUNT</Text>
              <Text style={styles.demoTitle}>Tap to use Verified Patron Credentials</Text>
              <Text style={styles.demoDetails}>customer@grandstore.com • password123</Text>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
            <TextInput
              style={styles.standardInput}
              placeholder="e.g. patron@domain.co.za"
              placeholderTextColor="#666"
              onChangeText={setEmail}
              value={email}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <View style={styles.passwordLabelRow}>
              <Text style={styles.fieldLabel}>PASSWORD</Text>
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.showHideText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.standardInput}
              placeholder="Account password"
              placeholderTextColor="#666"
              onChangeText={setPassword}
              value={password}
              secureTextEntry={!showPassword}
            />

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handlePasswordLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#f5c242', '#c99742', '#a67c2e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#111" />
                ) : (
                  <Text style={styles.primaryBtnText}>SIGN IN TO ACCOUNT</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.registerRow}>
              <Text style={styles.registerPrompt}>New to The Grand Store? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLinkText}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ================= SOCIAL & QUICK ACCESS OPTIONS ================= */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google 1-Tap Sign In */}
        <TouchableOpacity
          style={styles.socialBtn}
          onPress={handleGoogleLogin}
          disabled={socialLoading}
          activeOpacity={0.8}
        >
          {socialLoading ? (
            <ActivityIndicator color="#111" size="small" />
          ) : (
            <>
              <Image
                source={require('../resources/assets/google.png')}
                style={styles.socialIcon}
                resizeMode="contain"
              />
              <Text style={styles.socialBtnText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Apple Sign-In */}
        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[styles.socialBtn, styles.appleBtn]}
            onPress={handleAppleLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.appleIcon}></Text>
            <Text style={styles.appleBtnText}>Continue with Apple</Text>
          </TouchableOpacity>
        )}

        {/* Continue as Guest Button */}
        <TouchableOpacity
          style={styles.guestBtn}
          onPress={handleGuestContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.guestBtnText}>⚡ Continue as Guest (Browse & Buy First)</Text>
        </TouchableOpacity>

        {/* South Africa Legal & Compliance Footer */}
        <View style={styles.footerLegal}>
          <Text style={styles.legalNotice}>
            The Grand Store strictly complies with the South African Liquor Act (Act 59 of 2003). 
            Alcohol sales are restricted to adults aged 18 and over. Valid identification may be 
            requested upon dispatch and courier delivery.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#080706',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  brandCrest: {
    fontSize: 16,
    fontWeight: '900',
    color: '#c99742',
    letterSpacing: 3,
    marginBottom: 4,
  },
  brandSub: {
    fontSize: 9,
    color: '#7a7267',
    letterSpacing: 1.2,
    marginBottom: 16,
    textAlign: 'center',
  },
  screenHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginBottom: 6,
  },
  screenSub: {
    fontSize: 12,
    color: '#9e968a',
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 10,
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(201, 151, 66, 0.2)',
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(201, 151, 66, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(201, 151, 66, 0.4)',
  },
  tabText: {
    color: '#777',
    fontSize: 12.5,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#f5c242',
    fontWeight: '800',
  },

  // Card
  cardSection: {
    backgroundColor: '#0f0d0b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 18,
    marginBottom: 20,
  },
  fieldLabel: {
    color: '#b0976d',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  // Phone input row
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  countryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1813',
    borderWidth: 1,
    borderColor: 'rgba(201, 151, 66, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
    marginRight: 10,
  },
  countryFlag: {
    fontSize: 16,
    marginRight: 6,
  },
  countryCodeText: {
    color: '#f5c242',
    fontSize: 14,
    fontWeight: '800',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#15120e',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  helperText: {
    color: '#7c766c',
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 14,
  },

  // Age Checkbox
  ageCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(201, 151, 66, 0.06)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(201, 151, 66, 0.15)',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 151, 66, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#111',
  },
  checkboxBoxChecked: {
    backgroundColor: '#c99742',
    borderColor: '#f5c242',
  },
  checkboxCheck: {
    color: '#111',
    fontSize: 12,
    fontWeight: '900',
  },
  ageCheckboxLabel: {
    flex: 1,
    color: '#ccc',
    fontSize: 11.5,
    lineHeight: 16,
  },
  boldText: {
    color: '#f5c242',
    fontWeight: '800',
  },

  // Primary Button
  primaryBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
  },
  primaryGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#0d0b08',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  // OTP Step 2
  otpSentBanner: {
    backgroundColor: 'rgba(201, 151, 66, 0.08)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(201, 151, 66, 0.2)',
  },
  otpSentTitle: {
    color: '#f5c242',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  otpSentSub: {
    color: '#a0988c',
    fontSize: 11.5,
    marginBottom: 6,
  },
  changeNumberText: {
    color: '#c99742',
    fontSize: 11,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  devHintBox: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  devHintText: {
    color: '#81c784',
    fontSize: 11,
    fontWeight: '700',
  },
  otpInput: {
    backgroundColor: '#15120e',
    borderWidth: 1.5,
    borderColor: '#c99742',
    borderRadius: 10,
    color: '#f5c242',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 8,
    textAlign: 'center',
    paddingVertical: 12,
    marginBottom: 10,
  },
  resendRow: {
    alignItems: 'center',
    marginVertical: 10,
  },
  resendTimerText: {
    color: '#777',
    fontSize: 11.5,
  },
  resendActionText: {
    color: '#f5c242',
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // Password Mode Inputs
  standardInput: {
    backgroundColor: '#15120e',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    color: '#ffffff',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 14,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  showHideText: {
    color: '#b0976d',
    fontSize: 11,
    fontWeight: '700',
  },
  demoCard: {
    backgroundColor: '#181410',
    borderWidth: 1,
    borderColor: 'rgba(201, 151, 66, 0.35)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  demoBadge: {
    color: '#f5c242',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 2,
  },
  demoTitle: {
    color: '#eee',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  demoDetails: {
    color: '#8e867b',
    fontSize: 10,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  registerPrompt: {
    color: '#888',
    fontSize: 12,
  },
  registerLinkText: {
    color: '#f5c242',
    fontSize: 12,
    fontWeight: '800',
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dividerText: {
    color: '#6c655a',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    paddingHorizontal: 12,
  },

  // Social Buttons
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    elevation: 2,
  },
  socialIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  socialBtnText: {
    color: '#1a1a1a',
    fontSize: 13.5,
    fontWeight: '700',
  },
  appleBtn: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  appleIcon: {
    color: '#fff',
    fontSize: 20,
    marginRight: 8,
    lineHeight: 22,
  },
  appleBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
  },

  // Guest Button
  guestBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  guestBtnText: {
    color: '#a0988c',
    fontSize: 12.5,
    fontWeight: '700',
  },

  // Legal
  footerLegal: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 16,
  },
  legalNotice: {
    color: '#555',
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
  },
});
