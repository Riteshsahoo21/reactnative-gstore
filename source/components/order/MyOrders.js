/* eslint-disable prettier/prettier */
/* eslint-disable quotes */
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from "react-native";
import tmh_styles from "../../styles/tmh_styles";
import AppHeader from "../../widgets/AppHeader";

// Sample assets
import order1 from "../../resources/assets/order1.png";
import order2 from "../../resources/assets/order2.png";
import order3 from "../../resources/assets/order3.png";
import delivered from "../../resources/assets/delivered.png";
import refunded from "../../resources/assets/refunded.png";
import arriving from "../../resources/assets/arriving.png";
import discoverIcon from "../../resources/assets/discover.png";

const orders = [
  {
    id: "1",
    status: "Refunded",
    date: "12/01/2024",
    name: "Buld Light",
    size: "35.5 cl / 355ml",
    image: order1,
    image1: refunded,
    rating: 0,
  },
  {
    id: "2",
    status: "Arriving tomorrow by 10pm",
    date: "25/02/2024",
    name: "Flyrsian Dayglow IPA",
    size: "35.5 cl / 355ml",
    image: order2,
    image1: arriving,
    rating: 3,
  },
  {
    id: "3",
    status: "Delivered",
    date: "15/01/2024",
    name: "Besperados Tequila",
    size: "35.5 cl / 355ml",
    image: order3,
    image1: delivered,
    rating: 5,
  },
];

// ✅ Order item component
const OrderItem = ({ item, navigation }) => (
  <View style={styles.card}>
    <View style={styles.rowBetween}>
      <View style={styles.row}>
        <View style={styles.image1Container}>
          <Image source={item.image1} style={styles.image1} />
        </View>
        <Text style={styles.status}>{item.status}</Text>
      </View>
      <Text style={styles.date}>{item.date}</Text>
    </View>

    <View style={styles.div}>
      <View style={styles.row1}>
        <View style={styles.imageContainer}>
          <Image source={item.image} style={styles.image} />
          <View style={styles.imageBase} />
        </View>

        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.size}>Size: {item.size}</Text>
        </View>

        {/* Navigate to OrderDetails */}
        <TouchableOpacity
          onPress={() => navigation.navigate("OrderDetails", { order: item })}
        >
          <Text style={styles.details}>Details</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.rateSection}>
        <Text style={styles.rateText}>Rate Product:</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Text
              key={star}
              style={{ color: star <= item.rating ? "#DCA743" : "#555", fontSize: 16 }}
            >
              ★
            </Text>
          ))}
        </View>
      </View>
    </View>
  </View>
);

// ✅ MyOrders screen
export default function MyOrders({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="My Orders"
        isGradient={false}
        backgroundColor="#c99742"
        titleStyle={tmh_styles.header_title_tmb}
        isShowShadow={true}
        isBack={true}
        backButtonStyle={{ width: 35, height: 25, alignItems: "center" }}
        backIconColor="black"
        logoImage={null}
        navigation={navigation}
      />

      {/* Search Box */}
      <View style={{ alignItems: "center", marginTop: 10 }}>
        <View style={styles.searchBox}>
          <Image source={discoverIcon} style={styles.icon} />
          <TextInput
            placeholder="Search Your Order..."
            placeholderTextColor="#8b8b8b"
            style={styles.input}
          />
        </View>
      </View>

      {/* Orders List */}
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OrderItem item={item} navigation={navigation} />}
        contentContainerStyle={{ padding: 10 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080a0b" },
  searchBox: {
    flexDirection: "row",
    backgroundColor: "#1c1c1c",
    borderRadius: 10,
    marginBottom: 10,
    paddingHorizontal: 10,
    marginTop: 10,
    width: "90%",
    alignItems: "center",
  },
  icon: { width: 19, height: 19, marginRight: 8, tintColor: "#8b8b8b" },
  input: { flex: 1, fontSize: 16, color: "#f3f3f3" },
  card: { borderRadius: 10, padding: 12, marginVertical: 8, backgroundColor: "#1c1c1c" },
  row1: { flexDirection: "row", alignItems: "center", backgroundColor: "#1c1c1c" },
  div: { flexDirection: "column", backgroundColor: "#1c1c1c", padding: 15, borderRadius: 15 },
  row: { flexDirection: "row", alignItems: "center" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  image1Container: { backgroundColor: "#1c1c1c", padding: 10, borderRadius: 19, marginRight: 8, justifyContent: "center", alignItems: "center" },
  image1: { width: 14, height: 14, resizeMode: "contain" },
  imageContainer: { alignItems: "center", marginRight: 10, position: "relative" },
  image: { width: 60, height: 90, resizeMode: "contain", zIndex: 3 },
  imageBase: { position: "absolute", bottom: -5, width: 60, height: 70, backgroundColor: "#131415", borderRadius: 24, zIndex: 1 },
  status: { color: "#DCA743", fontWeight: "600" },
  date: { color: "#bbb", fontSize: 12 },
  name: { color: "#fff", fontSize: 18, fontWeight: "bold", fontFamily: "Roboto Slab" },
  size: { color: "#bbb", fontSize: 13, marginTop: 2 },
  details: { color: "#8b8b8b", fontWeight: "600", textDecorationLine: "underline" },
  rateSection: { marginTop: 8, flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  rateText: { color: "#8b8b8b", fontSize: 14, marginRight: 6 },
  starsContainer: { flexDirection: "row", marginRight: 10 },
});
