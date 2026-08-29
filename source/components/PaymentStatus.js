/* eslint-disable prettier/prettier */
import React, { useEffect } from "react";
import { View, Text, StyleSheet, Image, StatusBar } from "react-native";

const PaymentStatus = ({ route, navigation }) => {
  const { status } = route.params; // "success" or "failed"
  const isSuccess = status === "success";

  // Auto-redirect to Home after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      // Use navigation.reset to prevent layout/header issues
      navigation.reset({
        index: 0,
        routes: [{ name: "Home" }],
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />

      <View
        style={[
          styles.circle,
          { backgroundColor: isSuccess ? "#c99742" : "#e74c3c" },
        ]}
      >
        <Image
          source={require("../resources/images/tick.png")}
          style={styles.icon}
        />
      </View>

      <Text
        style={[styles.title, { color: isSuccess ? "#c99742" : "#e74c3c" }]}
      >
        {isSuccess ? "Successful!" : "Failed"}
      </Text>

      <Text style={styles.message}>
        {isSuccess
          ? "Your payment has been done successfully. You can visit the order page to check."
          : "Your payment has failed. You can visit the order page to check."}
      </Text>
    </View>
  );
};

export default PaymentStatus;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  icon: {
    width: 60,
    height: 60,
    tintColor: "#fff",
    resizeMode: "contain",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
    marginBottom: 30,
  },
});
