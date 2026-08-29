/* eslint-disable react-native/no-inline-styles */
/* eslint-disable prettier/prettier */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from "react-native";
import AppHeader from "../widgets/AppHeader";
import tmh_styles from "../styles/tmh_styles";
import { HEADER_HEIGHT_THRESHOLD } from "../resources/data/Constants";

const Checkout = ({ navigation }) => {
  const windowDimensions = Dimensions.get("window");
  const screenDimensions = Dimensions.get("screen");

  const [rightButtons] = useState([]);
  const [headerHeight] = useState(
    (HEADER_HEIGHT_THRESHOLD * screenDimensions.height) / 100
  );

  // Dummy checkout data
  const items = [
    {
      id: "1",
      name: "Richelieu Cognac XO",
      size: "750ml",
      price: 1399.0,
      qty: 1,
      image: require("../resources/assets/bottle1.webp"),
    },
    {
      id: "2",
      name: "Richelieu Cognac XO",
      size: "750ml",
      price: 1399.0,
      qty: 2,
      image: require("../resources/assets/bottle1.webp"),
    },
  ];

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Image source={item.image} style={styles.image} resizeMode="contain" />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.size}>{item.size}</Text>
        <Text style={styles.price}>R{item.price.toFixed(2)}</Text>
        <Text style={styles.qty}>Qty: {item.qty}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0d0d0d" }}>
      {/* Header */}
      <AppHeader
        title={"Checkout"}
        isGradient={false}
        backgroundColor={"#c99742"}
        rightButtons={rightButtons}
        height={headerHeight}
        titleStyle={tmh_styles.header_title_tmb}
        isShowShadow={false}
        navigation={navigation}
        isBack={true}
        backButtonStyle={{ width: 35, height: 25, alignItems: "center" }}
        backIconColor={"black"}
        logoImage={null}
      />

      {/* Items */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 15 }}
      />

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.row}>
          <Text style={styles.label}>Subtotal:</Text>
          <Text style={styles.value}>R{subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Tax (10%):</Text>
          <Text style={styles.value}>R{tax.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { fontWeight: "bold" }]}>Total:</Text>
          <Text style={[styles.value, { fontWeight: "bold" }]}>
            R{total.toFixed(2)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.payButton}
          onPress={() => navigation.navigate("PaymentDetails")}
        >
          <Text style={styles.payText}>Proceed to Pay</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#1c1c1c",
    padding: 10,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  image: {
    width: 70,
    height: 100,
    borderRadius: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ccc",
  },
  size: {
    fontSize: 14,
    color: "#ccc",
  },
  price: {
    fontSize: 15,
    color: "#c99742",
    marginTop: 4,
  },
  qty: {
    fontSize: 14,
    marginTop: 2,
    color: "#ccc",
  },
  summary: {
    borderTopWidth: 1,
    borderTopColor: "#333",
    padding: 15,
    backgroundColor: "#1c1c1c",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    color: "#ccc",
  },
  value: {
    fontSize: 15,
    color: "#ccc",
  },
  payButton: {
    marginTop: 15,
    backgroundColor: "#c99742",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  payText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default Checkout;
