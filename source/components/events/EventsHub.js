/* eslint-disable prettier/prettier */
/* eslint-disable quotes */
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  ScrollView,
} from "react-native";
import tmh_styles from "../../styles/tmh_styles";
import AppHeader from "../../widgets/AppHeader";
import { API_BASE } from "../../resources/data/Constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

const API_CANDIDATES = [
  API_BASE,
  "http://localhost:5000/api",
  "http://192.168.1.9:5000/api",
  "http://10.0.2.2:5000/api",
];

const CATEGORIES = [
  "All",
  "Wine Tasting",
  "Whisky Experience",
  "Masterclass",
  "Winemaker Dinner",
  "Festival",
  "Virtual",
];

const getStartingPrice = (ticketTiers = []) => {
  const prices = (ticketTiers || [])
    .map((tier) => Number(tier.price))
    .filter((price) => Number.isFinite(price));
  return prices.length ? Math.min(...prices) : null;
};

const resolveEventImage = (img) => {
  if (!img) return "https://ik.imagekit.io/thegrandstore/bg.webp";
  if (img.startsWith("http")) return img;
  return `http://192.168.1.9:5000/${img.replace(/^\//, "")}`;
};

export default function EventsHub({ navigation }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const fetchEvents = useCallback(async () => {
    let loaded = false;
    for (const base of API_CANDIDATES) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(`${base}/events`, { signal: controller.signal });
        clearTimeout(timer);

        if (res && res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setEvents(data);
            loaded = true;
            break;
          }
        }
      } catch (err) {
        // try next candidate
      }
    }
    if (!loaded) {
      console.log("Could not load events from candidates");
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const filteredEvents = events.filter((ev) => {
    if (selectedCategory === "All") return true;
    if (selectedCategory === "Virtual") return ev.format === "Virtual";
    return ev.type === selectedCategory;
  });

  const renderEventCard = ({ item }) => {
    const startingPrice = getStartingPrice(item.ticketTiers);
    const dateFormatted = item.date
      ? new Date(item.date).toLocaleDateString("en-ZA", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "Upcoming";
    const isCompleted = item.status === "completed";
    const isLive = item.status === "ongoing";

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => navigation.navigate("EventDetails", { eventId: item._id, event: item })}
      >
        {/* Cover Image with Badges */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: resolveEventImage(item.image) }}
            style={styles.coverImage}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay} />

          {/* Top Category Tag */}
          <View style={styles.badgeTopLeft}>
            <Text style={styles.badgeTopLeftText}>{item.type || "Special Event"}</Text>
          </View>

          {/* Virtual Tag */}
          {item.format === "Virtual" && (
            <View style={styles.badgeVirtual}>
              <Text style={styles.badgeVirtualText}>💻 VIRTUAL</Text>
            </View>
          )}

          {/* Phase Badge Bottom Left */}
          <View
            style={[
              styles.badgePhase,
              isLive && styles.badgeLive,
              isCompleted && styles.badgeCompleted,
            ]}
          >
            <Text
              style={[
                styles.badgePhaseText,
                isLive && { color: "#4cd964" },
                isCompleted && { color: "#888" },
              ]}
            >
              {isLive ? "● LIVE NOW" : isCompleted ? "COMPLETED" : "UPCOMING"}
            </Text>
          </View>
        </View>

        {/* Content Body */}
        <View style={styles.cardBody}>
          {/* Date & Time Row */}
          <View style={styles.metaRow}>
            <Text style={styles.metaDate}>📅 {dateFormatted}</Text>
            <Text style={styles.metaTime}>⏰ {item.startTime}{item.endTime ? ` - ${item.endTime}` : ""}</Text>
          </View>

          {/* Title */}
          <Text style={styles.eventTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Location / City */}
          <View style={styles.locationRow}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText} numberOfLines={1}>
              {item.format === "Virtual"
                ? "Online Virtual Tasting Experience"
                : `${item.city ? `${item.city} • ` : ""}${item.location}`}
            </Text>
          </View>

          {/* Host & Capacity Row */}
          <View style={styles.detailsPillRow}>
            {item.hostName ? (
              <View style={styles.pill}>
                <Text style={styles.pillText}>👤 Host: {item.hostName}</Text>
              </View>
            ) : null}
            {item.capacity ? (
              <View style={styles.pill}>
                <Text style={styles.pillText}>👥 Max {item.capacity} guests</Text>
              </View>
            ) : null}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Footer Pricing & CTA */}
          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.fromLabel}>EXPERIENCE FROM</Text>
              <Text style={styles.priceValue}>
                {startingPrice === null ? "Complimentary" : `R${startingPrice.toLocaleString("en-ZA")}`}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.bookBtn}
              onPress={() => navigation.navigate("EventDetails", { eventId: item._id, event: item })}
              activeOpacity={0.85}
            >
              <Text style={styles.bookBtnText}>
                {isCompleted ? "View Recap" : "Book Experience →"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Luxury Tastings & Events"
        backgroundColor="#0c0a08"
        titleStyle={[tmh_styles.header_title_tmb, { color: "#f5c242" }]}
        isShowShadow={true}
        isBack={true}
        backButtonStyle={{ width: 35, height: 25, alignItems: "center" }}
        backIconColor="#f5c242"
        navigation={navigation}
        rightButtons={[
          {
            icon: require("../../resources/images/Order.png"),
            onPress: () => navigation.navigate("EventTicketPass"),
          },
        ]}
      />

      {/* Top Banner & My Tickets shortcut */}
      <View style={styles.headerHero}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroPreTitle}>THE GRAND CELLAR EXPERIENCE</Text>
          <Text style={styles.heroTitle}>Masterclasses & Private Dinners</Text>
          <Text style={styles.heroSubtitle}>
            Immerse in curated sommelier tastings and cellar releases.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.myTicketsPill}
          onPress={() => navigation.navigate("EventTicketPass")}
          activeOpacity={0.8}
        >
          <Text style={styles.myTicketsIcon}>🎟️</Text>
          <Text style={styles.myTicketsText}>My Passes</Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter Chips */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Event Cards List */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#c99742" />
          <Text style={styles.loadingText}>Unveiling Exclusive Experiences...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item._id}
          renderItem={renderEventCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#c99742"
              colors={["#c99742"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🍷</Text>
              <Text style={styles.emptyTitle}>No Experiences Available</Text>
              <Text style={styles.emptySub}>
                There are no scheduled events in "{selectedCategory}" at this time. Check back soon for exclusive bookings.
              </Text>
              {selectedCategory !== "All" && (
                <TouchableOpacity
                  style={styles.clearFilterBtn}
                  onPress={() => setSelectedCategory("All")}
                >
                  <Text style={styles.clearFilterText}>Show All Events</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070605",
  },
  headerHero: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  heroPreTitle: {
    color: "#c99742",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 2,
    letterSpacing: 0.2,
  },
  heroSubtitle: {
    color: "#888",
    fontSize: 11,
    marginTop: 2,
  },
  myTicketsPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(201, 151, 66, 0.15)",
    borderColor: "rgba(201, 151, 66, 0.4)",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginLeft: 8,
  },
  myTicketsIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  myTicketsText: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "800",
  },
  filtersContainer: {
    paddingVertical: 10,
  },
  filtersScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    backgroundColor: "#14120e",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterChipActive: {
    backgroundColor: "rgba(201, 151, 66, 0.22)",
    borderColor: "#c99742",
  },
  filterChipText: {
    color: "#888",
    fontSize: 11,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#f5c242",
    fontWeight: "800",
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#110f0c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 20,
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    height: 180,
    position: "relative",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  badgeTopLeft: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(11, 10, 8, 0.85)",
    borderColor: "rgba(201, 151, 66, 0.4)",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeTopLeftText: {
    color: "#f5c242",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  badgeVirtual: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#c99742",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeVirtualText: {
    color: "#0b0a08",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  badgePhase: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(11, 10, 8, 0.9)",
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeLive: {
    borderColor: "rgba(76, 217, 100, 0.5)",
  },
  badgeCompleted: {
    opacity: 0.7,
  },
  badgePhaseText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  cardBody: {
    padding: 16,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  metaDate: {
    color: "#c99742",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  metaTime: {
    color: "#999",
    fontSize: 11,
  },
  eventTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  locationIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  locationText: {
    color: "#aaa",
    fontSize: 12,
    flex: 1,
  },
  detailsPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  pill: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  pillText: {
    color: "#bbb",
    fontSize: 10,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fromLabel: {
    color: "#666",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  priceValue: {
    color: "#f5c242",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 1,
  },
  bookBtn: {
    backgroundColor: "#c99742",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bookBtnText: {
    color: "#0b0a08",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  centerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  loadingText: {
    color: "#c99742",
    marginTop: 12,
    fontSize: 12,
    fontWeight: "700",
  },
  emptyContainer: {
    padding: 30,
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  emptySub: {
    color: "#888",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  clearFilterBtn: {
    marginTop: 16,
    backgroundColor: "rgba(201, 151, 66, 0.15)",
    borderWidth: 1,
    borderColor: "#c99742",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  clearFilterText: {
    color: "#f5c242",
    fontSize: 12,
    fontWeight: "800",
  },
});
