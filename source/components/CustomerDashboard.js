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

const { width } = Dimensions.get("window");

const showMessage = (msg) => {
  if (Platform.OS === "android") {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert("", msg);
  }
};

const CustomerDashboard = ({ navigation, onBack }) => {
  const [user, setUser] = useState({
    name: "Collector",
    email: "customer@thegrandstore.co.za",
    phone: "+27 82 000 0000",
    referralCode: "GRANDVIP88",
    rewardBalance: 500,
  });
  const [userToken, setUserToken] = useState(null);
  const [loading, setLoading] = useState(false);

  // Quick stats
  const [ordersCount, setOrdersCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [bidsCount, setBidsCount] = useState(1);
  const [ticketsCount, setTicketsCount] = useState(1);

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

  // Bank Details Modal
  const [isBankModalVisible, setIsBankModalVisible] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    bankName: "First National Bank (FNB)",
    accountHolder: "Customer User",
    accountNumber: "•••• •••• 4912",
    branchCode: "250655",
  });
  const [tempBankDetails, setTempBankDetails] = useState({ ...bankDetails });

  // Activity Calendar Modal
  const [isCalendarModalVisible, setIsCalendarModalVisible] = useState(false);

  // Refer & Earn Modal (Full Original Implementation)
  const [isReferModalVisible, setIsReferModalVisible] = useState(false);
  const [referralSummary, setReferralSummary] = useState(null);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Change Password Modal
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [dedicatedNewPassword, setDedicatedNewPassword] = useState("");
  const [dedicatedConfirmPassword, setDedicatedConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showDedicatedNewPassword, setShowDedicatedNewPassword] = useState(false);
  const [showDedicatedConfirmPassword, setShowDedicatedConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

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

  const loadUserData = useCallback(async () => {
    try {
      const storedUserInfo = await AsyncStorage.getItem("userInfo");
      const storedToken = await AsyncStorage.getItem("userToken");
      const storedName = await AsyncStorage.getItem("userName");
      const storedPhone = await AsyncStorage.getItem("userPhone");
      const storedEmail = await AsyncStorage.getItem("userEmail");

      if (storedToken) setUserToken(storedToken);

      let parsedUser = null;
      if (storedUserInfo) {
        try {
          parsedUser = JSON.parse(storedUserInfo);
        } catch (e) {}
      }

      const name = storedName || parsedUser?.name || parsedUser?.userName || "Collector User";
      const email = storedEmail || parsedUser?.email || "customer@thegrandstore.co.za";
      const phone = storedPhone || parsedUser?.phone || parsedUser?.phoneNumber || "+27 82 912 3456";
      const referralCode = parsedUser?.referralCode || "GRANDVIP88";
      const rewardBalance = parsedUser?.rewardBalance ?? 500;

      setUser({ name, email, phone, referralCode, rewardBalance });
      setEditName(name);
      setEditEmail(email);
      setEditPhone(phone);

      if (storedToken) {
        try {
          const profileRes = await axios.get(`${API_BASE}/auth/profile`, {
            headers: { Authorization: `Bearer ${storedToken}` },
            timeout: 7000,
          });
          if (profileRes.data) {
            const p = profileRes.data;
            setUser((prev) => ({
              ...prev,
              name: p.name || prev.name,
              email: p.email || prev.email,
              phone: p.phone || p.phoneNumber || prev.phone,
              referralCode: p.referralCode || prev.referralCode,
              rewardBalance: p.rewardBalance ?? prev.rewardBalance,
            }));
            setEditName(p.name || name);
            setEditEmail(p.email || email);
            setEditPhone(p.phone || p.phoneNumber || phone);
            await AsyncStorage.setItem("userInfo", JSON.stringify(p));
            if (p.name) await AsyncStorage.setItem("userName", p.name);
            if (p.phone || p.phoneNumber) {
              await AsyncStorage.setItem("userPhone", p.phone || p.phoneNumber);
            }
          }
        } catch (pErr) {
          // offline cached info remains intact
        }

        fetchReferralDetails(storedToken);
      }

      // Load Wishlist count
      const storedWishlist = await AsyncStorage.getItem("grand-store-wishlist");
      if (storedWishlist) {
        try {
          const list = JSON.parse(storedWishlist);
          if (Array.isArray(list)) setWishlistCount(list.length);
        } catch (e) {}
      }

      // Load Orders count
      const storedOrders = await AsyncStorage.getItem("userOrders");
      if (storedOrders) {
        try {
          const ords = JSON.parse(storedOrders);
          if (Array.isArray(ords)) setOrdersCount(ords.length);
        } catch (e) {}
      }

      // Load Bank info
      const storedBank = await AsyncStorage.getItem("customerBankDetails");
      if (storedBank) {
        try {
          const b = JSON.parse(storedBank);
          setBankDetails(b);
          setTempBankDetails(b);
        } catch (e) {}
      }
    } catch (err) {
      console.log("Error loading customer data:", err);
    }
  }, [fetchReferralDetails]);

  useEffect(() => {
    loadUserData();

    const subWishlist = DeviceEventEmitter.addListener("wishlistUpdated", (cnt) => {
      if (typeof cnt === "number") setWishlistCount(cnt);
    });

    return () => {
      subWishlist.remove();
    };
  }, [loadUserData]);

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
    try {
      await AsyncStorage.setItem("customerBankDetails", JSON.stringify(tempBankDetails));
      setBankDetails(tempBankDetails);
      setIsBankModalVisible(false);
      showMessage("Bank details saved for auction payouts & refunds!");
    } catch (e) {
      showMessage("Failed to save banking details");
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
  const activeReferralCode = referralSummary?.referralCode || user?.referralCode || "GRANDVIP88";
  const referralLink = `https://thegrandstore.co.za/register?ref=${encodeURIComponent(activeReferralCode)}`;
  const programRewardAmount = referralSummary?.program?.rewardAmount ?? 500;
  const programWelcomeDiscount = referralSummary?.program?.welcomeDiscount ?? 250;

  const handleCopyLink = () => {
    Clipboard.setString(referralLink);
    setCopiedLink(true);
    showMessage("Referral link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyCode = () => {
    Clipboard.setString(activeReferralCode);
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
              await AsyncStorage.multiRemove(["userToken", "userInfo", "userName"]);
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

  const activities = [
    {
      id: 1,
      title: "Rare Vault Auction Live Closing",
      date: "Sep 7, 2026 • 16:05",
      type: "AUCTION",
      badge: "Lot #17EB7",
      color: "#ef4444",
      action: () => navigation.navigate("AuctionsHub"),
    },
    {
      id: 2,
      title: "Private Cellar Tasting: Vintage Bordeaux",
      date: "Sep 12, 2026 • 18:00",
      type: "TASTING",
      badge: "VIP Pass",
      color: "#c99742",
      action: () => navigation.navigate("EventTicketPass"),
    },
    {
      id: 3,
      title: "Consignment Payout Schedule",
      date: "Sep 15, 2026",
      type: "BANKING",
      badge: "CPA Bonded",
      color: "#10b981",
      action: () => setIsBankModalVisible(true),
    },
  ];

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
              source={require("../resources/images/Male.jpg")}
              style={styles.avatarImage}
            />
            <View style={styles.vipDot} />
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.vipBadge}>
              <Text style={styles.vipBadgeText}>👑 GRAND CELLAR VIP</Text>
            </View>
            <Text style={styles.profileName} numberOfLines={1}>
              {user.name}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {user.email}
            </Text>
            <Text style={styles.profilePhone}>{user.phone}</Text>
          </View>
        </LinearGradient>

        {/* 18+ Age & CPA Verified Strip */}
        <View style={styles.trustBanner}>
          <Text style={styles.trustBannerIcon}>⚖️</Text>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.trustBannerTitle}>18+ Age & Bidder Verified</Text>
            <Text style={styles.trustBannerSub}>
              CPA Escrow Protection • Authorized Live Auction Bidder
            </Text>
          </View>
          <View style={styles.verifiedTag}>
            <Text style={styles.verifiedTagText}>Active</Text>
          </View>
        </View>

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
            onPress={() => setIsBankModalVisible(true)}
          >
            <View style={styles.menuIconCircle}>
              <Text style={styles.menuEmoji}>🏦</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Bank Account & Payout Details</Text>
              <Text style={styles.menuSubtitle}>
                {bankDetails.bankName} • {bankDetails.accountNumber}
              </Text>
            </View>
            <View style={styles.manageTag}>
              <Text style={styles.manageTagText}>Manage</Text>
            </View>
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
                R{referralSummary?.rewardBalance ?? user.rewardBalance ?? 500}
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
            style={styles.menuRow}
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

          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("AboutUs")}
          >
            <View style={styles.menuIconCircle}>
              <Text style={styles.menuEmoji}>🏛️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>About The Grand Store Heritage</Text>
              <Text style={styles.menuSubtitle}>Cellar provenance & international licenses</Text>
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

      {/* Bank Details Modal */}
      <Modal
        visible={isBankModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsBankModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Banking & Payout Details</Text>
              <TouchableOpacity onPress={() => setIsBankModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              Used for auction proceeds, bottle consignments, and CPA escrow refunds.
            </Text>

            <Text style={styles.inputLabel}>Bank Name</Text>
            <TextInput
              style={styles.input}
              value={tempBankDetails.bankName}
              onChangeText={(t) => setTempBankDetails((p) => ({ ...p, bankName: t }))}
              placeholder="e.g. FNB, Standard Bank, Absa"
              placeholderTextColor="#666"
            />

            <Text style={styles.inputLabel}>Account Holder Name</Text>
            <TextInput
              style={styles.input}
              value={tempBankDetails.accountHolder}
              onChangeText={(t) => setTempBankDetails((p) => ({ ...p, accountHolder: t }))}
              placeholder="Account Holder"
              placeholderTextColor="#666"
            />

            <Text style={styles.inputLabel}>Account Number</Text>
            <TextInput
              style={styles.input}
              value={tempBankDetails.accountNumber}
              onChangeText={(t) => setTempBankDetails((p) => ({ ...p, accountNumber: t }))}
              placeholder="Account Number"
              placeholderTextColor="#666"
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Branch Code</Text>
            <TextInput
              style={styles.input}
              value={tempBankDetails.branchCode}
              onChangeText={(t) => setTempBankDetails((p) => ({ ...p, branchCode: t }))}
              placeholder="Branch Code"
              placeholderTextColor="#666"
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={handleSaveBankDetails}
            >
              <Text style={styles.modalSubmitBtnText}>Save Bank Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Activity Calendar Modal */}
      <Modal
        visible={isCalendarModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCalendarModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📅 Activity Calendar</Text>
              <TouchableOpacity onPress={() => setIsCalendarModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {activities.map((act) => (
                <TouchableOpacity
                  key={act.id}
                  style={styles.actCard}
                  onPress={() => {
                    setIsCalendarModalVisible(false);
                    act.action();
                  }}
                >
                  <View style={[styles.actTypeBadge, { borderColor: act.color }]}>
                    <Text style={[styles.actTypeText, { color: act.color }]}>
                      {act.type}
                    </Text>
                  </View>
                  <Text style={styles.actTitle}>{act.title}</Text>
                  <Text style={styles.actDate}>{act.date}</Text>
                  <Text style={styles.actAction}>View Details →</Text>
                </TouchableOpacity>
              ))}
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
  trustBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  trustBannerIcon: {
    fontSize: 20,
  },
  trustBannerTitle: {
    color: "#34d399",
    fontSize: 12,
    fontWeight: "800",
  },
  trustBannerSub: {
    color: "#9ca3af",
    fontSize: 11,
    marginTop: 2,
  },
  verifiedTag: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  verifiedTagText: {
    color: "#34d399",
    fontSize: 10,
    fontWeight: "800",
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
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  actDate: {
    color: "#9ca3af",
    fontSize: 11,
    marginBottom: 6,
  },
  actAction: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "700",
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
});

export default CustomerDashboard;
