/* eslint-disable prettier/prettier */
/* eslint-disable quotes */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
} from "react-native";
import AppHeader from "../../widgets/AppHeader";
import tmh_styles from "../../styles/tmh_styles";

export default function OrderDetails({ navigation }) {
  const [showProducts, setShowProducts] = useState(false); // <--- State to toggle visibility

  return (
    <View style={styles.container}>
      <AppHeader
        title="Orders Details"
        isGradient={false}
        backgroundColor={"#c99742"}
        titleStyle={tmh_styles.header_title_tmb}
        isShowShadow={false}
        navigation={navigation}
        isBack={true}
        backButtonStyle={{ width: 35, height: 25, alignItems: "center" }}
        backIconColor={"black"}
        logoImage={null}
      />

      <View style={{ alignItems: 'center', marginTop: 10 }}>
        <View style={styles.searchBox}>
          <Image
            source={require('../../resources/assets/discover.png')} 
            style={styles.icon}
          />
          <TextInput
            placeholder="Search In Orders"
            placeholderTextColor={'#8b8b8b'}
            style={styles.input}
          />
        </View>
      </View>

      <View style={styles.orderCard}>
        {/* Order Info Row */}
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.orderId}>Order ID: 486</Text>
            <Text style={styles.amount}>Final Amount: $8200</Text>
            <Text style={styles.date}>15 May 2023 • 5 Products</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Pending</Text>
          </View>
        </View>

        {/* View All Products Link */}
        <TouchableOpacity onPress={() => setShowProducts(!showProducts)}>
          <Text style={styles.viewAll}>
            {showProducts ? "Hide products ⌃" : "View all products ⌄"}
          </Text>
        </TouchableOpacity>

        {/* Product Thumbnails (only show if showProducts is true) */}
        {showProducts && (
          <View style={styles.productRow}>
            {[1, 2, 3, 4, 5].map((_, idx) => (
              <View key={idx} style={styles.thumbWrapper}>
                <Image
                  source={require('../../resources/assets/order1.png')} 
                  style={styles.thumb}
                />
              </View>
            ))}
          </View>
        )}

        {/* Description */}
        <View style={styles.descriptionBox}>
          <Text style={styles.descriptionText}>
            Lorem ipsum dolor sit amet consectetur. Viverra at et lacus cursus sed in tempor mattis.
          </Text>
        </View>

        {/* Rate Product Section */}
        <View style={styles.rateSection}>
          <Text style={styles.rateLabel}>Rate Product:</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Text key={star} style={{ color: star <= 4 ? '#ae7718' : '#555', fontSize: 18 }}>★</Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080a0b" },

  icon: {
    width: 22,
    height: 22,
    marginRight: 10,
    tintColor: '#8b8b8b',
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: '#f3f3f3',
    paddingVertical: 6,
  },

  searchBox: {
    flexDirection: 'row',
    backgroundColor: '#1c1c1c',
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 12,
    marginTop: 10,
    width: "90%",
    alignItems: 'center',
    height: 45,
  },

  orderCard: {
    backgroundColor: '#1c1c1c',
    marginHorizontal: 15,
    marginVertical: 10,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  orderId: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },

  amount: {
    color: '#fff',
    marginTop: 6,
    fontSize: 15,
    fontWeight: '500',
  },

  date: {
    color: '#aaa',
    marginTop: 3,
    fontSize: 13,
  },

  statusBadge: {
    backgroundColor: '#ae7718',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },

  statusText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 13,
  },

  viewAll: {
    color: '#ae7718',
    marginTop: 12,
    fontWeight: '600',
    fontSize: 15,
  },

  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 15,
    flexWrap: 'wrap',
  },

  thumbWrapper: {
    backgroundColor: '#080a0b',
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
  },

  thumb: {
    width: 60,
    height: 100,
    resizeMode: 'contain',
  },

  descriptionBox: {
    marginBottom: 15,
  },

  descriptionText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },

  rateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },

  rateLabel: {
    color: '#aaa',
    marginRight: 10,
    fontSize: 14,
  },

  starsContainer: {
    flexDirection: 'row',
  },
});

