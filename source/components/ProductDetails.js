/* eslint-disable react-native/no-inline-styles */
/* eslint-disable prettier/prettier */
import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Image,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  StyleSheet,
  ImageBackground,
} from "react-native";
import AppHeader from "../widgets/AppHeader";
import tmh_styles from "../styles/tmh_styles";
import { HEADER_HEIGHT_THRESHOLD } from "../resources/data/Constants";
import ImageViewer from "react-native-image-zoom-viewer";

const IMAGE_BASE_URL = "https://ik.imagekit.io/thegrandstore/images/products/";

const ProductDetails = ({ navigation, route }) => {
  const { product, category, related_products } = route.params;
  const { height } = Dimensions.get("screen");

  const [headerHeight] = useState((HEADER_HEIGHT_THRESHOLD * height) / 100);
  const [mainImage, setMainImage] = useState(0);
  const [zoomVisible, setZoomVisible] = useState(false);

  const getImageUrl = (imagePath) =>
    imagePath?.startsWith("http") ? imagePath : `${IMAGE_BASE_URL}${imagePath}`;

  // Prepare gallery images
  const galleryImages = product.gallery
    ? product.gallery.split(",").map((img) => ({ uri: getImageUrl(img.trim()) }))
    : [];
  const productImages = galleryImages.length
    ? galleryImages
    : [{ uri: getImageUrl(product.image) }];

  const zoomImages = productImages.map((img) => ({ props: { source: img } }));

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ImageBackground
        source={{ uri: "https://ik.imagekit.io/thegrandstore/bg.webp" }}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        {/* Overlay */}
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }}>
          {/* Header */}
          <AppHeader
            title={"Product Details"}
            isGradient={false}
            backgroundColor={"#c99742"}
            rightButtons={[]}
            height={headerHeight}
            titleStyle={tmh_styles.header_title_tmb}
            isShowShadow={false}
            navigation={navigation}
            isBack={true}
            backButtonStyle={{ width: 35, height: 25, alignItems: "center" }}
            backIconColor={"black"}
            logoImage={null}
          />

          <ScrollView contentContainerStyle={{ padding: 15 }}>
            {/* Main Image */}
            <TouchableOpacity onPress={() => setZoomVisible(true)}>
              <Image
                source={productImages[mainImage]}
                style={styles.mainImage}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Thumbnails */}
            <View style={styles.thumbnailRow}>
              {productImages.map((img, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setMainImage(index)}
                  style={[
                    styles.thumbContainer,
                    mainImage === index && styles.thumbSelected,
                  ]}
                >
                  <Image source={img} style={styles.thumbnail} resizeMode="contain" />
                </TouchableOpacity>
              ))}
            </View>

            {/* Product Info */}
            <Text style={styles.title}>{product.name}</Text>
            <Text style={styles.price}>R{product.price}</Text>

            <View style={styles.infoContainer}>
              <Text style={styles.infoLabel}>
                SKU: <Text style={styles.infoText}>{product.skuid}</Text>
              </Text>
              <Text style={styles.infoLabel}>
                ID: <Text style={styles.infoText}>{product.id}</Text>
              </Text>
              {category?.name && (
                <Text style={styles.infoLabel}>
                  Category: <Text style={styles.infoText}>{category.name}</Text>
                </Text>
              )}
              {product.tags && (
                <Text style={styles.infoLabel}>
                  Tags:{" "}
                  <Text style={styles.infoText}>
                    {Array.isArray(product.tags)
                      ? product.tags.join(", ")
                      : product.tags.toString()}
                  </Text>
                </Text>
              )}
            </View>

            {/* Category Description */}
            {category?.description && (
              <Text style={styles.desc}>{category.description}</Text>
            )}

            {/* Add to Cart Button */}
            <TouchableOpacity style={styles.cartButton}>
              <Text style={styles.cartText}>Add to Cart</Text>
            </TouchableOpacity>

            {/* Related Products */}
            {related_products && related_products.length > 0 && (
              <View style={{ marginTop: 30 }}>
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 20,
                    fontWeight: "700",
                    marginBottom: 10,
                  }}
                >
                  Related Products
                </Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {related_products.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={{
                        backgroundColor: "#1C1C1C",
                        borderRadius: 15,
                        padding: 10,
                        marginRight: 15,
                        width: 140,
                        borderWidth: 1,
                        borderColor: "#c99742",
                      }}
                      onPress={() =>
                        navigation.push("ProductDetails", {
                          product: item,
                          category: item.category || null,
                          related_products, // pass same array or recompute if needed
                        })
                      }
                    >
                      <Image
                        source={{
                          uri: item.image?.startsWith("http")
                            ? item.image
                            : `${IMAGE_BASE_URL}${item.image}`,
                        }}
                        style={{ width: "100%", height: 120, borderRadius: 10 }}
                        resizeMode="cover"
                      />
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 14,
                          marginTop: 8,
                          fontWeight: "500",
                        }}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={{
                          color: "#c99742",
                          fontSize: 14,
                          fontWeight: "600",
                          marginTop: 2,
                        }}
                      >
                        R{item.price}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </ScrollView>

          {/* Zoom Modal */}
          <Modal visible={zoomVisible} transparent={true}>
            <ImageViewer
              imageUrls={zoomImages}
              index={mainImage}
              enableSwipeDown={true}
              onSwipeDown={() => setZoomVisible(false)}
              onCancel={() => setZoomVisible(false)}
            />
          </Modal>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  mainImage: { width: "100%", height: 300, borderRadius: 10 },
  thumbnailRow: { flexDirection: "row", marginTop: 12, justifyContent: "center" },
  thumbContainer: { marginHorizontal: 6, padding: 2, borderRadius: 8, borderWidth: 1, borderColor: "transparent" },
  thumbSelected: { borderColor: "#c99742" },
  thumbnail: { width: 70, height: 90, borderRadius: 8 },
  title: { fontSize: 20, fontWeight: "700", marginTop: 20, color: "#fff" },
  price: { fontSize: 18, fontWeight: "600", marginTop: 5, color: "#c99742" },
  infoContainer: { marginTop: 10 },
  infoLabel: { color: "#fff", fontSize: 14, marginTop: 3 },
  infoText: { color: "#fff", fontWeight: "600" },
  desc: { fontSize: 15, marginTop: 10, lineHeight: 22, color: "#fff" },
  cartButton: { marginTop: 20, backgroundColor: "#c99742", padding: 14, borderRadius: 10, alignItems: "center" },
  cartText: { fontSize: 16, fontWeight: "600", color: "#000" },
});

export default ProductDetails;
