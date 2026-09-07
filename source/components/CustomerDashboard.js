/* eslint-disable prettier/prettier */
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  TextInput,
  ToastAndroid,
  Platform,
  Alert,
  ActivityIndicator,
  DeviceEventEmitter,
  Clipboard,
  Share,
  Linking,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { APP_FONT } from "../resources/data/Fonts";
import { API_BASE } from "../resources/data/Constants";
import BidderVerificationModal from "./auction/BidderVerificationModal";

const { width } = Dimensions.get("window");

const showMessage = (msg) => {
  if (Platform.OS === "android") {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert("", msg);
  }
};

const CustomerDashboard = ({ navigation, onBack, isActive }) => {
  const [user, setUser] = useState(null);
  const [userToken, setUserToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Quick stats
  const [ordersCount, setOrdersCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [bidsCount, setBidsCount] = useState(0);
  const [ticketsCount, setTicketsCount] = useState(0);

  // Edit Profile Modal (Includes Name, Phone, and Password Update)
  const [isEditProfileVisible, setIsEditProfileVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Bank Details & Payout Modal (Dynamic Backend Integration)
  const [isBankModalVisible, setIsBankModalVisible] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    branchCode: "",
  });
  const [tempBankDetails, setTempBankDetails] = useState({
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    branchCode: "",
  });
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [loadingBank, setLoadingBank] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [bankModalTab, setBankModalTab] = useState("my_payout"); // 'my_payout' | 'store_wire'
  const [bidderProfile, setBidderProfile] = useState(null);
  const [isVerificationModalVisible, setIsVerificationModalVisible] = useState(false);
  const [kycSettings, setKycSettings] = useState(null);
  const [storeBankDetails, setStoreBankDetails] = useState({
    bankName: "Standard Bank",
    accountName: "The Grand Store PTY LTD",
    accountNumber: "0123456789",
    branchCode: "051001",
    accountType: "Business Cheque",
    swiftCode: "SBZAJJ",
    referenceNote: "Use Order ID or Bidder Number as deposit reference",
  });
  const [storeBankKeysList, setStoreBankKeysList] = useState([]);

  // Activity Calendar Modal
  const [isCalendarModalVisible, setIsCalendarModalVisible] = useState(false);
  const [calendarCurrentDate, setCalendarCurrentDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);

  // Refer & Earn Modal (Full Original Implementation)
  const [isReferModalVisible, setIsReferModalVisible] = useState(false);
  const [referralSummary, setReferralSummary] = useState(null);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  // Super Coins Loyalty State (Matches Super Coins.docx & Web SuperCoinsWallet.jsx)
  const [isSuperCoinsModalVisible, setIsSuperCoinsModalVisible] = useState(false);
  const [superCoinsWallet, setSuperCoinsWallet] = useState({
    availableCoins: 0,
    availableRandValue: 0,
    pendingCoins: 0,
    pendingRandValue: 0,
    expiringSoonCoins: 0,
    expiringSoonDays: 0,
    transactions: [],
  });
  const [coinsLedgerFilter, setCoinsLedgerFilter] = useState("all"); // 'all' | 'earned' | 'redeemed' | 'pending'
  const [loadingCoins, setLoadingCoins] = useState(false);

  // Vendor Pricing & Costing Engine Simulator State (Matches Costing GS understanding.docx)
  const [isCostingModalVisible, setIsCostingModalVisible] = useState(false);
  const [simulatorCost, setSimulatorCost] = useState("1000");
  const [simulatorProfitPct, setSimulatorProfitPct] = useState("25");

  // Change Password Modal
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [dedicatedNewPassword, setDedicatedNewPassword] = useState("");
  const [dedicatedConfirmPassword, setDedicatedConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showDedicatedNewPassword, setShowDedicatedNewPassword] = useState(false);
  const [showDedicatedConfirmPassword, setShowDedicatedConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const fetchSuperCoinsWallet = useCallback(async (tokenArg) => {
    try {
      setLoadingCoins(true);
      const token = tokenArg || userToken || (await AsyncStorage.getItem("userToken"));
      if (token) {
        const candidates = [
          API_BASE,
          "http://127.0.0.1:5000/api",
          "http://localhost:5000/api",
          "http://10.0.2.2:5000/api",
        ];
        let fetchedData = null;
        for (const base of [...new Set(candidates.filter(Boolean))]) {
          try {
            const res = await axios.get(`${base}/super-coins/wallet`, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 4000,
            });
            if (res && res.data) {
              fetchedData = res.data;
              break;
            }
          } catch (e) {
            // try next candidate
          }
        }

        if (fetchedData) {
          setSuperCoinsWallet((prev) => ({
            ...prev,
            availableCoins: fetchedData.availableCoins ?? prev.availableCoins,
            availableRandValue:
              fetchedData.availableRandValue ??
              ((fetchedData.availableCoins ?? prev.availableCoins) * 0.1),
            pendingCoins: fetchedData.pendingCoins ?? prev.pendingCoins,
            pendingRandValue:
              fetchedData.pendingRandValue ??
              ((fetchedData.pendingCoins ?? prev.pendingCoins) * 0.1),
            expiringSoonCoins: fetchedData.expiringSoonCoins ?? prev.expiringSoonCoins,
            transactions:
              fetchedData.transactions && fetchedData.transactions.length > 0
                ? fetchedData.transactions
                : prev.transactions,
          }));
        }
      }
    } catch (err) {
      // Graceful fallback without unhandled exception
    } finally {
      setLoadingCoins(false);
    }
  }, [userToken]);

  const fetchReferralDetails = useCallback(async (tokenArg) => {
    try {
      setLoadingReferrals(true);
      const token = tokenArg || userToken || (await AsyncStorage.getItem("userToken"));
      if (token) {
        const res = await axios.get(`${API_BASE}/auth/referrals`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 8000,
        });
        if (res.data) {
          setReferralSummary(res.data);
          if (res.data.referralCode || res.data.rewardBalance !== undefined) {
            setUser((prev) => ({
              ...prev,
              referralCode: res.data.referralCode || prev.referralCode,
              rewardBalance: res.data.rewardBalance ?? prev.rewardBalance,
            }));
          }
        }
      }
    } catch (err) {
      console.log("Error fetching referral details:", err?.message || err);
    } finally {
      setLoadingReferrals(false);
    }
  }, [userToken]);

  const fetchBankingData = useCallback(async (tokenArg) => {
    try {
      setLoadingBank(true);
      const token = tokenArg || userToken || (await AsyncStorage.getItem("userToken"));

      // 1. Fetch public platform bank settings
      try {
        const settingsRes = await axios.get(`${API_BASE}/settings/public`, { timeout: 6000 });
        if (settingsRes.data?.bankDetails) {
          setStoreBankDetails(settingsRes.data.bankDetails);
          if (Array.isArray(settingsRes.data.bankDetailsList)) {
            setStoreBankKeysList(settingsRes.data.bankDetailsList);
          }
        }
      } catch (sErr) {
        // use fallback store bank details
      }

      // 2. If authenticated, fetch customer's banking details & bidder escrow status
      if (token) {
        const headers = { Authorization: `Bearer ${token}` };

        // GET /api/auth/banking
        try {
          const bankRes = await axios.get(`${API_BASE}/auth/banking`, { headers, timeout: 6000 });
          if (bankRes.data?.bankAccountDetails) {
            const b = bankRes.data.bankAccountDetails;
            if (b.bankName || b.accountNumber) {
              const updated = {
                bankName: b.bankName || "",
                accountHolder: b.accountHolder || "",
                accountNumber: b.accountNumber || "",
                branchCode: b.branchCode || "",
              };
              setBankDetails(updated);
              setTempBankDetails(updated);
              await AsyncStorage.setItem("customerBankDetails", JSON.stringify(updated));
              setIsEditingBank(false);
            } else {
              setIsEditingBank(true);
            }
          }
        } catch (bErr) {
          console.log("Auth banking load error:", bErr?.message);
        }

        // GET /api/auction/bidder/status
        try {
          const bidderRes = await axios.get(`${API_BASE}/auction/bidder/status`, { headers, timeout: 6000 });
          if (bidderRes.data) {
            setBidderProfile(bidderRes.data);
            if (bidderRes.data.bankAccountDetails?.accountNumber && !bankDetails.accountNumber) {
              const b = bidderRes.data.bankAccountDetails;
              const updated = {
                bankName: b.bankName || "",
                accountHolder: b.accountHolder || "",
                accountNumber: b.accountNumber || "",
                branchCode: b.branchCode || "",
              };
              setBankDetails(updated);
              setTempBankDetails(updated);
              await AsyncStorage.setItem("customerBankDetails", JSON.stringify(updated));
            }
          }
        } catch (bidErr) {
          console.log("Bidder status load error:", bidErr?.message);
        }
      }
    } catch (err) {
      console.log("Error in fetchBankingData:", err);
    } finally {
      setLoadingBank(false);
    }
  }, [userToken, bankDetails.accountNumber]);

  const loadUserData = useCallback(async () => {
    try {
      setInitialLoading(true);
      const storedUserInfo = await AsyncStorage.getItem("userInfo");
      const storedToken = await AsyncStorage.getItem("userToken");
      const storedName = await AsyncStorage.getItem("userName");
      const storedPhone = await AsyncStorage.getItem("userPhone");
      const storedEmail = await AsyncStorage.getItem("userEmail");

      if (storedToken) {
        setUserToken(storedToken);
      } else {
        setUserToken(null);
      }

      let parsedUser = null;
      if (storedUserInfo) {
        try {
          parsedUser = JSON.parse(storedUserInfo);
        } catch (e) {}
      }

      const isAuthenticated = Boolean(storedToken && (parsedUser || storedName || storedEmail));

      if (isAuthenticated) {
        const name = parsedUser?.name || parsedUser?.userName || storedName || "Collector";
        const email = parsedUser?.email || storedEmail || "";
        const phone = parsedUser?.phone || parsedUser?.phoneNumber || storedPhone || "";
        const referralCode = parsedUser?.referralCode || "";
        const rewardBalance = parsedUser?.rewardBalance ?? 0;

        setUser({
          ...parsedUser,
          name,
          email,
          phone,
          referralCode,
          rewardBalance,
          isAgeVerified: Boolean(parsedUser?.isAgeVerified),
          bidderApprovalStatus: parsedUser?.bidderApprovalStatus || "unregistered",
          bidderLevel: parsedUser?.bidderLevel || "level_1_registered",
        });
        setEditName(name);
        setEditEmail(email);
        setEditPhone(phone);

        try {
          const profileRes = await axios.get(`${API_BASE}/auth/profile`, {
            headers: { Authorization: `Bearer ${storedToken}` },
            timeout: 7000,
          });
          if (profileRes.data) {
            const p = profileRes.data;
            setUser((prev) => ({
              ...prev,
              ...p,
              name: p.name || prev?.name || name,
              email: p.email || prev?.email || email,
              phone: p.phone || p.phoneNumber || prev?.phone || phone,
              referralCode: p.referralCode || prev?.referralCode || referralCode,
              rewardBalance: p.rewardBalance ?? prev?.rewardBalance ?? rewardBalance,
              isAgeVerified: Boolean(p.isAgeVerified),
              bidderApprovalStatus: p.bidderApprovalStatus || prev?.bidderApprovalStatus || "unregistered",
              bidderLevel: p.bidderLevel || prev?.bidderLevel || "level_1_registered",
            }));
            setEditName(p.name || name);
            setEditEmail(p.email || email);
            setEditPhone(p.phone || p.phoneNumber || phone);
            await AsyncStorage.setItem("userInfo", JSON.stringify(p));
            if (p.name) await AsyncStorage.setItem("userName", p.name);
            if (p.email) await AsyncStorage.setItem("userEmail", p.email);
            if (p.phone || p.phoneNumber) {
              await AsyncStorage.setItem("userPhone", p.phone || p.phoneNumber);
            }
          }
        } catch (pErr) {
          // offline cached info remains intact
        }

        fetchReferralDetails(storedToken);
        fetchBankingData(storedToken);
        fetchSuperCoinsWallet(storedToken);

        // Fetch real auction bids count
        try {
          const bidRes = await axios.get(`${API_BASE}/auction/user/dashboard`, {
            headers: { Authorization: `Bearer ${storedToken}` },
            timeout: 5000,
          });
          if (bidRes.data) {
            const total = (bidRes.data.activeLots?.length || 0) + (bidRes.data.wonLots?.length || 0);
            setBidsCount(total);
          }
        } catch (bErr) {
          // keep 0
        }

        // Fetch real tickets count
        try {
          const tRes = await axios.get(`${API_BASE}/events/bookings/my-tickets`, {
            headers: { Authorization: `Bearer ${storedToken}` },
            timeout: 5000,
          });
          if (tRes.data && Array.isArray(tRes.data)) {
            setTicketsCount(tRes.data.length);
          }
        } catch (tErr) {
          // keep 0
        }

        // Fetch real orders count
        try {
          const ordRes = await axios.get(`${API_BASE}/orders/myorders`, {
            headers: { Authorization: `Bearer ${storedToken}` },
            timeout: 5000,
          });
          if (ordRes.data && Array.isArray(ordRes.data)) {
            setOrdersCount(ordRes.data.length);
          }
        } catch (oErr) {
          // fallback to cached orders
        }
        // Fetch dynamic admin settings from /settings/public
        try {
          const setRes = await axios.get(`${API_BASE}/settings/public`, { timeout: 5000 });
          if (setRes.data) setKycSettings(setRes.data);
        } catch (sErr) {}

        // Fetch fresh bidder status
        try {
          const bidderRes = await axios.get(`${API_BASE}/auction/bidder/status`, {
            headers: { Authorization: `Bearer ${storedToken}` },
            timeout: 5000,
          });
          if (bidderRes.data) setBidderProfile(bidderRes.data);
        } catch (bdErr) {}
      } else {
        // GUEST: Clear all user state and counts
        setUser(null);
        setUserToken(null);
        setOrdersCount(0);
        setWishlistCount(0);
        setBidsCount(0);
        setTicketsCount(0);
        setSuperCoinsWallet({
          availableCoins: 0,
          availableRandValue: 0,
          pendingCoins: 0,
          pendingRandValue: 0,
          expiringSoonCoins: 0,
          expiringSoonDays: 0,
          transactions: [],
        });
      }

      // Load Wishlist count
      const storedWishlist = await AsyncStorage.getItem("grand-store-wishlist");
      if (storedWishlist) {
        try {
          const list = JSON.parse(storedWishlist);
          if (Array.isArray(list)) setWishlistCount(list.length);
        } catch (e) {}
      }

      // If authenticated and ordersCount still 0, check userOrders cached in AsyncStorage
      if (isAuthenticated) {
        const storedOrders = await AsyncStorage.getItem("userOrders");
        if (storedOrders) {
          try {
            const ords = JSON.parse(storedOrders);
            if (Array.isArray(ords) && ords.length > 0) setOrdersCount(ords.length);
          } catch (e) {}
        }
      }
    } catch (err) {
      console.log("Error loading customer data:", err);
    } finally {
      setInitialLoading(false);
    }
  }, [fetchReferralDetails, fetchBankingData, fetchSuperCoinsWallet]);

  useEffect(() => {
    loadUserData();

    const subWishlist = DeviceEventEmitter.addListener("wishlistUpdated", (cnt) => {
      if (typeof cnt === "number") setWishlistCount(cnt);
    });

    const subUserLogin = DeviceEventEmitter.addListener("userLoggedIn", (newUserData) => {
      console.log("[CustomerDashboard] userLoggedIn event received! Reloading fresh data...", newUserData?.name);
      loadUserData();
    });

    const subUserLogout = DeviceEventEmitter.addListener("userLoggedOut", () => {
      console.log("[CustomerDashboard] userLoggedOut event received! Resetting dashboard...");
      setUserToken(null);
      setUser(null);
      setOrdersCount(0);
      setWishlistCount(0);
      setBidsCount(0);
      setTicketsCount(0);
      setSuperCoinsWallet({
        availableCoins: 0,
        availableRandValue: 0,
        pendingCoins: 0,
        pendingRandValue: 0,
        expiringSoonCoins: 0,
        expiringSoonDays: 0,
        transactions: [],
      });
      loadUserData();
    });

    const subUserAgeVerified = DeviceEventEmitter.addListener("userAgeVerified", (data) => {
      console.log("[CustomerDashboard] userAgeVerified event received! Refreshing...", data);
      loadUserData();
    });

    return () => {
      subWishlist.remove();
      subUserLogin.remove();
      subUserLogout.remove();
      subUserAgeVerified.remove();
    };
  }, [loadUserData]);

  useEffect(() => {
    if (isActive) {
      loadUserData();
    }
  }, [isActive, loadUserData]);

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      showMessage("Please enter your name");
      return;
    }

    const hasPasswordChange = Boolean(newPassword.trim());
    if (hasPasswordChange) {
      if (!currentPassword.trim()) {
        showMessage("Current password is required to change password");
        return;
      }
      if (newPassword.trim().length < 6) {
        showMessage("New password must be at least 6 characters");
        return;
      }
      if (newPassword.trim() !== confirmPassword.trim()) {
        showMessage("New passwords do not match");
        return;
      }
    }

    setSavingProfile(true);
    try {
      const token = userToken || (await AsyncStorage.getItem("userToken"));
      const payload = {
        name: editName.trim(),
        phone: editPhone.trim(),
        phoneNumber: editPhone.trim(),
      };
      if (hasPasswordChange) {
        payload.currentPassword = currentPassword.trim();
        payload.password = newPassword.trim();
      }

      let updatedUser = null;
      if (token) {
        try {
          const res = await axios.put(`${API_BASE}/auth/profile`, payload, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000,
          });
          if (res.data) {
            updatedUser = res.data;
            if (res.data.token) {
              await AsyncStorage.setItem("userToken", res.data.token);
              setUserToken(res.data.token);
            }
          }
        } catch (apiErr) {
          const errMsg =
            apiErr.response?.data?.message ||
            "Failed to update profile on server. Please check your current password.";
          showMessage(errMsg);
          setSavingProfile(false);
          return;
        }
      }

      await AsyncStorage.setItem("userName", editName.trim());
      await AsyncStorage.setItem("userPhone", editPhone.trim());
      if (updatedUser) {
        await AsyncStorage.setItem("userInfo", JSON.stringify(updatedUser));
      }

      setUser((prev) => ({
        ...prev,
        name: editName.trim(),
        phone: editPhone.trim(),
        ...(updatedUser
          ? {
              rewardBalance: updatedUser.rewardBalance ?? prev.rewardBalance,
              referralCode: updatedUser.referralCode || prev.referralCode,
            }
          : {}),
      }));

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsEditProfileVisible(false);
      showMessage(
        hasPasswordChange
          ? "Profile and password updated successfully!"
          : "Profile updated successfully!"
      );
    } catch (err) {
      showMessage("Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveBankDetails = async () => {
    if (!tempBankDetails.bankName.trim() || !tempBankDetails.accountNumber.trim()) {
      showMessage("Please provide Bank Name and Account Number");
      return;
    }
    const accHolder = (tempBankDetails.accountHolder || user?.name || "").trim();

    setSavingBank(true);
    try {
      const token = userToken || (await AsyncStorage.getItem("userToken"));
      const payload = {
        bankName: tempBankDetails.bankName.trim(),
        accountHolder: accHolder,
        accountNumber: tempBankDetails.accountNumber.trim(),
        branchCode: (tempBankDetails.branchCode || "").trim(),
      };

      if (token) {
        const res = await axios.put(`${API_BASE}/auth/banking`, payload, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 8000,
        });
        if (res.data?.bankAccountDetails) {
          const b = res.data.bankAccountDetails;
          const updated = {
            bankName: b.bankName || payload.bankName,
            accountHolder: b.accountHolder || payload.accountHolder,
            accountNumber: b.accountNumber || payload.accountNumber,
            branchCode: b.branchCode || payload.branchCode,
          };
          setBankDetails(updated);
          setTempBankDetails(updated);
          await AsyncStorage.setItem("customerBankDetails", JSON.stringify(updated));
        } else {
          setBankDetails(payload);
          setTempBankDetails(payload);
          await AsyncStorage.setItem("customerBankDetails", JSON.stringify(payload));
        }
      } else {
        await AsyncStorage.setItem("customerBankDetails", JSON.stringify(payload));
        setBankDetails(payload);
      }

      setIsEditingBank(false);
      showMessage("Bank details saved for auction payouts & refunds!");
    } catch (e) {
      console.log("Error saving bank details to backend:", e?.response?.data || e?.message);
      const fallbackPayload = {
        bankName: tempBankDetails.bankName.trim(),
        accountHolder: accHolder,
        accountNumber: tempBankDetails.accountNumber.trim(),
        branchCode: (tempBankDetails.branchCode || "").trim(),
      };
      await AsyncStorage.setItem("customerBankDetails", JSON.stringify(fallbackPayload));
      setBankDetails(fallbackPayload);
      setIsEditingBank(false);
      showMessage(e?.response?.data?.message || "Bank details saved to your profile!");
    } finally {
      setSavingBank(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword.trim() || !dedicatedNewPassword.trim()) {
      showMessage("Please complete all password fields");
      return;
    }
    if (dedicatedNewPassword.trim().length < 6) {
      showMessage("New password must be at least 6 characters");
      return;
    }
    if (dedicatedNewPassword.trim() !== dedicatedConfirmPassword.trim()) {
      showMessage("New passwords do not match");
      return;
    }

    setSavingPassword(true);
    try {
      const token = userToken || (await AsyncStorage.getItem("userToken"));
      if (token) {
        const res = await axios.put(
          `${API_BASE}/auth/profile`,
          {
            currentPassword: oldPassword.trim(),
            password: dedicatedNewPassword.trim(),
          },
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000,
          }
        );
        if (res.data?.token) {
          await AsyncStorage.setItem("userToken", res.data.token);
          setUserToken(res.data.token);
        }
      }
      showMessage("Password updated successfully!");
      setIsPasswordModalVisible(false);
      setOldPassword("");
      setDedicatedNewPassword("");
      setDedicatedConfirmPassword("");
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Failed to update password. Please check your current password.";
      showMessage(errMsg);
    } finally {
      setSavingPassword(false);
    }
  };

  // Refer & Earn Helpers
  const activeReferralCode = referralSummary?.referralCode || user?.referralCode || "";
  const referralLink = activeReferralCode ? `https://thegrandstore.co.za/register?ref=${encodeURIComponent(activeReferralCode)}` : "https://thegrandstore.co.za/register";
  const programRewardAmount = referralSummary?.program?.rewardAmount ?? 500;
  const programWelcomeDiscount = referralSummary?.program?.welcomeDiscount ?? 250;

  const handleCopyLink = () => {
    try {
      if (Clipboard && typeof Clipboard.setString === "function") {
        Clipboard.setString(referralLink);
      }
    } catch (e) {}
    setCopiedLink(true);
    showMessage("Referral link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyCode = () => {
    try {
      if (Clipboard && typeof Clipboard.setString === "function") {
        Clipboard.setString(activeReferralCode);
      }
    } catch (e) {}
    setCopiedCode(true);
    showMessage(`Referral code ${activeReferralCode} copied!`);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleShareWhatsApp = async () => {
    const text = `Check out The Grand Store! Sign up using my referral link to get a welcome discount: ${referralLink}`;
    const waUrl = `whatsapp://send?text=${encodeURIComponent(text)}`;
    try {
      const supported = await Linking.canOpenURL(waUrl);
      if (supported) {
        await Linking.openURL(waUrl);
      } else {
        await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
      }
    } catch (e) {
      Share.share({ message: text });
    }
  };

  const handleNativeShare = async () => {
    try {
      await Share.share({
        title: "Invitation to The Grand Store",
        message: `Check out The Grand Store! Sign up using my referral link to get an exclusive welcome discount:\n${referralLink}`,
        url: referralLink,
      });
    } catch (e) {
      console.log("Share error:", e);
    }
  };

  const handleShareEmail = async () => {
    const subject = encodeURIComponent("Invitation to The Grand Store");
    const body = encodeURIComponent(
      `Hi,\n\nI thought you might appreciate The Grand Store's rare spirits & fine wine collection. Sign up using my referral link to receive an exclusive welcome benefit on your first order:\n\n${referralLink}\n\nCheers!`
    );
    Linking.openURL(`mailto:?subject=${subject}&body=${body}`).catch(() => {
      handleNativeShare();
    });
  };

  const handleLogout = async () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to sign out from your account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            try {
              try {
                const { GoogleSignin } = require("@react-native-google-signin/google-signin");
                await GoogleSignin.signOut();
              } catch (gErr) {}

              await AsyncStorage.multiRemove([
                "userToken",
                "userInfo",
                "userName",
                "userEmail",
                "userPhone",
                "customerBankDetails",
                "userOrders",
                "isAgeVerified",
                "grand-store-age-verified",
              ]);
              DeviceEventEmitter.emit("userLoggedOut");
              showMessage("Logged out successfully");
              navigation.navigate("LoginScreen");
            } catch (err) {
              console.log(err);
            }
          },
        },
      ]
    );
  };

  const calYear = calendarCurrentDate.getFullYear();
  const calMonth = calendarCurrentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const weekDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  const firstDayIndex = (new Date(calYear, calMonth, 1).getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();

  const calendarDays = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarDays.push({
      day: daysInPrevMonth - i,
      monthOffset: -1,
      isCurrentMonth: false,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday =
      new Date().getFullYear() === calYear &&
      new Date().getMonth() === calMonth &&
      new Date().getDate() === d;
    calendarDays.push({
      day: d,
      monthOffset: 0,
      isCurrentMonth: true,
      isToday,
    });
  }
  const totalGridCount = calendarDays.length > 35 ? 42 : 35;
  const remainingCells = totalGridCount - calendarDays.length;
  for (let d = 1; d <= remainingCells; d++) {
    calendarDays.push({
      day: d,
      monthOffset: 1,
      isCurrentMonth: false,
    });
  }

  const calendarWeeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    calendarWeeks.push(calendarDays.slice(i, i + 7));
  }

  const activities = [
    {
      id: 1,
      title: "Rare Vault Auction Live Closing",
      dateStr: "Sep 7, 2026",
      time: "16:05",
      type: "AUCTION",
      badge: "Lot #17EB7",
      color: "#ef4444",
      day: 7,
      month: 8,
      year: 2026,
      desc: "Live closing session for allocated 1982 Bordeaux Grand Vin lot.",
      action: () => {
        setIsCalendarModalVisible(false);
        navigation.navigate("AuctionsHub");
      },
    },
    {
      id: 2,
      title: "Private Cellar Tasting: Vintage Bordeaux",
      dateStr: "Sep 12, 2026",
      time: "18:00",
      type: "TASTING",
      badge: "VIP Pass",
      color: "#f5c242",
      day: 12,
      month: 8,
      year: 2026,
      desc: "Exclusive sommelier tasting flight of premier grand cru classé.",
      action: () => {
        setIsCalendarModalVisible(false);
        navigation.navigate("EventTicketPass");
      },
    },
    {
      id: 3,
      title: "Consignment Settlement & Payout",
      dateStr: "Sep 15, 2026",
      time: "10:00",
      type: "BANKING",
      badge: "FNB Direct EFT",
      color: "#10b981",
      day: 15,
      month: 8,
      year: 2026,
      desc: "Scheduled electronic funds transfer for verified consigned vault lots.",
      action: () => {
        setIsCalendarModalVisible(false);
        setIsBankModalVisible(true);
      },
    },
    {
      id: 4,
      title: "Sommelier Masterclass: Islay Single Malts",
      dateStr: "Sep 22, 2026",
      time: "19:00",
      type: "TASTING",
      badge: "Masterclass",
      color: "#f5c242",
      day: 22,
      month: 8,
      year: 2026,
      desc: "Private virtual sensory masterclass exploring rare peated cask releases.",
      action: () => {
        setIsCalendarModalVisible(false);
        navigation.navigate("EventsHub");
      },
    },
    {
      id: 5,
      title: "Prestige Single Malt Auction Lot Close",
      dateStr: "Sep 28, 2026",
      time: "17:30",
      type: "AUCTION",
      badge: "Macallan 50Y",
      color: "#ef4444",
      day: 28,
      month: 8,
      year: 2026,
      desc: "Auction hammer drops for the Macallan Millennium crystal decanter.",
      action: () => {
        setIsCalendarModalVisible(false);
        navigation.navigate("AuctionsHub");
      },
    },
  ];

  const getDayActivities = (item) => {
    if (!item.isCurrentMonth) return [];
    return activities.filter(
      (act) => act.year === calYear && act.month === calMonth && act.day === item.day
    );
  };

  const visibleActivities = selectedCalendarDate
    ? activities.filter(
        (act) =>
          act.year === calYear &&
          act.month === calMonth &&
          act.day === selectedCalendarDate
      )
    : activities.filter((act) => act.year === calYear && act.month === calMonth);

  const handlePrevMonth = () => {
    setSelectedCalendarDate(null);
    setCalendarCurrentDate(new Date(calYear, calMonth - 1, 1));
  };
  const handleNextMonth = () => {
    setSelectedCalendarDate(null);
    setCalendarCurrentDate(new Date(calYear, calMonth + 1, 1));
  };
  const handleToday = () => {
    const now = new Date();
    setCalendarCurrentDate(now);
    setSelectedCalendarDate(now.getDate());
  };

  if (initialLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#f5c242" />
      </View>
    );
  }

  if (!userToken || !user) {
    return (
      <View style={styles.container}>
        {/* Fixed Luxury Header */}
        <View style={styles.topBar}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {(onBack || (navigation?.canGoBack && navigation.canGoBack())) && (
              <TouchableOpacity
                onPress={() => {
                  if (onBack) onBack();
                  else if (navigation?.canGoBack && navigation.canGoBack()) navigation.goBack();
                  else navigation.navigate("Home");
                }}
                style={{ marginRight: 12, padding: 4 }}
              >
                <Image
                  source={require("../resources/images/back_icon.png")}
                  style={{ width: 20, height: 18, tintColor: "#f5c242", resizeMode: "contain" }}
                />
              </TouchableOpacity>
            )}
            <Text style={styles.topBarTitle}>Customer Dashboard</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.guestScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Luxury Guest Lock Card */}
          <LinearGradient
            colors={["#2a2216", "#17130e", "#0e0c09"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.guestHeroCard}
          >
            <View style={styles.guestIconCircle}>
              <Text style={{ fontSize: 34 }}>🔒</Text>
            </View>

            <View style={styles.guestTierBadge}>
              <Text style={styles.guestTierBadgeText}>PATRON SIGN IN REQUIRED</Text>
            </View>

            <Text style={styles.guestHeroTitle}>Private Collector Vault</Text>
            <Text style={styles.guestHeroSub}>
              You are currently browsing as a guest. Sign in or create an account to access your personal dashboard, track live orders, view auction bids, and redeem Super Coins rewards.
            </Text>

            {/* Primary Action: Sign In */}
            <TouchableOpacity
              style={styles.guestPrimaryBtn}
              activeOpacity={0.88}
              onPress={() => navigation.navigate("LoginScreen")}
            >
              <LinearGradient
                colors={["#f5c242", "#d4a228", "#aa7c11"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.guestPrimaryBtnGrad}
              >
                <Text style={styles.guestPrimaryBtnText}>SIGN IN / CREATE ACCOUNT</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Secondary Action: Explore Shop */}
            <TouchableOpacity
              style={styles.guestSecondaryBtn}
              activeOpacity={0.8}
              onPress={() => {
                if (onBack) onBack();
                else navigation.navigate("Shop");
              }}
            >
              <Text style={styles.guestSecondaryBtnText}>Explore Wine & Spirits Collection →</Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* Member Privileges Preview */}
          <Text style={styles.guestBenefitsHeading}>PATRON PRIVILEGES</Text>
          <View style={styles.guestBenefitsCard}>
            <View style={styles.guestBenefitRow}>
              <Text style={styles.guestBenefitIcon}>📦</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.guestBenefitTitle}>Order Tracking & Logistics</Text>
                <Text style={styles.guestBenefitDesc}>
                  Live courier tracking for door-to-door deliveries and PostNet branch pickups.
                </Text>
              </View>
            </View>

            <View style={styles.guestBenefitDivider} />

            <View style={styles.guestBenefitRow}>
              <Text style={styles.guestBenefitIcon}>🪙</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.guestBenefitTitle}>Super Coins Loyalty Wallet</Text>
                <Text style={styles.guestBenefitDesc}>
                  Earn 10% cash-back coins on every purchase with instant checkout redemption.
                </Text>
              </View>
            </View>

            <View style={styles.guestBenefitDivider} />

            <View style={styles.guestBenefitRow}>
              <Text style={styles.guestBenefitIcon}>🏛️</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.guestBenefitTitle}>Live Auction Bidding</Text>
                <Text style={styles.guestBenefitDesc}>
                  Verified 18+ patron bidding on allocated grand cru bottles and rare whiskies.
                </Text>
              </View>
            </View>

            <View style={styles.guestBenefitDivider} />

            <View style={styles.guestBenefitRow}>
              <Text style={styles.guestBenefitIcon}>🎟️</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.guestBenefitTitle}>VIP Cellar Tasting Passes</Text>
                <Text style={styles.guestBenefitDesc}>
                  Digital QR event passes for exclusive cellar tastings and masterclasses.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  const isKycPending = Boolean(
    user?.bidderApprovalStatus === "pending_approval" ||
    bidderProfile?.bidderApprovalStatus === "pending_approval" ||
    bidderProfile?.isPending === true
  );
  const isKycVerified = !isKycPending && Boolean(
    user?.bidderApprovalStatus === "approved" ||
    bidderProfile?.bidderApprovalStatus === "approved" ||
    bidderProfile?.isVerified === true ||
    (user?.isAgeVerified === true && user?.bidderApprovalStatus !== "pending_approval" && user?.bidderApprovalStatus !== "rejected") ||
    (["level_2_verified", "level_3_enhanced", "level_4_vip"].includes(user?.bidderLevel)) ||
    (["level_2_verified", "level_3_enhanced", "level_4_vip"].includes(bidderProfile?.bidderLevel))
  );
  const isKycRejected = Boolean(
    !isKycVerified &&
    !isKycPending &&
    (bidderProfile?.bidderApprovalStatus === "rejected" ||
      user?.bidderApprovalStatus === "rejected")
  );
  const isKycUnregistered = !isKycVerified && !isKycPending && !isKycRejected;
  const minKycAge = kycSettings?.bidderKycMinAge || 18;

  return (
    <View style={styles.container}>
      {/* Fixed Luxury Header */}
      <View style={styles.topBar}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {(onBack || (navigation?.canGoBack && navigation.canGoBack())) && (
            <TouchableOpacity
              onPress={() => {
                if (onBack) onBack();
                else if (navigation?.canGoBack && navigation.canGoBack()) navigation.goBack();
                else navigation.navigate("Home");
              }}
              style={{ marginRight: 12, padding: 4 }}
            >
              <Image
                source={require("../resources/images/back_icon.png")}
                style={{ width: 20, height: 18, tintColor: "#f5c242", resizeMode: "contain" }}
              />
            </TouchableOpacity>
          )}
          <Text style={styles.topBarTitle}>Customer Dashboard</Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsEditProfileVisible(true)}
          style={styles.editHeaderBtn}
        >
          <Text style={styles.editHeaderBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        <LinearGradient
          colors={["#2a2216", "#17130e", "#0e0c09"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileCard}
        >
          <View style={styles.avatarWrap}>
            <Image
              source={
                user?.avatar || user?.profilePic
                  ? { uri: user.avatar || user.profilePic }
                  : require("../resources/images/sommelier_crest.jpg")
              }
              style={styles.avatarImage}
            />
            <View style={styles.vipDot} />
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.vipBadge}>
              <Text style={styles.vipBadgeText}>👑 GRAND CELLAR VIP</Text>
            </View>
            <Text style={styles.profileName} numberOfLines={1}>
              {user?.name || "Collector"}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {user?.email || ""}
            </Text>
            <Text style={styles.profilePhone}>{user?.phone || ""}</Text>
          </View>
        </LinearGradient>

        {/* 18+ Legal Age & Identity Verification (KYC) Card */}
        <View style={styles.kycCardContainer}>
          {/* Card Header */}
          <View style={styles.kycHeaderRow}>
            <View style={styles.kycHeaderLeft}>
              <View
                style={[
                  styles.kycHeaderBadge,
                  isKycVerified
                    ? styles.kycHeaderBadgeVerified
                    : isKycPending
                    ? styles.kycHeaderBadgePending
                    : isKycRejected
                    ? styles.kycHeaderBadgeRejected
                    : styles.kycHeaderBadgeUnverified,
                ]}
              >
                <Text style={styles.kycHeaderBadgeIcon}>
                  {isKycVerified ? "👑" : isKycPending ? "⏱" : isKycRejected ? "✕" : "⚖️"}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.kycHeaderTitle}>
                  {minKycAge}+ Legal Age & Identity Verification
                </Text>
                <Text style={styles.kycHeaderSubtitle}>
                  Dual Compliance for Store Wine/Spirits and Live Auctions
                </Text>
              </View>
            </View>

            {/* Status Tag Pill */}
            <View
              style={[
                styles.kycStatusTag,
                isKycVerified
                  ? styles.kycStatusTagVerified
                  : isKycPending
                  ? styles.kycStatusTagPending
                  : isKycRejected
                  ? styles.kycStatusTagRejected
                  : styles.kycStatusTagUnverified,
              ]}
            >
              <Text
                style={[
                  styles.kycStatusTagText,
                  isKycVerified
                    ? styles.kycStatusTagTextVerified
                    : isKycPending
                    ? styles.kycStatusTagTextPending
                    : isKycRejected
                    ? styles.kycStatusTagTextRejected
                    : styles.kycStatusTagTextUnverified,
                ]}
              >
                {isKycVerified
                  ? `✓ ${minKycAge}+ Verified`
                  : isKycPending
                  ? "⏱ Under Review"
                  : isKycRejected
                  ? "✕ Rejected"
                  : `Not Verified (${minKycAge}+)`}
              </Text>
            </View>
          </View>

          {/* STATE 1: UNREGISTERED / NOT VERIFIED */}
          {isKycUnregistered && (
            <View style={styles.kycUnregisteredWrap}>
              <Text style={styles.kycExplainerText}>
                Under South African liquor legislation (National Liquor Act) and auction compliance regulations, complete your legal adult age ({minKycAge}+) verification once. This unlocks pre-cleared store product purchases across all fine wines & spirits, and qualifies your account for live auctions.
              </Text>

              <View style={styles.kycBenefitsGrid}>
                {/* Store Purchases Benefit */}
                <View style={styles.kycBenefitCard}>
                  <View style={styles.kycBenefitTitleRow}>
                    <Text style={styles.kycBenefitIcon}>🍷</Text>
                    <Text style={styles.kycBenefitTitle}>Store Product Purchases</Text>
                  </View>
                  <Text style={styles.kycBenefitDesc}>
                    Clears 18+ liquor compliance. Enjoy 1-click checkout with no document requests.
                  </Text>
                  <Text style={styles.kycBenefitBadge}>✓ Required for Fine Spirits</Text>
                </View>

                {/* Auction Bidding Benefit */}
                <View style={styles.kycBenefitCard}>
                  <View style={styles.kycBenefitTitleRow}>
                    <Text style={styles.kycBenefitIcon}>🏛️</Text>
                    <Text style={styles.kycBenefitTitle}>Live Auction Bidding</Text>
                  </View>
                  <Text style={styles.kycBenefitDesc}>
                    Assigns your official Public Bidder Number with verified standard limit.
                  </Text>
                  <Text style={[styles.kycBenefitBadge, { color: "#c99742" }]}>✓ Bidding Included</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.kycVerifyBtn}
                onPress={() => setIsVerificationModalVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.kycVerifyBtnText}>
                  Verify {minKycAge}+ Identity (Store & Auctions) →
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STATE 2: PENDING COMPLIANCE REVIEW */}
          {isKycPending && (
            <View style={styles.kycPendingBox}>
              <View style={styles.kycPendingHeader}>
                <Text style={styles.kycPendingIcon}>⏱</Text>
                <Text style={styles.kycPendingTitle}>18+ Identity Verification Under Review</Text>
              </View>
              <Text style={styles.kycPendingDesc}>
                Your official identification document has been securely submitted and is undergoing review by compliance officers. Once approved, your account will be permanently pre-cleared for instant store wine & spirits checkout and live auction bidding.
              </Text>
              {(bidderProfile?.bidderNumber || user?.bidderNumber) && (
                <View style={styles.kycBidderNumberRow}>
                  <Text style={styles.kycBidderNumberLabel}>Assigned Bidder Number:</Text>
                  <Text style={styles.kycBidderNumberValue}>
                    {bidderProfile?.bidderNumber || user?.bidderNumber}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* STATE 3: REJECTED */}
          {isKycRejected && (
            <View style={styles.kycRejectedBox}>
              <View style={styles.kycRejectedHeader}>
                <Text style={styles.kycRejectedIcon}>✕</Text>
                <Text style={styles.kycRejectedTitle}>18+ Verification Application Rejected</Text>
              </View>
              <Text style={styles.kycRejectedDesc}>
                {bidderProfile?.bidderRejectionReason ||
                  user?.bidderRejectionReason ||
                  "Your submitted identification documents could not be validated."}
              </Text>
              <TouchableOpacity
                style={styles.kycResubmitBtn}
                onPress={() => setIsVerificationModalVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.kycResubmitBtnText}>
                  Re-submit 18+ Verification Documents →
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STATE 4: APPROVED / VERIFIED */}
          {isKycVerified && (
            <View style={styles.kycVerifiedGrid}>
              <View style={styles.kycMetricCard}>
                <Text style={styles.kycMetricLabel}>STORE ORDERS</Text>
                <Text style={styles.kycMetricValueSuccess}>✓ 18+ Pre-Cleared</Text>
                <Text style={styles.kycMetricSub}>Instant Spirit Checkout</Text>
              </View>
              <View style={styles.kycMetricCard}>
                <Text style={styles.kycMetricLabel}>BIDDER NUMBER</Text>
                <Text style={styles.kycMetricValueGold}>
                  {bidderProfile?.bidderNumber || user?.bidderNumber || "GS-B1088"}
                </Text>
                <Text style={styles.kycMetricSub}>Live Auctions Active</Text>
              </View>
              <View style={styles.kycMetricCard}>
                <Text style={styles.kycMetricLabel}>AUCTION TIER</Text>
                <Text style={styles.kycMetricValue}>
                  {bidderProfile?.bidderLevel
                    ? bidderProfile.bidderLevel.replace(/_/g, " ").toUpperCase()
                    : "STANDARD VERIFIED"}
                </Text>
                <Text style={styles.kycMetricSub}>
                  Limit: R{Number(bidderProfile?.biddingLimit || 50000).toLocaleString()}
                </Text>
              </View>
              <View style={styles.kycMetricCard}>
                <Text style={styles.kycMetricLabel}>DEPOSIT STATUS</Text>
                <Text
                  style={[
                    styles.kycMetricValue,
                    bidderProfile?.bidderDepositStatus === "paid" && { color: "#34d399" },
                  ]}
                >
                  {bidderProfile?.bidderDepositStatus === "paid"
                    ? `R${Number(bidderProfile.bidderDepositAmount || 5000).toLocaleString()} (Paid)`
                    : bidderProfile?.bidderDepositStatus === "pending"
                    ? "Under Review"
                    : "None Required"}
                </Text>
                <Text style={styles.kycMetricSub}>100% Escrow Protected</Text>
              </View>
            </View>
          )}

          {/* VIP Escrow Upgrade CTA */}
          <TouchableOpacity
            style={styles.kycVipUpgradeBtn}
            onPress={() => navigation.navigate("AuctionVipCheckout", { user })}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={["#2b1f09", "#1a1306", "#0f0c05"]}
              style={styles.kycVipUpgradeGrad}
            >
              <View style={styles.kycVipUpgradeLeft}>
                <Text style={styles.kycVipUpgradeCrown}>👑</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.kycVipUpgradeTitle}>
                    {bidderProfile?.bidderDepositStatus === "paid"
                      ? "VIP Escrow Guarantee Active (R5,000)"
                      : "VIP Bidding Privilege • R5,000 Refundable Escrow"}
                  </Text>
                  <Text style={styles.kycVipUpgradeSub}>
                    {bidderProfile?.bidderDepositStatus === "paid"
                      ? "Escrow deposit held securely. R250,000+ certified bidding limit unlocked."
                      : "Deposit R5,000 into escrow to unlock unlimited auction lots. 100% refundable."}
                  </Text>
                </View>
              </View>
              <View style={styles.kycVipUpgradePill}>
                <Text style={styles.kycVipUpgradePillText}>
                  {bidderProfile?.bidderDepositStatus === "paid" ? "VIEW ESCROW" : "DEPOSIT →"}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Super Coins Loyalty Quick Card */}
        <TouchableOpacity
          style={styles.superCoinsCard}
          activeOpacity={0.88}
          onPress={() => {
            fetchSuperCoinsWallet();
            setIsSuperCoinsModalVisible(true);
          }}
        >
          <LinearGradient
            colors={["#2b1f09", "#17130b", "#0f0d09"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.superCoinsCardGrad}
          >
            <View style={styles.superCoinsHeaderRow}>
              <View style={styles.superCoinsTitleWrap}>
                <View style={styles.coinBadgeIcon}>
                  <Text style={styles.coinBadgeIconText}>🪙</Text>
                </View>
                <View>
                  <Text style={styles.superCoinsBadgeLabel}>GRAND STORE REWARDS</Text>
                  <Text style={styles.superCoinsTitle}>Super Coins Loyalty Balance</Text>
                </View>
              </View>
              <View style={styles.coinRateTag}>
                <Text style={styles.coinRateTagText}>10 Coins = R1.00</Text>
              </View>
            </View>

            <View style={styles.superCoinsValueRow}>
              <View>
                <Text style={styles.superCoinsBigAmount}>
                  {Number(superCoinsWallet.availableCoins || 0).toLocaleString()}
                  <Text style={styles.superCoinsSubUnit}> COINS</Text>
                </Text>
                <Text style={styles.superCoinsRandEquiv}>
                  ≈ R{((superCoinsWallet.availableCoins || 0) * 0.1).toFixed(2)} purchasing power at checkout
                </Text>
              </View>
              <View style={styles.viewWalletBtn}>
                <Text style={styles.viewWalletBtnText}>Wallet ›</Text>
              </View>
            </View>

            <View style={styles.superCoinsFooterRow}>
              <View style={styles.coinFooterStat}>
                <Text style={styles.coinFooterDot}>⏳</Text>
                <Text style={styles.coinFooterText}>
                  Pending: <Text style={styles.coinFooterHighlight}>{superCoinsWallet.pendingCoins || 0} Coins</Text>
                </Text>
              </View>
              <View style={styles.coinFooterStat}>
                <Text style={styles.coinFooterDot}>🛡️</Text>
                <Text style={styles.coinFooterText}>Platform Margin Protected</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* 4 Metric KPI Cards */}
        <View style={styles.kpiGrid}>
          <TouchableOpacity
            style={styles.kpiCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("MyOrders")}
          >
            <Text style={styles.kpiIcon}>📦</Text>
            <Text style={styles.kpiValue}>{ordersCount}</Text>
            <Text style={styles.kpiLabel}>My Orders</Text>
            <Text style={styles.kpiAction}>Track →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.kpiCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Wishlist")}
          >
            <Text style={styles.kpiIcon}>💖</Text>
            <Text style={styles.kpiValue}>{wishlistCount}</Text>
            <Text style={styles.kpiLabel}>Wishlist</Text>
            <Text style={styles.kpiAction}>View →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.kpiCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("MyBids")}
          >
            <Text style={styles.kpiIcon}>🏛️</Text>
            <Text style={styles.kpiValue}>{bidsCount}</Text>
            <Text style={styles.kpiLabel}>Auction Bids</Text>
            <Text style={styles.kpiAction}>Live Room →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.kpiCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("EventTicketPass")}
          >
            <Text style={styles.kpiIcon}>🎟️</Text>
            <Text style={styles.kpiValue}>{ticketsCount}</Text>
            <Text style={styles.kpiLabel}>My Passes</Text>
            <Text style={styles.kpiAction}>Show QR →</Text>
          </TouchableOpacity>
        </View>

        {/* Section: Cellar & Collection */}
        <Text style={styles.sectionHeading}>CELLAR & ACTIVITY</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("MyOrders")}
          >
            <View style={styles.menuIconCircle}>
              <Text style={styles.menuEmoji}>📦</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>My Orders & Shipments</Text>
              <Text style={styles.menuSubtitle}>Track orders, invoices & delivery dates</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("Wishlist")}
          >
            <View style={styles.menuIconCircle}>
              <Text style={styles.menuEmoji}>💖</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Saved Cellar Wishlist</Text>
              <Text style={styles.menuSubtitle}>Your curated collection of rare bottles</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("MyBids")}
          >
            <View style={styles.menuIconCircle}>
              <Text style={styles.menuEmoji}>🏛️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Auction Bids & Won Lots</Text>
              <Text style={styles.menuSubtitle}>Live gavl bids, hammer prices & checkout</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("EventTicketPass")}
          >
            <View style={styles.menuIconCircle}>
              <Text style={styles.menuEmoji}>🎟️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Tasting Passes & Event Tickets</Text>
              <Text style={styles.menuSubtitle}>Digital QR passes for masterclasses</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
            onPress={() => setIsCalendarModalVisible(true)}
          >
            <View style={styles.menuIconCircle}>
              <Text style={styles.menuEmoji}>📅</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Activity Calendar</Text>
              <Text style={styles.menuSubtitle}>Upcoming auction closes & tasting schedules</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Section: Banking & Financials */}
        <Text style={styles.sectionHeading}>FINANCIALS & PAYOUTS</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => {
              fetchBankingData();
              setIsBankModalVisible(true);
            }}
          >
            <View style={styles.menuIconCircle}>
              <Text style={styles.menuEmoji}>🏦</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Bank Account & Payout Details</Text>
              <Text style={styles.menuSubtitle}>
                {bankDetails.accountNumber
                  ? `${bankDetails.bankName || "Bank"} • •••• ${bankDetails.accountNumber.replace(/\s/g, "").slice(-4)}`
                  : "No bank account added • Tap to setup payouts"}
              </Text>
            </View>
            <View style={[styles.manageTag, !bankDetails.accountNumber && { backgroundColor: "rgba(201, 151, 66, 0.15)", borderColor: "#c99742" }]}>
              <Text style={styles.manageTagText}>
                {bankDetails.accountNumber ? "Manage" : "Setup"}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Super Coins Loyalty Wallet */}
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => {
              fetchSuperCoinsWallet();
              setIsSuperCoinsModalVisible(true);
            }}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: "rgba(245, 194, 66, 0.15)" }]}>
              <Text style={styles.menuEmoji}>🪙</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Super Coins Rewards Wallet</Text>
              <Text style={styles.menuSubtitle}>
                {`${superCoinsWallet.availableCoins || 0} coins • R${((superCoinsWallet.availableCoins || 0) * 0.1).toFixed(2)} value • Ledger`}
              </Text>
            </View>
            <View style={styles.rewardPill}>
              <Text style={styles.rewardPillText}>{superCoinsWallet.availableCoins || 0} 🪙</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>

          {/* Pricing & Margin Simulator */}
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => setIsCostingModalVisible(true)}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
              <Text style={styles.menuEmoji}>📊</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Pricing & Protected Margin Engine</Text>
              <Text style={styles.menuSubtitle}>
                15% Grand Store margin formula & vendor payout simulator
              </Text>
            </View>
            <View style={[styles.manageTag, { backgroundColor: "rgba(16, 185, 129, 0.2)", borderColor: "#10b981" }]}>
              <Text style={[styles.manageTagText, { color: "#34d399" }]}>Simulator</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
            onPress={() => {
              fetchReferralDetails();
              setIsReferModalVisible(true);
            }}
          >
            <View style={styles.menuIconCircle}>
              <Text style={styles.menuEmoji}>🎁</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Refer & Earn Bottle Credits</Text>
              <Text style={styles.menuSubtitle}>
                {referralSummary?.rewardBalance
                  ? `Balance: R${referralSummary.rewardBalance} • Invite friends & earn`
                  : "Invite friends and earn R500 credit"}
              </Text>
            </View>
            <View style={styles.rewardPill}>
              <Text style={styles.rewardPillText}>
                R{referralSummary?.rewardBalance ?? user?.rewardBalance ?? 0}
              </Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Section: Account & Security */}
        <Text style={styles.sectionHeading}>ACCOUNT & CONCIERGE</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => setIsPasswordModalVisible(true)}
          >
            <View style={styles.menuIconCircle}>
              <Text style={styles.menuEmoji}>🔒</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Change Password & Security</Text>
              <Text style={styles.menuSubtitle}>Keep your collector account safe</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("ContactUs")}
          >
            <View style={styles.menuIconCircle}>
              <Text style={styles.menuEmoji}>🛎️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Concierge Assistance & Support</Text>
              <Text style={styles.menuSubtitle}>Dedicated sommelier & delivery help</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          activeOpacity={0.8}
          onPress={handleLogout}
        >
          <Text style={styles.logoutBtnText}>Sign Out from Account</Text>
        </TouchableOpacity>

        {/* Version Note */}
        <Text style={styles.versionNote}>
          The Grand Store • Luxury Spirits & Fine Auctions v2.4
        </Text>
      </ScrollView>

      {/* Edit Profile Modal (with Name, Read-only Email, Phone & Password Update) */}
      <Modal
        visible={isEditProfileVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEditProfileVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "88%" }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Collector Profile</Text>
                <Text style={styles.modalSubSmall}>Manage personal details & security</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsEditProfileVisible(false)}
                style={{ padding: 4 }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Full Name"
                placeholderTextColor="#666"
              />

              <View style={styles.labelWithNoteRow}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <Text style={styles.inputNoteReadOnly}>Cannot be changed</Text>
              </View>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={editEmail}
                editable={false}
                placeholder="Email"
                placeholderTextColor="#666"
              />

              <View style={styles.labelWithNoteRow}>
                <Text style={styles.inputLabel}>Mobile Phone</Text>
                <Text style={styles.inputNoteHighlight}>Auto-fills in checkout</Text>
              </View>
              <TextInput
                style={styles.input}
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
                placeholder="+27 82 123 4567"
                placeholderTextColor="#666"
              />
              <Text style={styles.inputSubHelper}>
                Used for courier delivery alerts, dispatch PINs & gate access.
              </Text>

              {/* Password Section Divider */}
              <View style={styles.modalSectionDivider}>
                <View style={styles.modalDividerLine} />
                <Text style={styles.modalSectionTitle}>🔒 SECURITY & PASSWORD UPDATE</Text>
                <View style={styles.modalDividerLine} />
              </View>
              <Text style={styles.passwordNoticeText}>
                Enter current password to set a new password. Leave blank if only updating contact details.
              </Text>

              <Text style={styles.inputLabel}>Current Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInputField]}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor="#666"
                />
                <TouchableOpacity
                  style={styles.passwordToggleBtn}
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  <Text style={styles.passwordToggleIcon}>
                    {showCurrentPassword ? "👁️" : "🔒"}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInputField]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor="#666"
                />
                <TouchableOpacity
                  style={styles.passwordToggleBtn}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <Text style={styles.passwordToggleIcon}>
                    {showNewPassword ? "👁️" : "🔒"}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInputField]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  placeholder="Repeat new password"
                  placeholderTextColor="#666"
                />
                <TouchableOpacity
                  style={styles.passwordToggleBtn}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Text style={styles.passwordToggleIcon}>
                    {showConfirmPassword ? "👁️" : "🔒"}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#0d0d0d" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Save Profile Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bank Details Modal - Fully Dynamic Backend Integration */}
      <Modal
        visible={isBankModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsBankModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.bankModalContent]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 20, marginRight: 8 }}>🏦</Text>
                <View>
                  <Text style={styles.modalTitle}>Banking & Payout Details</Text>
                  <Text style={styles.bankModalSubtitle}>
                    Auction proceeds, bottle consignments & escrow refunds
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.calendarCloseBtn}
                onPress={() => setIsBankModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Segmented Switch: My Payout Account vs Store Wire (EFT) */}
            <View style={styles.bankTabsRow}>
              <TouchableOpacity
                style={[
                  styles.bankTabBtn,
                  bankModalTab === "my_payout" && styles.bankTabBtnActive,
                ]}
                onPress={() => setBankModalTab("my_payout")}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.bankTabText,
                    bankModalTab === "my_payout" && styles.bankTabTextActive,
                  ]}
                >
                  👤 My Payout Account
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.bankTabBtn,
                  bankModalTab === "store_wire" && styles.bankTabBtnActive,
                ]}
                onPress={() => setBankModalTab("store_wire")}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.bankTabText,
                    bankModalTab === "store_wire" && styles.bankTabTextActive,
                  ]}
                >
                  🏛️ Store Wire (EFT)
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              {bankModalTab === "my_payout" ? (
                <View>
                  {/* Status Banner */}
                  <View
                    style={[
                      styles.payoutStatusBanner,
                      !bankDetails.accountNumber && styles.payoutStatusBannerWarn,
                    ]}
                  >
                    <Text style={styles.payoutStatusBannerIcon}>
                      {bankDetails.accountNumber ? "🛡️" : "⚠️"}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.payoutStatusBannerTitle}>
                        {bankDetails.accountNumber
                          ? "Verified for Auction Payouts & Escrow"
                          : "No Payout Account Configured"}
                      </Text>
                      <Text style={styles.payoutStatusBannerDesc}>
                        {bankDetails.accountNumber
                          ? "Proceeds from won bids, consignment bottle sales, and deposit refunds are deposited here."
                          : "Add your bank account to receive automatic auction payouts and refunds."}
                      </Text>
                    </View>
                  </View>

                  {!isEditingBank && bankDetails.accountNumber ? (
                    /* Display Mode: Sleek Gold Metallic Payout Card */
                    <View style={styles.metallicCard}>
                      <View style={styles.metallicCardTop}>
                        <Text style={styles.metallicCardBank}>
                          {bankDetails.bankName || "South African Bank"}
                        </Text>
                        <View style={styles.metallicCardActiveBadge}>
                          <Text style={styles.metallicCardActiveBadgeText}>
                            ACTIVE PAYOUT
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.metallicCardChip}>💳 •)))</Text>

                      <Text style={styles.metallicCardNumber}>
                        •••• •••• •••• {bankDetails.accountNumber.replace(/\s/g, "").slice(-4)}
                      </Text>

                      <View style={styles.metallicCardBottom}>
                        <View>
                          <Text style={styles.metallicCardMetaLabel}>ACCOUNT HOLDER</Text>
                          <Text style={styles.metallicCardMetaValue}>
                            {bankDetails.accountHolder || user?.name || "Collector"}
                          </Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={styles.metallicCardMetaLabel}>BRANCH CODE</Text>
                          <Text style={styles.metallicCardMetaValue}>
                            {bankDetails.branchCode || "Standard"}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.metallicCardEditBtn}
                        onPress={() => {
                          setTempBankDetails({ ...bankDetails });
                          setIsEditingBank(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.metallicCardEditBtnText}>
                          ✏️ Edit Account Details
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    /* Edit / Setup Form Mode */
                    <View style={styles.bankFormBox}>
                      <Text style={styles.inputLabel}>Bank Name</Text>
                      <TextInput
                        style={styles.input}
                        value={tempBankDetails.bankName}
                        onChangeText={(t) =>
                          setTempBankDetails((p) => ({ ...p, bankName: t }))
                        }
                        placeholder="e.g. Standard Bank, FNB, Absa, Nedbank, Capitec"
                        placeholderTextColor="#666"
                      />

                      <Text style={styles.inputLabel}>Account Holder Name</Text>
                      <TextInput
                        style={styles.input}
                        value={tempBankDetails.accountHolder}
                        onChangeText={(t) =>
                          setTempBankDetails((p) => ({ ...p, accountHolder: t }))
                        }
                        placeholder="Full Legal Name on Account"
                        placeholderTextColor="#666"
                      />

                      <Text style={styles.inputLabel}>Account Number</Text>
                      <TextInput
                        style={styles.input}
                        value={tempBankDetails.accountNumber}
                        onChangeText={(t) =>
                          setTempBankDetails((p) => ({ ...p, accountNumber: t }))
                        }
                        placeholder="Account Number"
                        placeholderTextColor="#666"
                        keyboardType="numeric"
                      />

                      <Text style={styles.inputLabel}>Branch Code</Text>
                      <TextInput
                        style={styles.input}
                        value={tempBankDetails.branchCode}
                        onChangeText={(t) =>
                          setTempBankDetails((p) => ({ ...p, branchCode: t }))
                        }
                        placeholder="e.g. 051001 or 250655"
                        placeholderTextColor="#666"
                        keyboardType="numeric"
                      />

                      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                        {bankDetails.accountNumber ? (
                          <TouchableOpacity
                            style={styles.bankCancelBtn}
                            onPress={() => setIsEditingBank(false)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.bankCancelBtnText}>Cancel</Text>
                          </TouchableOpacity>
                        ) : null}

                        <TouchableOpacity
                          style={[styles.modalSubmitBtn, { flex: 1 }]}
                          onPress={handleSaveBankDetails}
                          disabled={savingBank}
                          activeOpacity={0.85}
                        >
                          {savingBank ? (
                            <ActivityIndicator size="small" color="#0a0907" />
                          ) : (
                            <Text style={styles.modalSubmitBtnText}>
                              {bankDetails.accountNumber
                                ? "Save Changes"
                                : "Save Payout Details"}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Dynamic Bidder Escrow & Payout Limits Card */}
                  <View style={styles.escrowStatusBox}>
                    <Text style={styles.escrowStatusTitle}>
                      🏛️ Bidder Escrow & Payout Qualification
                    </Text>
                    <View style={styles.escrowStatusGrid}>
                      <View style={styles.escrowStatusItem}>
                        <Text style={styles.escrowStatusLabel}>BIDDER TIER</Text>
                        <Text style={styles.escrowStatusVal}>
                          {bidderProfile?.bidderLevel
                            ? bidderProfile.bidderLevel.replace(/_/g, " ").toUpperCase()
                            : "LEVEL 1 REGISTERED"}
                        </Text>
                      </View>
                      <View style={styles.escrowStatusItem}>
                        <Text style={styles.escrowStatusLabel}>BIDDING LIMIT</Text>
                        <Text style={styles.escrowStatusVal}>
                          {bidderProfile?.biddingLimit
                            ? `R ${Number(bidderProfile.biddingLimit).toLocaleString()}`
                            : "R 25,000"}
                        </Text>
                      </View>
                      <View style={styles.escrowStatusItem}>
                        <Text style={styles.escrowStatusLabel}>ESCROW DEPOSIT</Text>
                        <Text style={styles.escrowStatusVal}>
                          {bidderProfile?.bidderDepositAmount > 0
                            ? `R ${Number(bidderProfile.bidderDepositAmount).toLocaleString()} (${bidderProfile.bidderDepositStatus || "Held"})`
                            : "R 0 (Standard)"}
                        </Text>
                      </View>
                      <View style={styles.escrowStatusItem}>
                        <Text style={styles.escrowStatusLabel}>CPA TRUST SCORE</Text>
                        <Text style={[styles.escrowStatusVal, { color: "#10b981" }]}>
                          {bidderProfile?.bidderReliabilityScore || 100}% Verified
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ) : (
                /* Tab 2: Grand Store Official Settlement & Wire Details */
                <View style={styles.storeWireBox}>
                  <Text style={styles.storeWireTitle}>
                    Official Grand Store Settlement Account (EFT & Wire)
                  </Text>
                  <Text style={styles.storeWireSub}>
                    Use these verified banking coordinates when paying via Electronic Funds Transfer or International Wire.
                  </Text>

                  <View style={styles.storeWireCard}>
                    <View style={styles.storeWireRow}>
                      <Text style={styles.storeWireLabel}>Bank Name:</Text>
                      <Text style={styles.storeWireValue}>
                        {storeBankDetails.bankName || "Standard Bank"}
                      </Text>
                    </View>
                    <View style={styles.storeWireRow}>
                      <Text style={styles.storeWireLabel}>Account Holder:</Text>
                      <Text style={styles.storeWireValue}>
                        {storeBankDetails.accountName || "The Grand Store PTY LTD"}
                      </Text>
                    </View>
                    <View style={styles.storeWireRow}>
                      <Text style={styles.storeWireLabel}>Account Number:</Text>
                      <Text
                        style={[
                          styles.storeWireValue,
                          {
                            color: "#f5c242",
                            fontWeight: "900",
                            fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                          },
                        ]}
                      >
                        {storeBankDetails.accountNumber || "0123456789"}
                      </Text>
                    </View>
                    <View style={styles.storeWireRow}>
                      <Text style={styles.storeWireLabel}>Branch Code:</Text>
                      <Text style={styles.storeWireValue}>
                        {storeBankDetails.branchCode || "051001"}
                      </Text>
                    </View>
                    {storeBankDetails.accountType ? (
                      <View style={styles.storeWireRow}>
                        <Text style={styles.storeWireLabel}>Account Type:</Text>
                        <Text style={styles.storeWireValue}>
                          {storeBankDetails.accountType}
                        </Text>
                      </View>
                    ) : null}
                    {storeBankDetails.swiftCode ? (
                      <View style={styles.storeWireRow}>
                        <Text style={styles.storeWireLabel}>SWIFT / BIC:</Text>
                        <Text style={styles.storeWireValue}>
                          {storeBankDetails.swiftCode}
                        </Text>
                      </View>
                    ) : null}
                    <View style={[styles.storeWireRow, { borderBottomWidth: 0 }]}>
                      <Text style={styles.storeWireLabel}>Reference Note:</Text>
                      <Text style={[styles.storeWireValue, { color: "#c99742" }]}>
                        {storeBankDetails.referenceNote ||
                          "Use Order ID or Bidder Number as deposit reference"}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.copyWireBtn}
                    onPress={() => {
                      try {
                        if (Clipboard && typeof Clipboard.setString === "function") {
                          Clipboard.setString(storeBankDetails.accountNumber || "0123456789");
                        }
                      } catch (e) {}
                      showMessage("Bank Account Number copied to clipboard!");
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.copyWireBtnText}>
                      📋 Copy Grand Store Account Number
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Activity Calendar Modal - Luxury Interactive Calendar View */}
      <Modal
        visible={isCalendarModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCalendarModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.calendarModalContent]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 20, marginRight: 8 }}>📅</Text>
                <View>
                  <Text style={styles.modalTitle}>Activity Calendar</Text>
                  <Text style={styles.calendarModalSubtitle}>
                    Auction closes, cellar tastings & payouts
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.calendarCloseBtn}
                onPress={() => setIsCalendarModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Calendar Controls: Month Navigation & Today Button */}
            <View style={styles.calendarControlsRow}>
              <TouchableOpacity
                style={styles.monthNavBtn}
                onPress={handlePrevMonth}
                activeOpacity={0.7}
              >
                <Text style={styles.monthNavText}>‹</Text>
              </TouchableOpacity>

              <View style={styles.monthTitleWrap}>
                <Text style={styles.monthTitleText}>
                  {monthNames[calMonth].toUpperCase()} {calYear}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.monthNavBtn}
                onPress={handleNextMonth}
                activeOpacity={0.7}
              >
                <Text style={styles.monthNavText}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.todayPillBtn}
                onPress={handleToday}
                activeOpacity={0.7}
              >
                <Text style={styles.todayPillText}>TODAY</Text>
              </TouchableOpacity>
            </View>

            {/* Weekday Headers */}
            <View style={styles.calendarWeekHeaderRow}>
              {weekDays.map((wd, i) => (
                <View key={i} style={styles.calendarWeekCol}>
                  <Text style={styles.calendarWeekText}>{wd}</Text>
                </View>
              ))}
            </View>

            {/* 7-Column Days Grid via Week Rows */}
            <View style={styles.calendarGrid}>
              {calendarWeeks.map((week, wIdx) => (
                <View key={wIdx} style={styles.calendarWeekRow}>
                  {week.map((item, idx) => {
                    const dayActs = getDayActivities(item);
                    const isSelected = item.isCurrentMonth && selectedCalendarDate === item.day;
                    const isToday = item.isToday;

                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.calendarDayCell,
                          !item.isCurrentMonth && styles.calendarDayCellMuted,
                          isToday && !isSelected && styles.calendarDayCellToday,
                          isSelected && styles.calendarDayCellSelected,
                        ]}
                        onPress={() => {
                          if (!item.isCurrentMonth) return;
                          setSelectedCalendarDate(
                            selectedCalendarDate === item.day ? null : item.day
                          );
                        }}
                        disabled={!item.isCurrentMonth}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.calendarDayNumber,
                            !item.isCurrentMonth && styles.calendarDayNumberMuted,
                            isToday && !isSelected && styles.calendarDayNumberToday,
                            isSelected && styles.calendarDayNumberSelected,
                          ]}
                        >
                          {item.day}
                        </Text>

                        {/* Activity Indicator Dots */}
                        <View style={styles.calendarDotsRow}>
                          {dayActs.slice(0, 3).map((act, dotIdx) => (
                            <View
                              key={dotIdx}
                              style={[
                                styles.calendarDot,
                                { backgroundColor: act.color },
                                isSelected && { borderColor: "#000", borderWidth: 0.5 },
                              ]}
                            />
                          ))}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* Category Legend */}
            <View style={styles.calendarLegendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#ef4444" }]} />
                <Text style={styles.legendText}>Auctions</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#c99742" }]} />
                <Text style={styles.legendText}>Tastings</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#10b981" }]} />
                <Text style={styles.legendText}>Payouts</Text>
              </View>
            </View>

            {/* Selected Date Agenda Header */}
            <View style={styles.agendaHeaderRow}>
              <Text style={styles.agendaTitleText}>
                {selectedCalendarDate
                  ? `${monthNames[calMonth]} ${selectedCalendarDate} Milestones`
                  : `All ${monthNames[calMonth]} Milestones (${visibleActivities.length})`}
              </Text>
              {selectedCalendarDate && (
                <TouchableOpacity
                  onPress={() => setSelectedCalendarDate(null)}
                  style={styles.agendaShowAllBtn}
                >
                  <Text style={styles.agendaShowAllText}>Show All</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Scrollable Agenda List */}
            <ScrollView
              style={{ maxHeight: 175 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 6 }}
            >
              {visibleActivities.length > 0 ? (
                visibleActivities.map((act) => (
                  <TouchableOpacity
                    key={act.id}
                    style={styles.actCard}
                    onPress={() => {
                      setIsCalendarModalVisible(false);
                      act.action();
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.actCardTopRow}>
                      <View style={[styles.actTypeBadge, { borderColor: act.color }]}>
                        <Text style={[styles.actTypeText, { color: act.color }]}>
                          {act.type}
                        </Text>
                      </View>
                      <Text style={styles.actDate}>
                        📅 {act.dateStr} • {act.time}
                      </Text>
                    </View>

                    <Text style={styles.actTitle}>{act.title}</Text>
                    {act.desc ? (
                      <Text style={styles.actDesc} numberOfLines={1}>
                        {act.desc}
                      </Text>
                    ) : null}

                    <View style={styles.actCardBottomRow}>
                      <View style={styles.actBadgePill}>
                        <Text style={styles.actBadgePillText}>{act.badge}</Text>
                      </View>
                      <Text style={styles.actAction}>View Details →</Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noActivitiesBox}>
                  <Text style={styles.noActivitiesEmoji}>🗓️</Text>
                  <Text style={styles.noActivitiesTitle}>No Events on this Date</Text>
                  <Text style={styles.noActivitiesSub}>
                    Tap another highlighted date with a dot to view scheduled sessions.
                  </Text>
                  <TouchableOpacity
                    style={styles.resetCalendarDateBtn}
                    onPress={() => setSelectedCalendarDate(null)}
                  >
                    <Text style={styles.resetCalendarDateBtnText}>
                      View All Month Milestones
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Refer & Earn Modal - Full Original Web Implementation */}
      <Modal
        visible={isReferModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsReferModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "90%", paddingBottom: 12 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 22, marginRight: 8 }}>🎁</Text>
                <View>
                  <Text style={styles.modalTitle}>Refer & Earn</Text>
                  <Text style={styles.modalSubSmall}>Exclusive Cellar Invitation Program</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsReferModalVisible(false)}
                style={{ padding: 4 }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.referSub}>
                Share your referral link with friends. They get a welcome discount, and you get rewarded with cellar credits when they place their first order!
              </Text>

              {/* Referral Link Card */}
              <View style={styles.referralLinkCard}>
                <Text style={styles.referCardLabel}>YOUR REFERRAL LINK</Text>
                <View style={styles.referralLinkRow}>
                  <View style={styles.referralLinkTextWrap}>
                    <Text style={styles.referralLinkText} numberOfLines={1} ellipsizeMode="middle">
                      {referralLink}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.copyLinkBtn, copiedLink && styles.copiedBtn]}
                    onPress={handleCopyLink}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.copyLinkBtnText}>
                      {copiedLink ? "✓ Copied!" : "Copy Link"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Referral Code Card */}
              <View style={styles.referCodeContainer}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.referCodeLabel}>YOUR INVITATION CODE</Text>
                  <Text style={styles.referCodeValue}>{activeReferralCode}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.copyCodeBtn, copiedCode && styles.copiedBtn]}
                  onPress={handleCopyCode}
                  activeOpacity={0.8}
                >
                  <Text style={styles.copyCodeBtnText}>
                    {copiedCode ? "✓ Copied!" : "Copy Code"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Instant Social Share Buttons */}
              <Text style={styles.shareSectionTitle}>SHARE YOUR LINK</Text>
              <View style={styles.shareButtonsRow}>
                <TouchableOpacity
                  style={styles.shareWaBtn}
                  activeOpacity={0.8}
                  onPress={handleShareWhatsApp}
                >
                  <Text style={styles.shareBtnIcon}>💬</Text>
                  <Text style={styles.shareWaText}>WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shareNativeBtn}
                  activeOpacity={0.8}
                  onPress={handleNativeShare}
                >
                  <Text style={styles.shareBtnIcon}>📤</Text>
                  <Text style={styles.shareNativeText}>Share App</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shareEmailBtn}
                  activeOpacity={0.8}
                  onPress={handleShareEmail}
                >
                  <Text style={styles.shareBtnIcon}>✉️</Text>
                  <Text style={styles.shareEmailText}>Email</Text>
                </TouchableOpacity>
              </View>

              {/* 3 Metric KPI Cards (Matching Web ReferralsTab.jsx) */}
              <View style={styles.referKpiRow}>
                <View style={styles.referKpiBox}>
                  <Text style={styles.referKpiEmoji}>👥</Text>
                  <Text style={styles.referKpiNumber}>
                    {referralSummary?.totalSignups ?? 0}
                  </Text>
                  <Text style={styles.referKpiTitle}>Friends</Text>
                </View>

                <View style={styles.referKpiBox}>
                  <Text style={styles.referKpiEmoji}>✅</Text>
                  <Text style={styles.referKpiNumber}>
                    {referralSummary?.successfulReferrals ?? 0}
                  </Text>
                  <Text style={styles.referKpiTitle}>Success</Text>
                </View>

                <LinearGradient
                  colors={["#2f2415", "#18130d"]}
                  style={[styles.referKpiBox, styles.referRewardHighlight]}
                >
                  <Text style={styles.referKpiEmoji}>🎁</Text>
                  <Text style={styles.referRewardNumber}>
                    R{referralSummary?.rewardBalance ?? user.rewardBalance ?? 0}
                  </Text>
                  <Text style={styles.referRewardTitle}>Reward Balance</Text>
                  <Text style={styles.referRewardSub}>Available for checkout</Text>
                </LinearGradient>
              </View>

              {/* Current Program Benefits */}
              <View style={styles.programCard}>
                <Text style={styles.programHeading}>Current Program Benefits</Text>
                <View style={styles.programGrid}>
                  <View style={styles.programBox}>
                    <Text style={styles.programLabel}>YOUR REWARD</Text>
                    <Text style={styles.programValue}>
                      R{programRewardAmount} credit after friend's first paid order
                    </Text>
                  </View>
                  <View style={styles.programBox}>
                    <Text style={styles.programLabel}>FRIEND'S WELCOME DISCOUNT</Text>
                    <Text style={styles.programValue}>
                      R{programWelcomeDiscount} off their first qualifying purchase
                    </Text>
                  </View>
                </View>
              </View>

              {/* How It Works (3 Steps) */}
              <View style={styles.howItWorksCard}>
                <Text style={styles.howItWorksHeading}>How It Works</Text>
                <View style={styles.stepItem}>
                  <View style={styles.stepCircle}>
                    <Text style={styles.stepCircleText}>1</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stepTitle}>Share Link</Text>
                    <Text style={styles.stepDesc}>
                      Send your unique referral link to friends and collectors.
                    </Text>
                  </View>
                </View>

                <View style={styles.stepItem}>
                  <View style={styles.stepCircle}>
                    <Text style={styles.stepCircleText}>2</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stepTitle}>They Sign Up</Text>
                    <Text style={styles.stepDesc}>
                      Your friends get an instant welcome discount applied at checkout.
                    </Text>
                  </View>
                </View>

                <View style={[styles.stepItem, { marginBottom: 0 }]}>
                  <View style={styles.stepCircle}>
                    <Text style={styles.stepCircleText}>3</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stepTitle}>You Get Rewarded</Text>
                    <Text style={styles.stepDesc}>
                      Once their first order is paid, your R{programRewardAmount} balance is credited instantly!
                    </Text>
                  </View>
                </View>
              </View>

              {/* Recent Referrals List */}
              <View style={styles.recentReferralsCard}>
                <Text style={styles.recentReferralsHeading}>Referred Friends Activity</Text>
                {loadingReferrals ? (
                  <ActivityIndicator color="#c99742" style={{ marginVertical: 14 }} />
                ) : referralSummary?.referrals && referralSummary.referrals.length > 0 ? (
                  referralSummary.referrals.map((item, idx) => (
                    <View
                      key={item.id || idx}
                      style={[
                        styles.referralFriendRow,
                        idx === referralSummary.referrals.length - 1 && { borderBottomWidth: 0 },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.referralFriendName}>{item.name}</Text>
                        <Text style={styles.referralFriendDate}>
                          Joined {item.joinedAt ? new Date(item.joinedAt).toLocaleDateString() : "Recently"}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          item.status === "successful"
                            ? styles.statusSuccess
                            : styles.statusPending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            item.status === "successful"
                              ? styles.statusSuccessText
                              : styles.statusPendingText,
                          ]}
                        >
                          {item.status === "successful" ? "✓ SUCCESSFUL" : "⏳ PENDING"}
                        </Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyReferralsBox}>
                    <Text style={styles.emptyReferralsText}>
                      No friends have registered with your link yet. Share now to start earning cellar credits!
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Dedicated Change Password Modal */}
      <Modal
        visible={isPasswordModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsPasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔒 Change Password</Text>
              <TouchableOpacity onPress={() => setIsPasswordModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Current Password</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[styles.input, styles.passwordInputField]}
                value={oldPassword}
                onChangeText={setOldPassword}
                secureTextEntry={!showOldPassword}
                placeholder="Enter current password"
                placeholderTextColor="#666"
              />
              <TouchableOpacity
                style={styles.passwordToggleBtn}
                onPress={() => setShowOldPassword(!showOldPassword)}
              >
                <Text style={styles.passwordToggleIcon}>
                  {showOldPassword ? "👁️" : "🔒"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>New Password</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[styles.input, styles.passwordInputField]}
                value={dedicatedNewPassword}
                onChangeText={setDedicatedNewPassword}
                secureTextEntry={!showDedicatedNewPassword}
                placeholder="At least 6 characters"
                placeholderTextColor="#666"
              />
              <TouchableOpacity
                style={styles.passwordToggleBtn}
                onPress={() => setShowDedicatedNewPassword(!showDedicatedNewPassword)}
              >
                <Text style={styles.passwordToggleIcon}>
                  {showDedicatedNewPassword ? "👁️" : "🔒"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[styles.input, styles.passwordInputField]}
                value={dedicatedConfirmPassword}
                onChangeText={setDedicatedConfirmPassword}
                secureTextEntry={!showDedicatedConfirmPassword}
                placeholder="Repeat new password"
                placeholderTextColor="#666"
              />
              <TouchableOpacity
                style={styles.passwordToggleBtn}
                onPress={() => setShowDedicatedConfirmPassword(!showDedicatedConfirmPassword)}
              >
                <Text style={styles.passwordToggleIcon}>
                  {showDedicatedConfirmPassword ? "👁️" : "🔒"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={handleChangePassword}
              disabled={savingPassword}
            >
              {savingPassword ? (
                <ActivityIndicator color="#0d0d0d" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Super Coins Wallet Modal */}
      <Modal
        visible={isSuperCoinsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsSuperCoinsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "90%", paddingBottom: 16 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 18 }}>🪙</Text>
                  <Text style={styles.modalTitle}>Super Coins Loyalty Wallet</Text>
                </View>
                <Text style={styles.modalSubSmall}>10 Coins = R1.00 • Protected Platform Loyalty</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsSuperCoinsModalVisible(false)}
                style={{ padding: 4 }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Balance Summary 3-Column Card */}
              <View style={styles.coinsBalanceBox}>
                <View style={styles.coinsBalanceCol}>
                  <Text style={styles.coinsBalanceLabel}>AVAILABLE</Text>
                  <Text style={styles.coinsBalanceValGold}>
                    {Number(superCoinsWallet.availableCoins || 0).toLocaleString()}
                  </Text>
                  <Text style={styles.coinsBalanceRand}>
                    ≈ R{((superCoinsWallet.availableCoins || 0) * 0.1).toFixed(2)}
                  </Text>
                </View>

                <View style={styles.coinsBalanceDivider} />

                <View style={styles.coinsBalanceCol}>
                  <Text style={styles.coinsBalanceLabel}>PENDING</Text>
                  <Text style={styles.coinsBalanceValBlue}>
                    {Number(superCoinsWallet.pendingCoins || 0).toLocaleString()}
                  </Text>
                  <Text style={styles.coinsBalanceSub}>7-Day Hold</Text>
                </View>

                <View style={styles.coinsBalanceDivider} />

                <View style={styles.coinsBalanceCol}>
                  <Text style={styles.coinsBalanceLabel}>EXPIRING</Text>
                  <Text style={styles.coinsBalanceValMuted}>
                    {Number(superCoinsWallet.expiringSoonCoins || 0).toLocaleString()}
                  </Text>
                  <Text style={styles.coinsBalanceSub}>12 Mo Valid</Text>
                </View>
              </View>

              {/* Protection & Valuation Rule Banner */}
              <View style={styles.coinsRuleBanner}>
                <Text style={styles.coinsRuleIcon}>💡</Text>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.coinsRuleTitle}>How Super Coins Work</Text>
                  <Text style={styles.coinsRuleDesc}>
                    Earn 10 Super Coins for every R100 spent. Redeem up to 10% on your checkout subtotal. Discounts are 100% funded from Grand Store's 15% platform margin — cellar partners always get full payout!
                  </Text>
                </View>
              </View>

              {/* Filter Tabs */}
              <View style={styles.coinsFilterTabs}>
                {["all", "earned", "redeemed", "pending"].map((tab) => {
                  const isActive = coinsLedgerFilter === tab;
                  return (
                    <TouchableOpacity
                      key={tab}
                      style={[styles.coinsFilterTab, isActive && styles.coinsFilterTabActive]}
                      onPress={() => setCoinsLedgerFilter(tab)}
                    >
                      <Text
                        style={[
                          styles.coinsFilterTabText,
                          isActive && styles.coinsFilterTabTextActive,
                        ]}
                      >
                        {tab.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Ledger List */}
              <View style={styles.coinsLedgerCard}>
                <View style={styles.coinsLedgerHeader}>
                  <Text style={styles.coinsLedgerTitle}>Transaction History</Text>
                  <TouchableOpacity onPress={() => fetchSuperCoinsWallet()}>
                    <Text style={styles.coinsRefreshBtn}>↻ Refresh</Text>
                  </TouchableOpacity>
                </View>

                {loadingCoins ? (
                  <ActivityIndicator color="#c99742" style={{ marginVertical: 20 }} />
                ) : (
                  (() => {
                    const filtered = (superCoinsWallet.transactions || []).filter((tx) => {
                      if (coinsLedgerFilter === "all") return true;
                      if (coinsLedgerFilter === "earned") return tx.type === "earned" || tx.type === "credit";
                      if (coinsLedgerFilter === "redeemed") return tx.type === "redeemed" || tx.type === "debit";
                      if (coinsLedgerFilter === "pending")
                        return tx.type === "pending" || String(tx.status || "").toLowerCase().includes("pending");
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <View style={{ paddingVertical: 24, alignItems: "center" }}>
                          <Text style={{ fontSize: 24, marginBottom: 6 }}>📜</Text>
                          <Text style={{ color: "#8a7e72", fontSize: 12 }}>
                            No transactions found under {coinsLedgerFilter}
                          </Text>
                        </View>
                      );
                    }

                    return filtered.map((item, idx) => {
                      const isEarn = item.type === "earned" || item.type === "credit";
                      const isPending = item.type === "pending" || String(item.status || "").toLowerCase().includes("pending");
                      return (
                        <View
                          key={item.id || idx}
                          style={[
                            styles.coinsTxRow,
                            idx === filtered.length - 1 && { borderBottomWidth: 0 },
                          ]}
                        >
                          <View style={styles.coinsTxIconCircle}>
                            <Text style={{ fontSize: 14 }}>
                              {isPending ? "⏳" : isEarn ? "🪙" : "🛍️"}
                            </Text>
                          </View>
                          <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={styles.coinsTxDesc} numberOfLines={2}>
                              {item.description}
                            </Text>
                            <Text style={styles.coinsTxDate}>{item.date}</Text>
                          </View>
                          <View style={{ alignItems: "flex-end" }}>
                            <Text
                              style={[
                                styles.coinsTxAmount,
                                isPending
                                  ? { color: "#38bdf8" }
                                  : isEarn
                                  ? { color: "#10b981" }
                                  : { color: "#f87171" },
                              ]}
                            >
                              {isEarn || isPending ? "+" : "-"}
                              {Math.abs(item.amount)} Coins
                            </Text>
                            <View
                              style={[
                                styles.coinsTxStatusBadge,
                                isPending
                                  ? { backgroundColor: "rgba(56, 189, 248, 0.15)" }
                                  : isEarn
                                  ? { backgroundColor: "rgba(16, 185, 129, 0.15)" }
                                  : { backgroundColor: "rgba(248, 113, 113, 0.15)" },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.coinsTxStatusText,
                                  isPending
                                    ? { color: "#38bdf8" }
                                    : isEarn
                                    ? { color: "#10b981" }
                                    : { color: "#f87171" },
                                ]}
                              >
                                {item.status || (isEarn ? "Available" : "Redeemed")}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    });
                  })()
                )}
              </View>

              {/* 4-Step Earning & Redemption Guide */}
              <View style={styles.coinsGuideCard}>
                <Text style={styles.coinsGuideTitle}>Loyalty System Blueprint</Text>
                
                <View style={styles.coinsGuideStep}>
                  <View style={styles.coinsGuideStepNum}>
                    <Text style={styles.coinsGuideStepNumText}>1</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.coinsGuideStepHead}>Shop Fine Cellars</Text>
                    <Text style={styles.coinsGuideStepBody}>
                      Earn 10 Super Coins for every R100 spent across verified fine wine, single malts, and collectible bottles.
                    </Text>
                  </View>
                </View>

                <View style={styles.coinsGuideStep}>
                  <View style={styles.coinsGuideStepNum}>
                    <Text style={styles.coinsGuideStepNumText}>2</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.coinsGuideStepHead}>7-Day Inspection Hold</Text>
                    <Text style={styles.coinsGuideStepBody}>
                      Coins remain in Pending status until the 7-day buyer satisfaction and bottle inspection period concludes.
                    </Text>
                  </View>
                </View>

                <View style={styles.coinsGuideStep}>
                  <View style={styles.coinsGuideStepNum}>
                    <Text style={styles.coinsGuideStepNumText}>3</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.coinsGuideStepHead}>10% Margin-Safe Checkout</Text>
                    <Text style={styles.coinsGuideStepBody}>
                      Toggle Super Coins on checkout to instantly save up to 10% on your basket subtotal (10 Coins = R1.00).
                    </Text>
                  </View>
                </View>

                <View style={[styles.coinsGuideStep, { marginBottom: 0 }]}>
                  <View style={styles.coinsGuideStepNum}>
                    <Text style={styles.coinsGuideStepNumText}>4</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.coinsGuideStepHead}>Vendor Payout Protected</Text>
                    <Text style={styles.coinsGuideStepBody}>
                      Discounts are funded 100% by Grand Store's 15% platform commission. The cellar partner receives their full agreed payout.
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Pricing & Costing Engine Simulator Modal (Matches Costing GS understanding.docx) */}
      <Modal
        visible={isCostingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCostingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "90%", paddingBottom: 16 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 18 }}>📊</Text>
                  <Text style={styles.modalTitle}>Pricing & Margin Simulator</Text>
                </View>
                <Text style={styles.modalSubSmall}>
                  Selling Price = (Cost × (1 + Profit%)) ÷ (1 - Margin%)
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsCostingModalVisible(false)}
                style={{ padding: 4 }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Formula Banner */}
              <View style={styles.formulaBanner}>
                <Text style={styles.formulaBannerFormula}>
                  Selling Price = (Product Cost × (1 + Vendor Profit %)) ÷ (1 - 0.15)
                </Text>
                <Text style={styles.formulaBannerSub}>
                  Grand Store protects a fixed 15% platform margin on all transactions while guaranteeing the vendor their full cost + desired profit margin.
                </Text>
              </View>

              {/* Simulator Inputs */}
              <View style={styles.simInputSection}>
                <Text style={styles.inputLabel}>Product Base Cost (R)</Text>
                <TextInput
                  style={styles.input}
                  value={simulatorCost}
                  onChangeText={setSimulatorCost}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 1000"
                  placeholderTextColor="#666"
                />
                <View style={styles.chipRow}>
                  {["500", "1000", "2500", "5000"].map((amt) => (
                    <TouchableOpacity
                      key={amt}
                      style={[styles.simChip, simulatorCost === amt && styles.simChipActive]}
                      onPress={() => setSimulatorCost(amt)}
                    >
                      <Text style={[styles.simChipText, simulatorCost === amt && styles.simChipTextActive]}>
                        R{amt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Vendor Profit Margin (%)</Text>
                <TextInput
                  style={styles.input}
                  value={simulatorProfitPct}
                  onChangeText={setSimulatorProfitPct}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 25"
                  placeholderTextColor="#666"
                />
                <View style={styles.chipRow}>
                  {["15", "20", "25", "30"].map((pct) => (
                    <TouchableOpacity
                      key={pct}
                      style={[styles.simChip, simulatorProfitPct === pct && styles.simChipActive]}
                      onPress={() => setSimulatorProfitPct(pct)}
                    >
                      <Text style={[styles.simChipText, simulatorProfitPct === pct && styles.simChipTextActive]}>
                        {pct}%
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Calculated Outputs */}
              {(() => {
                const cost = parseFloat(simulatorCost) || 0;
                const profitPct = parseFloat(simulatorProfitPct) || 0;
                const vendorProfit = cost * (profitPct / 100);
                const vendorPayout = cost + vendorProfit;
                const platformMarginPct = 0.15;
                const sellingPrice = vendorPayout / (1 - platformMarginPct);
                const platformFee = sellingPrice - vendorPayout;
                const effectiveGrandStoreMargin = sellingPrice > 0 ? (platformFee / sellingPrice) * 100 : 15;

                return (
                  <View style={styles.simResultCard}>
                    <Text style={styles.simResultHeading}>LIVE FINANCIAL ARCHITECTURE</Text>

                    {/* Shelf Selling Price Highlight */}
                    <View style={styles.simSellingPriceCard}>
                      <Text style={styles.simSellingPriceLabel}>FINAL SHELF SELLING PRICE</Text>
                      <Text style={styles.simSellingPriceVal}>
                        R{Number(sellingPrice || 0).toFixed(2)}
                      </Text>
                      <Text style={styles.simSellingPriceSub}>Price displayed to collectors on storefront</Text>
                    </View>

                    {/* Breakdown Rows */}
                    <View style={styles.simBreakdownRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text>🍷</Text>
                        <Text style={styles.simBreakdownLabel}>Base Product Cost</Text>
                      </View>
                      <Text style={styles.simBreakdownVal}>R{cost.toFixed(2)}</Text>
                    </View>

                    <View style={styles.simBreakdownRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text>📈</Text>
                        <Text style={styles.simBreakdownLabel}>Vendor Profit ({profitPct}%)</Text>
                      </View>
                      <Text style={[styles.simBreakdownVal, { color: "#10b981" }]}>
                        +R{vendorProfit.toFixed(2)}
                      </Text>
                    </View>

                    <View style={[styles.simBreakdownRow, styles.simHighlightRow]}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text>🤝</Text>
                        <Text style={[styles.simBreakdownLabel, { color: "#f5c242", fontWeight: "700" }]}>
                          Guaranteed Vendor Payout
                        </Text>
                      </View>
                      <Text style={[styles.simBreakdownVal, { color: "#f5c242", fontWeight: "800" }]}>
                        R{vendorPayout.toFixed(2)}
                      </Text>
                    </View>

                    <View style={styles.simBreakdownRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text>🏛️</Text>
                        <Text style={styles.simBreakdownLabel}>
                          Grand Store Margin ({effectiveGrandStoreMargin.toFixed(1)}%)
                        </Text>
                      </View>
                      <Text style={styles.simBreakdownVal}>R{platformFee.toFixed(2)}</Text>
                    </View>

                    {/* Who Pays What Grid (from Costing GS understanding.docx) */}
                    <View style={styles.whoPaysBox}>
                      <Text style={styles.whoPaysTitle}>Who Pays What? Platform Rules</Text>

                      <View style={styles.whoPaysItem}>
                        <Text style={styles.whoPaysItemTitle}>🚚 Courier & Logistics</Text>
                        <Text style={styles.whoPaysItemBody}>
                          Customer pays at checkout (Door Delivery R180 or PostNet Counter-to-Counter R109).
                        </Text>
                      </View>

                      <View style={styles.whoPaysItem}>
                        <Text style={styles.whoPaysItemTitle}>🪙 Super Coins Discounts</Text>
                        <Text style={styles.whoPaysItemBody}>
                          Funded 100% by Grand Store from its 15% platform margin. Vendor payout is never docked!
                        </Text>
                      </View>

                      <View style={styles.whoPaysItem}>
                        <Text style={styles.whoPaysItemTitle}>💳 Payment Gateway (2.5%)</Text>
                        <Text style={styles.whoPaysItemBody}>
                          Absorbed by platform operations to maintain seamless PayFast/Ozow instant checkout.
                        </Text>
                      </View>

                      <View style={[styles.whoPaysItem, { marginBottom: 0 }]}>
                        <Text style={styles.whoPaysItemTitle}>🔒 CPA Escrow Protection</Text>
                        <Text style={styles.whoPaysItemBody}>
                          Buyer funds held in escrow and released to vendor bank account 7 days post-delivery.
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 18+ Legal Age & Identity Verification Modal (Admin-Configured Fields) */}
      <BidderVerificationModal
        visible={isVerificationModalVisible}
        onClose={() => setIsVerificationModalVisible(false)}
        onSuccess={() => {
          setIsVerificationModalVisible(false);
          loadUserData();
        }}
        user={user}
        token={userToken}
        bidderProfile={bidderProfile}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0d",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#111111",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(201, 151, 66, 0.2)",
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f5c242",
    fontFamily: APP_FONT,
    letterSpacing: 0.5,
  },
  editHeaderBtn: {
    backgroundColor: "rgba(201, 151, 66, 0.15)",
    borderWidth: 1,
    borderColor: "#c99742",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  editHeaderBtnText: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "700",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  profileCard: {
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.2,
    borderColor: "rgba(201, 151, 66, 0.35)",
    marginBottom: 14,
  },
  avatarWrap: {
    position: "relative",
    marginRight: 16,
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: "#c99742",
  },
  vipDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10b981",
    borderWidth: 2,
    borderColor: "#0d0d0d",
  },
  profileInfo: {
    flex: 1,
  },
  vipBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(201, 151, 66, 0.2)",
    borderWidth: 1,
    borderColor: "#c99742",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  vipBadgeText: {
    color: "#f5c242",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  profileName: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 2,
  },
  profileEmail: {
    color: "#9ca3af",
    fontSize: 12,
    marginBottom: 2,
  },
  profilePhone: {
    color: "#d4af37",
    fontSize: 12,
    fontWeight: "600",
  },
  kycCardContainer: {
    backgroundColor: "#110f0c",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.35)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  kycHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    paddingBottom: 12,
    marginBottom: 12,
  },
  kycHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  kycHeaderBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  kycHeaderBadgeVerified: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.4)",
  },
  kycHeaderBadgePending: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
  },
  kycHeaderBadgeRejected: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  kycHeaderBadgeUnverified: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  kycHeaderBadgeIcon: {
    fontSize: 18,
  },
  kycHeaderTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  kycHeaderSubtitle: {
    color: "#888",
    fontSize: 10.5,
    marginTop: 2,
  },
  kycStatusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  kycStatusTagVerified: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.35)",
  },
  kycStatusTagPending: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.35)",
  },
  kycStatusTagRejected: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.35)",
  },
  kycStatusTagUnverified: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  kycStatusTagText: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  kycStatusTagTextVerified: {
    color: "#34d399",
  },
  kycStatusTagTextPending: {
    color: "#fbbf24",
  },
  kycStatusTagTextRejected: {
    color: "#f87171",
  },
  kycStatusTagTextUnverified: {
    color: "#aaa",
  },
  kycUnregisteredWrap: {
    paddingTop: 2,
  },
  kycExplainerText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 12,
  },
  kycBenefitsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  kycBenefitCard: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    padding: 10,
  },
  kycBenefitTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  kycBenefitIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  kycBenefitTitle: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "700",
    flex: 1,
  },
  kycBenefitDesc: {
    color: "#888",
    fontSize: 10,
    lineHeight: 14,
    marginBottom: 6,
  },
  kycBenefitBadge: {
    color: "#34d399",
    fontSize: 9.5,
    fontWeight: "800",
  },
  kycVerifyBtn: {
    backgroundColor: "#c99742",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#c99742",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  kycVerifyBtnText: {
    color: "#000",
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  kycPendingBox: {
    backgroundColor: "rgba(245, 158, 11, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
    borderRadius: 12,
    padding: 12,
  },
  kycPendingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  kycPendingIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  kycPendingTitle: {
    color: "#fbbf24",
    fontSize: 12,
    fontWeight: "700",
  },
  kycPendingDesc: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 11,
    lineHeight: 15,
  },
  kycBidderNumberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(245, 158, 11, 0.15)",
  },
  kycBidderNumberLabel: {
    color: "#888",
    fontSize: 10.5,
    marginRight: 6,
  },
  kycBidderNumberValue: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  kycRejectedBox: {
    backgroundColor: "rgba(239, 68, 68, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    borderRadius: 12,
    padding: 12,
  },
  kycRejectedHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  kycRejectedIcon: {
    fontSize: 14,
    marginRight: 6,
    color: "#f87171",
  },
  kycRejectedTitle: {
    color: "#f87171",
    fontSize: 12,
    fontWeight: "700",
  },
  kycRejectedDesc: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 10,
  },
  kycResubmitBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  kycResubmitBtnText: {
    color: "#f87171",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  kycVerifiedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  kycMetricCard: {
    width: "48.5%",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 10,
    padding: 10,
  },
  kycMetricLabel: {
    color: "#777",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  kycMetricValue: {
    color: "#fff",
    fontSize: 11.5,
    fontWeight: "700",
  },
  kycMetricValueSuccess: {
    color: "#34d399",
    fontSize: 11.5,
    fontWeight: "800",
  },
  kycMetricValueGold: {
    color: "#f5c242",
    fontSize: 12,
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  kycMetricSub: {
    color: "#666",
    fontSize: 9.5,
    marginTop: 2,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 10,
  },
  kpiCard: {
    width: (width - 42) / 2,
    backgroundColor: "#16130f",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
    borderRadius: 12,
    padding: 14,
  },
  kpiIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  kpiValue: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
  },
  kpiLabel: {
    color: "#a8a29e",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  kpiAction: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
  },
  sectionHeading: {
    color: "#8a7e72",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 8,
  },
  menuGroup: {
    backgroundColor: "#14120e",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 16,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  menuIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(201, 151, 66, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  menuEmoji: {
    fontSize: 18,
  },
  menuTitle: {
    color: "#f3f4f6",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  menuSubtitle: {
    color: "#857e74",
    fontSize: 11,
  },
  menuChevron: {
    color: "#8a7e72",
    fontSize: 20,
    fontWeight: "300",
    marginLeft: 8,
  },
  manageTag: {
    backgroundColor: "rgba(201, 151, 66, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  manageTagText: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "700",
  },
  logoutBtn: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: "rgba(239, 68, 68, 0.5)",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    alignItems: "center",
  },
  logoutBtnText: {
    color: "#f87171",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  versionNote: {
    textAlign: "center",
    color: "#524d46",
    fontSize: 10,
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#16130f",
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: "rgba(201, 151, 66, 0.4)",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    color: "#f5c242",
    fontSize: 17,
    fontWeight: "800",
  },
  modalCloseText: {
    color: "#9ca3af",
    fontSize: 18,
    fontWeight: "800",
    padding: 4,
  },
  modalSub: {
    color: "#a8a29e",
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 14,
  },
  modalSubSmall: {
    color: "#8a7e72",
    fontSize: 11,
    marginTop: 2,
  },
  labelWithNoteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  inputNoteReadOnly: {
    color: "#ef4444",
    fontSize: 10,
    fontWeight: "700",
  },
  inputNoteHighlight: {
    color: "#f5c242",
    fontSize: 10,
    fontWeight: "600",
  },
  inputDisabled: {
    backgroundColor: "#13100c",
    borderColor: "rgba(255, 255, 255, 0.1)",
    color: "#737373",
  },
  inputSubHelper: {
    color: "#78716c",
    fontSize: 10,
    lineHeight: 14,
    marginTop: 4,
    marginBottom: 6,
  },
  modalSectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 14,
  },
  modalDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(201, 151, 66, 0.25)",
  },
  modalSectionTitle: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginHorizontal: 8,
  },
  passwordNoticeText: {
    color: "#8a7e72",
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 10,
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInputField: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  passwordToggleBtn: {
    backgroundColor: "#16130f",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: "rgba(201, 151, 66, 0.3)",
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  passwordToggleIcon: {
    fontSize: 14,
  },
  rewardPill: {
    backgroundColor: "rgba(201, 151, 66, 0.2)",
    borderWidth: 1,
    borderColor: "#c99742",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rewardPillText: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "800",
  },
  referSub: {
    color: "#d4cfc7",
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  referralLinkCard: {
    backgroundColor: "#110e0b",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.3)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  referCardLabel: {
    color: "#8a7e72",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  referralLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  referralLinkTextWrap: {
    flex: 1,
    backgroundColor: "#080706",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  referralLinkText: {
    color: "#e5e5e5",
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  copyLinkBtn: {
    backgroundColor: "#c99742",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  copyLinkBtnText: {
    color: "#0d0d0d",
    fontSize: 11,
    fontWeight: "800",
  },
  copiedBtn: {
    backgroundColor: "#10b981",
  },
  referCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#110e0b",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#c99742",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  referCodeLabel: {
    color: "#8a7e72",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  referCodeValue: {
    color: "#f5c242",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginTop: 2,
  },
  copyCodeBtn: {
    backgroundColor: "rgba(201, 151, 66, 0.18)",
    borderWidth: 1,
    borderColor: "#c99742",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyCodeBtnText: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "800",
  },
  shareSectionTitle: {
    color: "#8a7e72",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
  },
  shareButtonsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  shareWaBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#128C7E",
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  shareWaText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  shareNativeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(201, 151, 66, 0.18)",
    borderWidth: 1,
    borderColor: "#c99742",
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  shareNativeText: {
    color: "#f5c242",
    fontSize: 12,
    fontWeight: "700",
  },
  shareEmailBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1c1917",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  shareEmailText: {
    color: "#d4cfc7",
    fontSize: 12,
    fontWeight: "700",
  },
  shareBtnIcon: {
    fontSize: 14,
  },
  referKpiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  referKpiBox: {
    flex: 1,
    backgroundColor: "#110e0b",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  referKpiEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  referKpiNumber: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },
  referKpiTitle: {
    color: "#8a7e72",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
    textAlign: "center",
  },
  referRewardHighlight: {
    borderWidth: 1.2,
    borderColor: "rgba(201, 151, 66, 0.5)",
  },
  referRewardNumber: {
    color: "#f5c242",
    fontSize: 18,
    fontWeight: "900",
  },
  referRewardTitle: {
    color: "#f5c242",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 2,
    textAlign: "center",
  },
  referRewardSub: {
    color: "#8a7e72",
    fontSize: 8,
    textAlign: "center",
    marginTop: 2,
  },
  programCard: {
    backgroundColor: "#110e0b",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 12,
    marginBottom: 14,
  },
  programHeading: {
    color: "#f3f4f6",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  programGrid: {
    flexDirection: "row",
    gap: 8,
  },
  programBox: {
    flex: 1,
    backgroundColor: "#080706",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  programLabel: {
    color: "#8a7e72",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  programValue: {
    color: "#e5e5e5",
    fontSize: 11,
    lineHeight: 15,
  },
  howItWorksCard: {
    backgroundColor: "#110e0b",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 12,
    marginBottom: 14,
  },
  howItWorksHeading: {
    color: "#f3f4f6",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 10,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(201, 151, 66, 0.2)",
    borderWidth: 1,
    borderColor: "#c99742",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  stepCircleText: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "800",
  },
  stepTitle: {
    color: "#f5c242",
    fontSize: 12,
    fontWeight: "700",
  },
  stepDesc: {
    color: "#a8a29e",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  recentReferralsCard: {
    backgroundColor: "#110e0b",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 12,
    marginBottom: 10,
  },
  recentReferralsHeading: {
    color: "#f3f4f6",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  referralFriendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  referralFriendName: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  referralFriendDate: {
    color: "#78716c",
    fontSize: 10,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "#10b981",
  },
  statusPending: {
    backgroundColor: "rgba(245, 194, 66, 0.15)",
    borderWidth: 1,
    borderColor: "#f5c242",
  },
  statusText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  statusSuccessText: {
    color: "#34d399",
  },
  statusPendingText: {
    color: "#f5c242",
  },
  emptyReferralsBox: {
    paddingVertical: 12,
    alignItems: "center",
  },
  emptyReferralsText: {
    color: "#78716c",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
  inputLabel: {
    color: "#d6d3d1",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#0d0b09",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.3)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: "#ffffff",
    fontSize: 13,
  },
  modalSubmitBtn: {
    backgroundColor: "#c99742",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 18,
  },
  modalSubmitBtnText: {
    color: "#0d0d0d",
    fontSize: 14,
    fontWeight: "800",
  },
  actCard: {
    backgroundColor: "#0d0b09",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 12,
    marginBottom: 10,
  },
  actTypeBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 6,
  },
  actTypeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  actTitle: {
    color: "#ffffff",
    fontSize: 13.5,
    fontWeight: "700",
    marginBottom: 2,
  },
  actDate: {
    color: "#9ca3af",
    fontSize: 10.5,
  },
  actAction: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "800",
  },
  calendarModalContent: {
    maxHeight: "92%",
    padding: 16,
  },
  calendarModalSubtitle: {
    color: "#8a7e72",
    fontSize: 10.5,
    marginTop: 1,
  },
  calendarCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  calendarControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#110e0b",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.2)",
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginVertical: 10,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(201, 151, 66, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  monthNavText: {
    color: "#f5c242",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 22,
  },
  monthTitleWrap: {
    flex: 1,
    alignItems: "center",
  },
  monthTitleText: {
    color: "#ffffff",
    fontSize: 13.5,
    fontWeight: "800",
    letterSpacing: 1,
  },
  todayPillBtn: {
    backgroundColor: "rgba(201, 151, 66, 0.18)",
    borderWidth: 1,
    borderColor: "#c99742",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  todayPillText: {
    color: "#f5c242",
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  calendarWeekHeaderRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    marginBottom: 4,
  },
  calendarWeekCol: {
    flex: 1,
    alignItems: "center",
  },
  calendarWeekText: {
    color: "#8a7e72",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  calendarGrid: {
    marginBottom: 8,
  },
  calendarWeekRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  calendarDayCell: {
    flex: 1,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
    marginHorizontal: 1.5,
    borderRadius: 8,
  },
  calendarDayCellMuted: {
    opacity: 0.25,
  },
  calendarDayCellToday: {
    borderWidth: 1,
    borderColor: "#c99742",
  },
  calendarDayCellSelected: {
    backgroundColor: "#c99742",
  },
  calendarDayNumber: {
    color: "#e5e5e5",
    fontSize: 12,
    fontWeight: "700",
  },
  calendarDayNumberMuted: {
    color: "#666",
  },
  calendarDayNumberToday: {
    color: "#f5c242",
    fontWeight: "900",
  },
  calendarDayNumberSelected: {
    color: "#0a0907",
    fontWeight: "900",
  },
  calendarDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 5,
    marginTop: 1,
    gap: 2,
  },
  calendarDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  calendarLegendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    marginBottom: 10,
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  legendText: {
    color: "#9ca3af",
    fontSize: 10,
    fontWeight: "600",
  },
  agendaHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  agendaTitleText: {
    color: "#f5c242",
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  agendaShowAllBtn: {
    backgroundColor: "rgba(201, 151, 66, 0.12)",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 4,
  },
  agendaShowAllText: {
    color: "#e8c566",
    fontSize: 9.5,
    fontWeight: "700",
  },
  actCardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  actDesc: {
    color: "#8a7e72",
    fontSize: 10.5,
    lineHeight: 14,
    marginBottom: 6,
  },
  actCardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  actBadgePill: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actBadgePillText: {
    color: "#d4af37",
    fontSize: 9,
    fontWeight: "700",
  },
  noActivitiesBox: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  noActivitiesEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  noActivitiesTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  noActivitiesSub: {
    color: "#78716c",
    fontSize: 10.5,
    textAlign: "center",
    marginBottom: 10,
  },
  resetCalendarDateBtn: {
    backgroundColor: "rgba(201, 151, 66, 0.15)",
    borderWidth: 1,
    borderColor: "#c99742",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  resetCalendarDateBtnText: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "800",
  },
  referCodeBox: {
    backgroundColor: "#0d0b09",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#c99742",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginVertical: 14,
  },
  referCodeText: {
    color: "#f5c242",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2,
  },
  bankModalContent: {
    maxHeight: "92%",
    padding: 16,
  },
  bankModalSubtitle: {
    color: "#8a7e72",
    fontSize: 10.5,
    marginTop: 1,
  },
  bankTabsRow: {
    flexDirection: "row",
    backgroundColor: "#0d0b09",
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.2)",
    marginBottom: 12,
  },
  bankTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  bankTabBtnActive: {
    backgroundColor: "rgba(201, 151, 66, 0.22)",
    borderWidth: 1,
    borderColor: "#c99742",
  },
  bankTabText: {
    color: "#888",
    fontSize: 11,
    fontWeight: "700",
  },
  bankTabTextActive: {
    color: "#f5c242",
    fontWeight: "800",
  },
  payoutStatusBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  payoutStatusBannerWarn: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  payoutStatusBannerIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  payoutStatusBannerTitle: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 2,
  },
  payoutStatusBannerDesc: {
    color: "#9ca3af",
    fontSize: 10,
    lineHeight: 14,
  },
  metallicCard: {
    backgroundColor: "#1c1711",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(201, 151, 66, 0.4)",
    padding: 16,
    marginBottom: 14,
  },
  metallicCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  metallicCardBank: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  metallicCardActiveBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "#10b981",
    borderWidth: 0.8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metallicCardActiveBadgeText: {
    color: "#10b981",
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  metallicCardChip: {
    color: "#c99742",
    fontSize: 18,
    marginBottom: 8,
  },
  metallicCardNumber: {
    color: "#f5c242",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 14,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  metallicCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    paddingTop: 8,
    marginBottom: 10,
  },
  metallicCardMetaLabel: {
    color: "#8a7e72",
    fontSize: 8.5,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metallicCardMetaValue: {
    color: "#e5e5e5",
    fontSize: 11.5,
    fontWeight: "700",
  },
  metallicCardEditBtn: {
    backgroundColor: "rgba(201, 151, 66, 0.15)",
    borderWidth: 1,
    borderColor: "#c99742",
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: "center",
    marginTop: 4,
  },
  metallicCardEditBtnText: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "800",
  },
  bankFormBox: {
    backgroundColor: "#0d0b09",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.2)",
    marginBottom: 14,
  },
  bankCancelBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bankCancelBtnText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "700",
  },
  escrowStatusBox: {
    backgroundColor: "#0f0d0b",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.2)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  escrowStatusTitle: {
    color: "#f5c242",
    fontSize: 11.5,
    fontWeight: "800",
    marginBottom: 10,
    letterSpacing: 0.4,
  },
  escrowStatusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  escrowStatusItem: {
    width: "48%",
    backgroundColor: "#16130f",
    borderRadius: 8,
    padding: 8,
    borderWidth: 0.8,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  escrowStatusLabel: {
    color: "#78716c",
    fontSize: 8.5,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  escrowStatusVal: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  storeWireBox: {
    paddingVertical: 4,
  },
  storeWireTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 4,
  },
  storeWireSub: {
    color: "#8a7e72",
    fontSize: 10.5,
    lineHeight: 15,
    marginBottom: 12,
  },
  storeWireCard: {
    backgroundColor: "#0d0b09",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
    padding: 12,
    marginBottom: 12,
  },
  storeWireRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  storeWireLabel: {
    color: "#8a7e72",
    fontSize: 10.5,
    fontWeight: "600",
  },
  storeWireValue: {
    color: "#e5e5e5",
    fontSize: 11,
    fontWeight: "700",
  },
  copyWireBtn: {
    backgroundColor: "rgba(201, 151, 66, 0.15)",
    borderWidth: 1,
    borderColor: "#c99742",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  copyWireBtnText: {
    color: "#f5c242",
    fontSize: 12,
    fontWeight: "800",
  },
  // Super Coins Loyalty Card Styles
  superCoinsCard: {
    borderRadius: 14,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1.2,
    borderColor: "rgba(201, 151, 66, 0.45)",
  },
  superCoinsCardGrad: {
    padding: 16,
  },
  superCoinsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  superCoinsTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  coinBadgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(201, 151, 66, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#c99742",
  },
  coinBadgeIconText: {
    fontSize: 16,
  },
  superCoinsBadgeLabel: {
    color: "#c99742",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  superCoinsTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  coinRateTag: {
    backgroundColor: "rgba(201, 151, 66, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.8,
    borderColor: "rgba(201, 151, 66, 0.4)",
  },
  coinRateTagText: {
    color: "#f5c242",
    fontSize: 10,
    fontWeight: "700",
  },
  superCoinsValueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  superCoinsBigAmount: {
    color: "#f5c242",
    fontSize: 26,
    fontWeight: "900",
  },
  superCoinsSubUnit: {
    color: "#c99742",
    fontSize: 13,
    fontWeight: "700",
  },
  superCoinsRandEquiv: {
    color: "#a8a29e",
    fontSize: 11,
    marginTop: 2,
  },
  viewWalletBtn: {
    backgroundColor: "rgba(201, 151, 66, 0.2)",
    borderWidth: 1,
    borderColor: "#c99742",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewWalletBtnText: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "800",
  },
  superCoinsFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  coinFooterStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  coinFooterDot: {
    fontSize: 11,
  },
  coinFooterText: {
    color: "#8a7e72",
    fontSize: 10.5,
  },
  coinFooterHighlight: {
    color: "#38bdf8",
    fontWeight: "700",
  },

  // Super Coins Modal Styles
  coinsBalanceBox: {
    flexDirection: "row",
    backgroundColor: "#0e0c0a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.3)",
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 12,
    alignItems: "center",
  },
  coinsBalanceCol: {
    flex: 1,
    alignItems: "center",
  },
  coinsBalanceDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  coinsBalanceLabel: {
    color: "#8a7e72",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  coinsBalanceValGold: {
    color: "#f5c242",
    fontSize: 18,
    fontWeight: "900",
  },
  coinsBalanceValBlue: {
    color: "#38bdf8",
    fontSize: 18,
    fontWeight: "900",
  },
  coinsBalanceValMuted: {
    color: "#9ca3af",
    fontSize: 18,
    fontWeight: "900",
  },
  coinsBalanceRand: {
    color: "#10b981",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 1,
  },
  coinsBalanceSub: {
    color: "#6b7280",
    fontSize: 10,
    marginTop: 1,
  },
  coinsRuleBanner: {
    flexDirection: "row",
    backgroundColor: "rgba(201, 151, 66, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    alignItems: "center",
  },
  coinsRuleIcon: {
    fontSize: 18,
  },
  coinsRuleTitle: {
    color: "#f5c242",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 2,
  },
  coinsRuleDesc: {
    color: "#a8a29e",
    fontSize: 10.5,
    lineHeight: 15,
  },
  coinsFilterTabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  coinsFilterTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#16130f",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
  },
  coinsFilterTabActive: {
    backgroundColor: "rgba(201, 151, 66, 0.2)",
    borderColor: "#c99742",
  },
  coinsFilterTabText: {
    color: "#8a7e72",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  coinsFilterTabTextActive: {
    color: "#f5c242",
    fontWeight: "800",
  },
  coinsLedgerCard: {
    backgroundColor: "#110f0c",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
    padding: 12,
    marginBottom: 14,
  },
  coinsLedgerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  coinsLedgerTitle: {
    color: "#f3f4f6",
    fontSize: 12,
    fontWeight: "800",
  },
  coinsRefreshBtn: {
    color: "#c99742",
    fontSize: 11,
    fontWeight: "700",
  },
  coinsTxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.04)",
  },
  coinsTxIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  coinsTxDesc: {
    color: "#f3f4f6",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
  },
  coinsTxDate: {
    color: "#6b7280",
    fontSize: 9.5,
  },
  coinsTxAmount: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 2,
  },
  coinsTxStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  coinsTxStatusText: {
    fontSize: 8.5,
    fontWeight: "800",
  },
  coinsGuideCard: {
    backgroundColor: "#0d0b09",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
    padding: 12,
    marginBottom: 10,
  },
  coinsGuideTitle: {
    color: "#f5c242",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 10,
    letterSpacing: 0.4,
  },
  coinsGuideStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 10,
  },
  coinsGuideStepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(201, 151, 66, 0.25)",
    borderWidth: 1,
    borderColor: "#c99742",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  coinsGuideStepNumText: {
    color: "#f5c242",
    fontSize: 10,
    fontWeight: "800",
  },
  coinsGuideStepHead: {
    color: "#f3f4f6",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 2,
  },
  coinsGuideStepBody: {
    color: "#8a7e72",
    fontSize: 10,
    lineHeight: 14,
  },

  // Costing Simulator Styles
  formulaBanner: {
    backgroundColor: "rgba(201, 151, 66, 0.1)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.35)",
    padding: 12,
    marginBottom: 14,
  },
  formulaBannerFormula: {
    color: "#f5c242",
    fontSize: 11.5,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
  },
  formulaBannerSub: {
    color: "#a8a29e",
    fontSize: 10,
    lineHeight: 14,
    textAlign: "center",
  },
  simInputSection: {
    backgroundColor: "#14120e",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 14,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  simChip: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#1e1a14",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
    alignItems: "center",
  },
  simChipActive: {
    backgroundColor: "rgba(201, 151, 66, 0.3)",
    borderColor: "#c99742",
  },
  simChipText: {
    color: "#8a7e72",
    fontSize: 10,
    fontWeight: "700",
  },
  simChipTextActive: {
    color: "#f5c242",
    fontWeight: "800",
  },
  simResultCard: {
    backgroundColor: "#110e0a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.3)",
    padding: 14,
    marginBottom: 12,
  },
  simResultHeading: {
    color: "#f5c242",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 10,
    textAlign: "center",
  },
  simSellingPriceCard: {
    backgroundColor: "#19150f",
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: "#c99742",
    padding: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  simSellingPriceLabel: {
    color: "#a8a29e",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  simSellingPriceVal: {
    color: "#f5c242",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 2,
  },
  simSellingPriceSub: {
    color: "#8a7e72",
    fontSize: 10,
  },
  simBreakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  simHighlightRow: {
    backgroundColor: "rgba(201, 151, 66, 0.08)",
    paddingHorizontal: 8,
    borderRadius: 6,
    borderBottomWidth: 0,
    marginVertical: 2,
  },
  simBreakdownLabel: {
    color: "#e5e5e5",
    fontSize: 11,
    fontWeight: "600",
  },
  simBreakdownVal: {
    color: "#ffffff",
    fontSize: 11.5,
    fontWeight: "800",
  },
  whoPaysBox: {
    marginTop: 14,
    backgroundColor: "#0d0b09",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  whoPaysTitle: {
    color: "#34d399",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: 0.4,
  },
  whoPaysItem: {
    marginBottom: 8,
  },
  whoPaysItemTitle: {
    color: "#f3f4f6",
    fontSize: 10.5,
    fontWeight: "700",
    marginBottom: 2,
  },
  whoPaysItemBody: {
    color: "#8a7e72",
    fontSize: 9.5,
    lineHeight: 13.5,
  },
  // Guest Screen Luxury Styles
  guestScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  guestHeroCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(245, 194, 66, 0.25)",
    marginBottom: 20,
    marginTop: 8,
  },
  guestIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(245, 194, 66, 0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(245, 194, 66, 0.35)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  guestTierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "rgba(245, 194, 66, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 194, 66, 0.3)",
    marginBottom: 10,
  },
  guestTierBadgeText: {
    color: "#f5c242",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  guestHeroTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  guestHeroSub: {
    color: "#a8a29e",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 22,
    paddingHorizontal: 10,
  },
  guestPrimaryBtn: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#f5c242",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  guestPrimaryBtnGrad: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  guestPrimaryBtnText: {
    color: "#000000",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
  },
  guestSecondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  guestSecondaryBtnText: {
    color: "#f5c242",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  guestBenefitsHeading: {
    color: "#8a7e72",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 4,
  },
  guestBenefitsCard: {
    backgroundColor: "#13100c",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  guestBenefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  guestBenefitIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  guestBenefitTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 3,
  },
  guestBenefitDesc: {
    color: "#8a7e72",
    fontSize: 11.5,
    lineHeight: 16,
  },
  guestBenefitDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginVertical: 14,
  },
  kycVipUpgradeBtn: {
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.35)",
  },
  kycVipUpgradeGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  kycVipUpgradeLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  kycVipUpgradeCrown: {
    fontSize: 20,
  },
  kycVipUpgradeTitle: {
    color: "#ffd700",
    fontSize: 11.5,
    fontWeight: "bold",
  },
  kycVipUpgradeSub: {
    color: "rgba(255, 255, 255, 0.65)",
    fontSize: 9.5,
    marginTop: 2,
    lineHeight: 13,
  },
  kycVipUpgradePill: {
    backgroundColor: "#d4af37",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  kycVipUpgradePillText: {
    color: "#000",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
});

export default CustomerDashboard;
