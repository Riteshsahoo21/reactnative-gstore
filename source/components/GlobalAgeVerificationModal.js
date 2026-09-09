/* eslint-disable prettier/prettier */
/* eslint-disable quotes */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
  DeviceEventEmitter,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");
export const AGE_VERIFIED_KEY = "grand-store-age-gate-passed";
export const AGE_GATE_KEY = "grand-store-age-gate-passed";

export default function GlobalAgeVerificationModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDenied, setIsDenied] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const checkVerification = async () => {
      try {
        const [gatePassed, userToken] = await Promise.all([
          AsyncStorage.getItem(AGE_GATE_KEY),
          AsyncStorage.getItem("userToken"),
        ]);

        if (gatePassed === "true" || userToken) {
          setIsVisible(false);
        } else {
          setIsVisible(true);
        }
      } catch (e) {
        setIsVisible(false);
      } finally {
        setChecked(true);
      }
    };

    checkVerification();

    const subLogin = DeviceEventEmitter.addListener("userLoggedIn", () => {
      setIsVisible(false);
      AsyncStorage.setItem(AGE_GATE_KEY, "true").catch(() => {});
    });

    return () => {
      subLogin.remove();
    };
  }, []);

  const handleConfirmAge = async () => {
    try {
      await AsyncStorage.setItem(AGE_GATE_KEY, "true");
    } catch (e) {
      console.log("Error saving age verification:", e);
    }
    setIsVisible(false);
  };

  const handleDenyAge = () => {
    setIsDenied(true);
  };

  if (!checked || !isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.95)" />
      <View style={styles.overlay}>
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={["#16130d", "#0c0b09", "#060504"]}
            style={styles.cardGradient}
          >
            {/* Grand Store Brand Logo */}
            <View style={styles.logoWrap}>
              <Image
                source={require("../resources/assets/logo.webp")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.kicker}>THE GRAND STORE • PRIVATE RESERVE</Text>

            {isDenied ? (
              <View style={styles.deniedContainer}>
                <Text style={styles.deniedTitle}>ACCESS RESTRICTED</Text>
                <Text style={styles.deniedSub}>
                  You must be of legal drinking and smoking age (18+) to access The Grand Store fine wine cellars, spirits vault, and artisanal tobacco collections.
                </Text>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => setIsDenied(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.retryBtnText}>← Return to Verification</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.headline}>Are you 18 years or older?</Text>
                <Text style={styles.description}>
                  You must be of legal drinking and smoking age in your jurisdiction to enter The Grand Store. By proceeding, you confirm and certify that you are 18 years of age or older.
                </Text>

                <View style={styles.buttonGroup}>
                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={handleConfirmAge}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={["#f5d77f", "#c99742", "#9e7428"]}
                      style={styles.confirmGradient}
                    >
                      <Text style={styles.confirmBtnText}>YES, I AM 18+</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.denyBtn}
                    onPress={handleDenyAge}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.denyBtnText}>No, I am under 18</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.legalNotice}>
                  Strictly 18+ • Please enjoy responsibly • Underage drinking and tobacco use are prohibited by law.
                </Text>
              </>
            )}
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.94)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  cardContainer: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(201, 151, 66, 0.55)",
    shadowColor: "#c99742",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  cardGradient: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  logoWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  logoImage: {
    width: width * 0.65,
    height: 52,
    resizeMode: "contain",
  },
  kicker: {
    color: "#d8b76d",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  headline: {
    color: "#f4efe6",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  description: {
    color: "#aaa296",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 26,
  },
  buttonGroup: {
    width: "100%",
    gap: 12,
  },
  confirmBtn: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
  },
  confirmGradient: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnText: {
    color: "#0b0a08",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  denyBtn: {
    width: "100%",
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  denyBtnText: {
    color: "#eee8dd",
    fontSize: 12.5,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  legalNotice: {
    color: "#666",
    fontSize: 9.5,
    textAlign: "center",
    marginTop: 20,
    lineHeight: 14,
  },
  deniedContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  deniedTitle: {
    color: "#e74c3c",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  deniedSub: {
    color: "#ccc",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
  },
  retryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.5)",
  },
  retryBtnText: {
    color: "#f5d77f",
    fontSize: 12,
    fontWeight: "700",
  },
});
