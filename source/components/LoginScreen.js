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
  Linking,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import CountryCodePickerModal, { CountryFlagImage } from './CountryCodePickerModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE, getActiveApiBase, setActiveApiBase } from '../resources/data/Constants';

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

// Graceful Firebase Phone Auth import for Real Cellular SMS
let rnFirebaseAuth = null;
try {
  rnFirebaseAuth = require('@react-native-firebase/auth').default;
} catch (e) {
  // Graceful fallback if native module not linked
}

const GOOGLE_WEB_CLIENT_ID = '153305069501-nrfrhnj4l2427g5dbnn1ubpajocf578a.apps.googleusercontent.com';

const LoginScreen = ({ navigation, route }) => {
  const { width, height } = Dimensions.get('window');

  // Primary Screen State:
  // 'menu'  -> Luxury Black & Gold Choice Screen matching user mockup
  // 'otp'   -> Mobile Phone Number + SMS OTP Flow
  // 'email' -> Email Magic Link (Gmail) + Password Flow
  const [authView, setAuthView] = useState('menu');

  // Email Sub-Mode: 'otp' (Email One-Time Code - default) or 'password' (Email + Password)
  const [emailTab, setEmailTab] = useState('otp');

  // Mobile OTP State
  const [countryCode, setCountryCode] = useState('+27');
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [selectedCountryObj, setSelectedCountryObj] = useState({
    country: 'ZA',
    name: 'South Africa',
    dialCode: '+27',
    flag: '🇿🇦',
  });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [devOtpHint, setDevOtpHint] = useState('');

  // Email One-Time Code (OTP) State
  const [email, setEmail] = useState('');
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [isEmailOtpSent, setIsEmailOtpSent] = useState(false);
  const [emailResendTimer, setEmailResendTimer] = useState(0);
  const [devEmailOtpHint, setDevEmailOtpHint] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Legal / Age Compliance Checkbox (checked by default)
  const [isAgeConfirmed, setIsAgeConfirmed] = useState(true);

  // Loading States
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);

  // Setup SMS OTP Resend Countdown Timer
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Setup Email OTP Resend Countdown Timer
  useEffect(() => {
    let interval = null;
    if (emailResendTimer > 0) {
      interval = setInterval(() => {
        setEmailResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [emailResendTimer]);

  // Listen for incoming Magic Link deep links (e.g. grandstore://login?magicToken=...&email=...)
  useEffect(() => {
    const handleIncomingUrl = (url) => {
      if (!url) return;
      try {
        console.log('[DeepLink] Processing incoming URL:', url);
        const queryIndex = url.indexOf('?');
        if (queryIndex !== -1) {
          const queryString = url.slice(queryIndex + 1);
          const params = {};
          queryString.split('&').forEach((part) => {
            const [k, v] = part.split('=');
            if (k && v) params[k] = decodeURIComponent(v);
          });
          if (params.magicToken) {
            console.log('[DeepLink] Magic token discovered:', params.magicToken);
            handleVerifyMagicLink(params.magicToken, params.email);
          }
        }
      } catch (e) {
        console.log('[DeepLink] Parse error:', e);
      }
    };

    if (route.params?.magicToken) {
      handleVerifyMagicLink(route.params.magicToken, route.params.email);
    }

    const linkingSub = Linking.addEventListener('url', ({ url }) => handleIncomingUrl(url));
    Linking.getInitialURL().then((url) => {
      if (url) handleIncomingUrl(url);
    });

    return () => {
      linkingSub?.remove();
    };
  }, [route.params]);

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

  // Multi-host candidate runner to support USB ADB reverse, emulator (10.0.2.2), and LAN
  const postAuthEndpoint = async (path, payload) => {
    const currentBase = getActiveApiBase();
    const candidates = [
      `${API_BASE}${path}`,
      ...(currentBase ? [`${currentBase}${path}`] : []),
      ...(__DEV__ ? [
        `http://localhost:5000/api${path}`,
        `http://127.0.0.1:5000/api${path}`,
        `http://192.168.1.9:5000/api${path}`,
        `http://10.0.2.2:5000/api${path}`,
      ] : []),
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
        console.log('[postAuthEndpoint] Error for', url, ':', err.message, err.code, err.response?.status);
        lastError = err;
        if (err.response?.data?.message) {
          throw new Error(err.response.data.message);
        }
      }
    }
    throw new Error(
      lastError?.response?.data?.message ||
        lastError?.message ||
        'Unable to connect to authentication server. Please check backend connection.'
    );
  };

  // Persist session to AsyncStorage
  const handleAuthSuccess = async (data, welcomeMessage) => {
    try {
      if (data.token) {
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
        const isActualVerified = Boolean(
          data.isAgeVerified === true ||
            data.bidderApprovalStatus === 'approved' ||
            (data.bidderLevel && ['level_2_verified', 'level_3_enhanced', 'level_4_vip'].includes(data.bidderLevel))
        );
        if (isActualVerified) {
          await AsyncStorage.setItem('isAgeVerified', 'true');
          await AsyncStorage.setItem('grand-store-age-verified', 'true');
        } else {
          await AsyncStorage.removeItem('isAgeVerified').catch(() => {});
          await AsyncStorage.removeItem('grand-store-age-verified').catch(() => {});
        }

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
    if (!rawNumber || rawNumber.length < 6) {
      Alert.alert('Invalid Number', 'Please enter a valid mobile number for SMS verification.');
      return;
    }

    if (!isAgeConfirmed) {
      Alert.alert('Age Verification', 'You must confirm you are 18 years or older to proceed.');
      return;
    }

    setLoading(true);
    try {
      const cleanNum = rawNumber.startsWith('0') ? rawNumber.slice(1) : rawNumber;
      const fullPhone = `${countryCode}${cleanNum}`;

      // 1. Attempt Native Firebase Phone SMS delivery
      let fbConfirmation = null;
      if (rnFirebaseAuth) {
        try {
          fbConfirmation = await rnFirebaseAuth().signInWithPhoneNumber(fullPhone);
          setConfirmationResult(fbConfirmation);
          console.log('[Firebase Mobile SMS] Dispatched code to:', fullPhone);
        } catch (fbErr) {
          console.warn('[Firebase Mobile SMS] Client warning:', fbErr.message);
        }
      }

      // 2. Dispatch via backend OTP / SMS Service
      const response = await postAuthEndpoint('/auth/send-otp', { phone: fullPhone });

      setIsOtpSent(true);
      setResendTimer(60);
      if (response.devOtp) {
        setDevOtpHint(response.devOtp);
      }
      Alert.alert('Code Dispatched', `A 6-digit verification code has been dispatched to ${fullPhone}.`);
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
      const cleanNum = rawNumber.startsWith('0') ? rawNumber.slice(1) : rawNumber;
      const fullPhone = `${countryCode}${cleanNum}`;

      let fbIdToken = null;
      if (confirmationResult) {
        try {
          const userCredential = await confirmationResult.confirm(cleanOtp);
          fbIdToken = await userCredential.user.getIdToken();
        } catch (confErr) {
          console.warn('[Firebase Mobile Confirm] Verification note:', confErr.message);
        }
      }

      const data = await postAuthEndpoint('/auth/verify-otp', {
        phone: fullPhone,
        otp: cleanOtp,
        firebaseIdToken: fbIdToken,
      });

      await handleAuthSuccess(data, 'Your mobile account has been verified.');
    } catch (err) {
      Alert.alert('Verification Failed', err.message || 'The code entered is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Email One-Time Code: Send 6-Digit Verification Code to Email
  const handleSendEmailOtp = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address to receive your verification code.');
      return;
    }

    if (!isAgeConfirmed) {
      Alert.alert('Age Verification', 'You must confirm you are 18 years or older to proceed.');
      return;
    }

    setLoading(true);
    try {
      const response = await postAuthEndpoint('/auth/send-email-otp', {
        email: trimmedEmail,
      });

      setIsEmailOtpSent(true);
      setEmailResendTimer(60);
      if (response.devOtp) {
        setDevEmailOtpHint(response.devOtp);
      }

      Alert.alert(
        'Code Dispatched ✉️',
        `A 6-digit one-time verification code has been dispatched to ${trimmedEmail}.\n\nEnter the code below to sign in.`
      );
    } catch (err) {
      Alert.alert('Code Request Failed', err.message || 'Could not send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Email One-Time Code: Verify 6-Digit OTP & Sign In
  const handleVerifyEmailOtp = async () => {
    const cleanOtp = emailOtpCode.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      Alert.alert('Incomplete Code', 'Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const data = await postAuthEndpoint('/auth/verify-email-otp', {
        email: trimmedEmail,
        otp: cleanOtp,
      });

      await handleAuthSuccess(data, 'Your email has been verified.');
    } catch (err) {
      Alert.alert('Verification Failed', err.message || 'The code entered is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  // 6. Email & Password Sign In
  const handlePasswordLogin = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('Required Fields', 'Please enter your email address and account password.');
      return;
    }

    if (!isAgeConfirmed) {
      Alert.alert('Age Verification', 'You must confirm you are 18 years or older to proceed.');
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

  // 7. Google 1-Tap Sign-In
  const handleGoogleLogin = async () => {
    if (!isAgeConfirmed) {
      Alert.alert('Age Verification', 'You must confirm you are 18 years or older to proceed.');
      return;
    }

    if (!GoogleSignin) {
      Alert.alert('Google Sign-In', 'Google Sign-In module is not configured for this device environment.');
      return;
    }

    setSocialLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      try {
        await GoogleSignin.signOut();
      } catch (signOutErr) {
        // Safe to ignore
      }

      const userInfo = await GoogleSignin.signIn();
      if (userInfo && userInfo.type === 'cancelled') {
        return;
      }
      let idToken = userInfo?.data?.idToken || userInfo?.idToken;
      if (!idToken) {
        try {
          const tokens = await GoogleSignin.getTokens();
          idToken = tokens?.idToken;
        } catch (tErr) {
          console.log('[GoogleSignin] getTokens note:', tErr?.message);
        }
      }

      if (idToken) {
        const payload = {
          token: idToken,
          email: userInfo?.data?.user?.email || userInfo?.user?.email,
          name: userInfo?.data?.user?.name || userInfo?.user?.name,
        };
        const data = await postAuthEndpoint('/auth/google', payload);
        await handleAuthSuccess(data, `Signed in with Google as ${data.name || 'Patron'}.`);
      } else {
        throw new Error('No Google token received from Google Play Services.');
      }
    } catch (error) {
      console.log('Google Sign-In Error:', error);
      if (statusCodes && error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled
      } else if (statusCodes && error.code === statusCodes.IN_PROGRESS) {
        // Processing
      } else {
        Alert.alert(
          'Google Sign-In Notice',
          'Could not complete Google Sign-In on this device. You can sign in using Mobile OTP or Sign-in Link.',
          [
            { text: 'Use Mobile OTP', onPress: () => setAuthView('otp') },
            { text: 'Use Sign-in Link', onPress: () => setAuthView('email') },
            { text: 'Dismiss', style: 'cancel' },
          ]
        );
      }
    } finally {
      setSocialLoading(false);
    }
  };

  // 8. Continue as Guest
  const handleGuestContinue = async () => {
    if (!isAgeConfirmed) {
      Alert.alert('Age Verification', 'You must confirm you are 18 years or older to proceed.');
      return;
    }
    await AsyncStorage.setItem('grand-store-age-gate-passed', 'true').catch(() => {});
    await AsyncStorage.removeItem('isAgeVerified').catch(() => {});
    await AsyncStorage.removeItem('grand-store-age-verified').catch(() => {});
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('Home');
    }
  };

  // Quick Demo Account Pre-fill
  const fillDemoCustomer = () => {
    setEmail('customer@grandstore.com');
    setPassword('password123');
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#070605" />

      {/* Subtle Luxury Watermark in Background */}
      <Image
        source={require('../resources/assets/auth_watermark.png')}
        style={styles.bgWatermark}
        resizeMode="contain"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ================= VIEW 1: MAIN LUXURY SCREEN (Matches Mockup) ================= */}
        {authView === 'menu' && (
          <View style={styles.menuContainer}>
            {/* Top Navigation Bar: Gold Back Arrow */}
            <View style={styles.topNavRow}>
              <TouchableOpacity
                style={styles.backArrowBtn}
                onPress={() => {
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    navigation.replace('Home');
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.backArrowSymbol}>←</Text>
              </TouchableOpacity>
            </View>

            {/* Brand Emblem & Logo Lockup */}
            <View style={styles.brandLockupContainer}>
              <Image
                source={require('../resources/assets/auth_brand_lockup.png')}
                style={styles.brandLockupImage}
                resizeMode="contain"
              />
            </View>

            {/* Typography Hero Section */}
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeLight}>Welcome to</Text>
              <Text style={styles.welcomeBold}>The Grand Store</Text>
              <Text style={styles.subTagline}>FINE SPIRITS · PRIVATE CELLAR · RARE VAULT</Text>
              <View style={styles.goldAccentLine} />
              <Text style={styles.welcomeDesc}>
                Discover exceptional spirits, rare whiskies and exclusive auctions from South Africa and beyond.
              </Text>
            </View>

            {/* 1. BUTTON: Continue with Mobile OTP (Primary Gold Gradient) */}
            <TouchableOpacity
              style={styles.goldPillBtn}
              onPress={() => setAuthView('otp')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#f5c242', '#e5a93b', '#c99742']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.goldPillGradient}
              >
                <View style={styles.pillPhoneIconContainer}>
                  <Text style={styles.pillPhoneIcon}>📱</Text>
                </View>
                <Text style={styles.goldPillText}>Continue with Mobile OTP</Text>
                <Text style={styles.goldPillChevron}>›</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* 2. BUTTON: Continue with Google (Dark Obsidian Card) */}
            <TouchableOpacity
              style={styles.darkCardBtn}
              onPress={handleGoogleLogin}
              disabled={socialLoading}
              activeOpacity={0.8}
            >
              <View style={styles.cardBtnContent}>
                {socialLoading ? (
                  <ActivityIndicator color="#e5a93b" size="small" />
                ) : (
                  <>
                    <Image
                      source={require('../resources/assets/google.png')}
                      style={styles.googleIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.darkCardText}>Continue with Google</Text>
                    <Text style={styles.cardChevron}>›</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>

            {/* 3. BUTTON: Sign in with Email (Dark Obsidian Card) */}
            <TouchableOpacity
              style={styles.darkCardBtn}
              onPress={() => setAuthView('email')}
              activeOpacity={0.8}
            >
              <View style={styles.cardBtnContent}>
                <Text style={styles.mailIconEmoji}>✉️</Text>
                <Text style={styles.darkCardText}>Sign in with Email</Text>
                <Text style={styles.cardChevron}>›</Text>
              </View>
            </TouchableOpacity>

            {/* Gold "OR" Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* 4. BUTTON: Continue as Guest (Gold Border Card) */}
            <TouchableOpacity
              style={styles.guestCardBtn}
              onPress={handleGuestContinue}
              activeOpacity={0.8}
            >
              <View style={styles.guestCardContent}>
                <Text style={styles.guestBoltIcon}>⚡</Text>
                <View style={styles.guestTextCol}>
                  <Text style={styles.guestTitle}>Continue as Guest</Text>
                  <Text style={styles.guestSub}>Browse first, sign in later</Text>
                </View>
                <Text style={styles.guestChevron}>›</Text>
              </View>
            </TouchableOpacity>

            {/* 18+ Legal Compliance Checkbox */}
            <TouchableOpacity
              style={styles.ageCheckboxRow}
              activeOpacity={0.7}
              onPress={() => setIsAgeConfirmed(!isAgeConfirmed)}
            >
              <View style={[styles.checkboxBox, isAgeConfirmed && styles.checkboxBoxChecked]}>
                {isAgeConfirmed && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
              <Text style={styles.ageCheckboxLabel}>
                I confirm I am <Text style={styles.ageBoldGold}>18 years or older</Text>.
              </Text>
            </TouchableOpacity>

            <Text style={styles.termsText}>
              By continuing, you agree to our{' '}
              <Text style={styles.termsLink}>Terms & Privacy Policy</Text>.
            </Text>

            {/* Footer Crown Rule */}
            <View style={styles.footerRule}>
              <View style={styles.footerLine} />
              <Text style={styles.crownIcon}>👑</Text>
              <View style={styles.footerLine} />
            </View>

            <Text style={styles.footerTagline}>
              EXCEPTIONAL SPIRITS    |    REMARKABLE PEOPLE
            </Text>

            {/* "More than a drink" Signature */}
            <View style={styles.signatureContainer}>
              <Image
                source={require('../resources/assets/auth_signature.png')}
                style={styles.signatureImg}
                resizeMode="contain"
              />
            </View>
          </View>
        )}

        {/* ================= VIEW 2: MOBILE OTP VERIFICATION ================= */}
        {authView === 'otp' && (
          <View style={styles.subViewContainer}>
            {/* Back to main choices */}
            <TouchableOpacity
              style={styles.subBackRow}
              onPress={() => setAuthView('menu')}
              activeOpacity={0.7}
            >
              <Text style={styles.subBackArrow}>‹</Text>
              <Text style={styles.subBackText}>Back to options</Text>
            </TouchableOpacity>

            <View style={styles.subHeader}>
              <Text style={styles.subHeadingTitle}>Mobile OTP Verification</Text>
              <Text style={styles.subHeadingDesc}>
                Enter your cellular mobile number to receive a 6-digit SMS verification code.
              </Text>
            </View>

            {!isOtpSent ? (
              <View style={styles.formCard}>
                <Text style={styles.fieldLabel}>MOBILE PHONE NUMBER</Text>
                <View style={styles.phoneInputRow}>
                  <TouchableOpacity
                    style={styles.countryBadge}
                    activeOpacity={0.7}
                    onPress={() => setCountryPickerVisible(true)}
                  >
                    <CountryFlagImage iso={selectedCountryObj?.country || 'ZA'} size={15} style={{ marginRight: 6 }} />
                    <Text style={styles.countryCodeText}>{countryCode}</Text>
                    <Text style={styles.countryChevron}>⌄</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="82 123 4567"
                    placeholderTextColor="#666"
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    maxLength={14}
                    autoFocus={true}
                  />
                </View>

                <Text style={styles.helperText}>
                  We dispatch a 6-digit cellular SMS code via Google Firebase or local carrier. No password needed.
                </Text>

                {/* Send OTP Button */}
                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={handleSendOtp}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#f5c242', '#e5a93b', '#c99742']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryActionGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={styles.primaryActionBtnText}>SEND VERIFICATION CODE →</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.formCard}>
                <View style={styles.sentBanner}>
                  <Text style={styles.sentBannerTitle}>Verification Code Sent</Text>
                  <Text style={styles.sentBannerSub}>
                    Dispatched to {countryCode} {phoneNumber}
                  </Text>
                  <TouchableOpacity onPress={() => setIsOtpSent(false)}>
                    <Text style={styles.editNumberText}>Edit Phone Number</Text>
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
                  style={styles.primaryActionBtn}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#f5c242', '#e5a93b', '#c99742']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryActionGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={styles.primaryActionBtnText}>VERIFY & ENTER VAULT</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ================= VIEW 3: SIGN IN WITH EMAIL (ONE-TIME CODE / PASSWORD) ================= */}
        {authView === 'email' && (
          <View style={styles.subViewContainer}>
            {/* Back to main choices */}
            <TouchableOpacity
              style={styles.subBackRow}
              onPress={() => {
                setAuthView('menu');
                setIsEmailOtpSent(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.subBackArrow}>‹</Text>
              <Text style={styles.subBackText}>Back to options</Text>
            </TouchableOpacity>

            <View style={styles.subHeader}>
              <Text style={styles.subHeadingTitle}>Sign in with Email</Text>
              <Text style={styles.subHeadingDesc}>
                Access with a single-use 6-digit code sent to your email, or use your password.
              </Text>
            </View>

            {/* Email Tab Switcher: One-Time Code vs Password */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabBtn, emailTab === 'otp' && styles.tabBtnActive]}
                onPress={() => setEmailTab('otp')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, emailTab === 'otp' && styles.tabTextActive]}>
                  ✨ One-Time Code
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, emailTab === 'password' && styles.tabBtnActive]}
                onPress={() => setEmailTab('password')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, emailTab === 'password' && styles.tabTextActive]}>
                  🔑 Password
                </Text>
              </TouchableOpacity>
            </View>

            {/* TAB A: ONE-TIME CODE (OTP) */}
            {emailTab === 'otp' && (
              <View style={styles.formCard}>
                {!isEmailOtpSent ? (
                  <>
                    <Text style={styles.fieldLabel}>EMAIL ADDRESS (GMAIL / INBOX)</Text>
                    <TextInput
                      style={styles.standardInput}
                      placeholder="e.g. patron@gmail.com"
                      placeholderTextColor="#666"
                      onChangeText={setEmail}
                      value={email}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoFocus={true}
                    />

                    <Text style={styles.helperText}>
                      We'll send a 6-digit one-time verification code to your email inbox. No password needed.
                    </Text>

                    <TouchableOpacity
                      style={styles.primaryActionBtn}
                      onPress={handleSendEmailOtp}
                      disabled={loading}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={['#f5c242', '#e5a93b', '#c99742']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.primaryActionGradient}
                      >
                        {loading ? (
                          <ActivityIndicator color="#000" />
                        ) : (
                          <Text style={styles.primaryActionBtnText}>SEND ONE-TIME CODE →</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {/* Step 2: Enter 6-Digit Code */}
                    <View style={styles.sentBanner}>
                      <Text style={styles.sentBannerTitle}>Verification Code Sent</Text>
                      <Text style={styles.sentBannerSub}>
                        Dispatched to {email}
                      </Text>
                      <TouchableOpacity onPress={() => setIsEmailOtpSent(false)}>
                        <Text style={styles.editNumberText}>Change Email Address</Text>
                      </TouchableOpacity>
                    </View>

                    {devEmailOtpHint ? (
                      <View style={styles.devHintBox}>
                        <Text style={styles.devHintText}>💡 Dev Test Code: {devEmailOtpHint} (or 123456)</Text>
                      </View>
                    ) : null}

                    <Text style={styles.fieldLabel}>ENTER 6-DIGIT CODE</Text>
                    <TextInput
                      style={styles.otpInput}
                      placeholder="• • • • • •"
                      placeholderTextColor="#555"
                      keyboardType="number-pad"
                      value={emailOtpCode}
                      onChangeText={setEmailOtpCode}
                      maxLength={6}
                      autoFocus={true}
                    />

                    <View style={styles.resendRow}>
                      {emailResendTimer > 0 ? (
                        <Text style={styles.resendTimerText}>Resend code in {emailResendTimer}s</Text>
                      ) : (
                        <TouchableOpacity onPress={handleSendEmailOtp} disabled={loading}>
                          <Text style={styles.resendActionText}>Resend Verification Code</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.primaryActionBtn}
                      onPress={handleVerifyEmailOtp}
                      disabled={loading}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={['#f5c242', '#e5a93b', '#c99742']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.primaryActionGradient}
                      >
                        {loading ? (
                          <ActivityIndicator color="#000" />
                        ) : (
                          <Text style={styles.primaryActionBtnText}>VERIFY & ENTER VAULT</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {/* TAB B: PASSWORD SIGN IN */}
            {emailTab === 'password' && (
              <View style={styles.formCard}>

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
                  style={styles.primaryActionBtn}
                  onPress={handlePasswordLogin}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#f5c242', '#e5a93b', '#c99742']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryActionGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={styles.primaryActionBtnText}>SIGN IN TO ACCOUNT</Text>
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
          </View>
        )}
      </ScrollView>

      {/* Searchable Country Code Picker Modal */}
      <CountryCodePickerModal
        visible={countryPickerVisible}
        selectedCode={countryCode}
        onSelect={(item) => {
          setCountryCode(item.dialCode);
          setSelectedCountryObj(item);
        }}
        onClose={() => setCountryPickerVisible(false)}
      />
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070605',
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 40,
  },

  // Background Royal Seal Watermark
  bgWatermark: {
    position: 'absolute',
    top: -30,
    right: -100,
    width: 380,
    height: 380,
    opacity: 0.08,
  },

  // View 1: Main Menu Container
  menuContainer: {
    width: '100%',
  },

  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backArrowBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backArrowSymbol: {
    fontSize: 28,
    color: '#e5a93b',
    fontWeight: '300',
  },

  brandLockupContainer: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  brandLockupImage: {
    width: width * 0.78,
    height: 70,
  },

  welcomeSection: {
    marginBottom: 22,
  },
  welcomeLight: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 27,
    fontWeight: '300',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  welcomeBold: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 34,
    fontWeight: '700',
    color: '#e5a93b',
    letterSpacing: 0.4,
    marginTop: 2,
    marginBottom: 6,
  },
  subTagline: {
    fontSize: 10,
    fontWeight: '700',
    color: '#c99742',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  goldAccentLine: {
    width: 44,
    height: 2,
    backgroundColor: '#c99742',
    marginVertical: 14,
    borderRadius: 1,
  },
  welcomeDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: '#a0988c',
    letterSpacing: 0.2,
  },

  // 1. Primary Gold Pill Button: Continue with Mobile OTP
  goldPillBtn: {
    width: '100%',
    height: 54,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#f5c242',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  goldPillGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  pillPhoneIconContainer: {
    marginRight: 12,
  },
  pillPhoneIcon: {
    fontSize: 19,
    color: '#000',
  },
  goldPillText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.2,
  },
  goldPillChevron: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
  },

  // 2 & 3. Dark Card Buttons: Continue with Google & Sign in with Email
  darkCardBtn: {
    width: '100%',
    height: 54,
    borderRadius: 12,
    backgroundColor: '#141311',
    borderWidth: 1,
    borderColor: '#30281b',
    marginBottom: 12,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  cardBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 14,
  },
  mailIconEmoji: {
    fontSize: 18,
    color: '#ffffff',
    marginRight: 14,
  },
  darkCardText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  cardChevron: {
    fontSize: 20,
    color: '#c99742',
  },

  // Divider OR
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#30281b',
  },
  dividerText: {
    paddingHorizontal: 16,
    color: '#c99742',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },

  // 4. Continue as Guest Card
  guestCardBtn: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#141311',
    borderWidth: 1.2,
    borderColor: '#524022',
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginBottom: 20,
  },
  guestCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guestBoltIcon: {
    fontSize: 24,
    color: '#f5c242',
    marginRight: 14,
  },
  guestTextCol: {
    flex: 1,
  },
  guestTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 16,
    fontWeight: '700',
    color: '#f5c242',
  },
  guestSub: {
    fontSize: 12,
    color: '#8a8275',
    marginTop: 2,
  },
  guestChevron: {
    fontSize: 22,
    color: '#c99742',
  },

  // Age Gate Checkbox & Legal
  ageCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#c99742',
    backgroundColor: '#141311',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxBoxChecked: {
    backgroundColor: '#f5c242',
    borderColor: '#f5c242',
  },
  checkboxCheck: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
  },
  ageCheckboxLabel: {
    fontSize: 13,
    color: '#d4cec5',
  },
  ageBoldGold: {
    color: '#f5c242',
    fontWeight: '700',
  },
  termsText: {
    fontSize: 11.5,
    color: '#7a7267',
    marginBottom: 24,
  },
  termsLink: {
    color: '#c99742',
    textDecorationLine: 'underline',
  },

  // Footer Rule & Tagline
  footerRule: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#262016',
  },
  crownIcon: {
    fontSize: 13,
    paddingHorizontal: 12,
  },
  footerTagline: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#7a6e5b',
    letterSpacing: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  signatureContainer: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  signatureImg: {
    width: 95,
    height: 55,
    opacity: 0.85,
  },

  // Sub-View Styles (OTP and Email)
  subViewContainer: {
    width: '100%',
    paddingTop: 8,
  },
  subBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  subBackArrow: {
    fontSize: 26,
    color: '#e5a93b',
    marginRight: 6,
  },
  subBackText: {
    fontSize: 14,
    color: '#e5a93b',
    fontWeight: '600',
  },
  subHeader: {
    marginBottom: 20,
  },
  subHeadingTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
  },
  subHeadingDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: '#9e978b',
  },

  // Tab Switcher for Email
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#141311',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: '#2b2318',
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#262016',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7a7267',
  },
  tabTextActive: {
    color: '#f5c242',
    fontWeight: '700',
  },

  // Forms
  formCard: {
    backgroundColor: '#11100e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262016',
    padding: 18,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#c99742',
    letterSpacing: 1.2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181613',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#382f1f',
    marginBottom: 12,
    overflow: 'hidden',
  },
  countryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#211d17',
    borderRightWidth: 1,
    borderRightColor: '#382f1f',
  },
  countryFlag: {
    fontSize: 16,
    marginRight: 6,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f5c242',
    marginRight: 4,
  },
  countryChevron: {
    fontSize: 12,
    color: '#c99742',
  },
  phoneInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#ffffff',
  },
  helperText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#80776b',
    marginBottom: 18,
  },
  primaryActionBtn: {
    width: '100%',
    height: 50,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 6,
  },
  primaryActionGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryActionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.5,
  },

  // OTP Verification view
  sentBanner: {
    backgroundColor: '#1b1710',
    borderWidth: 1,
    borderColor: '#382f1f',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  sentBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f5c242',
    marginBottom: 2,
  },
  sentBannerSub: {
    fontSize: 12,
    color: '#a0988c',
    marginBottom: 6,
  },
  editNumberText: {
    fontSize: 12,
    color: '#c99742',
    textDecorationLine: 'underline',
  },
  devHintBox: {
    backgroundColor: '#1e1c12',
    borderColor: '#e5a93b',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  devHintText: {
    fontSize: 12,
    color: '#f5c242',
    textAlign: 'center',
  },
  otpInput: {
    backgroundColor: '#181613',
    borderWidth: 1,
    borderColor: '#382f1f',
    borderRadius: 10,
    height: 52,
    fontSize: 22,
    fontWeight: '800',
    color: '#f5c242',
    textAlign: 'center',
    letterSpacing: 10,
    marginBottom: 14,
  },
  resendRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  resendTimerText: {
    fontSize: 12,
    color: '#666',
  },
  resendActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#c99742',
    textDecorationLine: 'underline',
  },

  // Standard inputs (Email & Password)
  standardInput: {
    backgroundColor: '#181613',
    borderWidth: 1,
    borderColor: '#382f1f',
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 14,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  showHideText: {
    fontSize: 12,
    color: '#c99742',
    fontWeight: '600',
  },
  demoCard: {
    backgroundColor: '#19150d',
    borderWidth: 1,
    borderColor: '#42361e',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  demoBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#f5c242',
    letterSpacing: 1,
    marginBottom: 2,
  },
  demoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  demoDetails: {
    fontSize: 11,
    color: '#8a8275',
    marginTop: 2,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  registerPrompt: {
    fontSize: 13,
    color: '#7a7267',
  },
  registerLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f5c242',
    textDecorationLine: 'underline',
  },

  // Magic Link Sub-section
  magicSentSection: {
    marginTop: 6,
  },
  magicSentCard: {
    backgroundColor: '#1b1710',
    borderWidth: 1,
    borderColor: '#382f1f',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  magicSentHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f5c242',
    marginBottom: 4,
  },
  magicSentBody: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#b5aba0',
  },
  goldHighlight: {
    color: '#f5c242',
    fontWeight: '700',
  },
  openMailBtn: {
    backgroundColor: '#262016',
    borderWidth: 1,
    borderColor: '#c99742',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 16,
  },
  openMailBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f5c242',
    letterSpacing: 0.5,
  },
  tokenBoxContainer: {
    backgroundColor: '#161410',
    borderWidth: 1,
    borderColor: '#2b2318',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  tokenInput: {
    backgroundColor: '#1e1b16',
    borderWidth: 1,
    borderColor: '#382f1f',
    borderRadius: 8,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#f5c242',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 10,
  },
  verifyTokenBtn: {
    backgroundColor: '#302617',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  verifyTokenBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f5c242',
  },
  devFastBtn: {
    backgroundColor: '#241b0b',
    borderWidth: 1,
    borderColor: '#e5a93b',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 14,
  },
  devFastBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f5c242',
  },
});
