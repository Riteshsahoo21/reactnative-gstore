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
  Modal,
} from "react-native";
import tmh_styles from "../../styles/tmh_styles";
import AppHeader from "../../widgets/AppHeader";
import {
  API_BASE,
  getActiveServerHost,
  getActiveApiBase,
  getCandidateBases,
} from "../../resources/data/Constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SOMMELIER_CREST = require("../../resources/images/sommelier_crest.jpg");

const { width } = Dimensions.get("window");

const getEventApiCandidates = () => {
  const active = typeof getActiveApiBase === "function" ? getActiveApiBase() : API_BASE;
  const list = [API_BASE, active];
  if (typeof getCandidateBases === "function") {
    list.push(...getCandidateBases());
  }
  if (__DEV__) {
    list.push(
      "http://127.0.0.1:5000/api",
      "http://192.168.1.102:5000/api",
      "http://localhost:5000/api",
      "http://10.0.2.2:5000/api",
      "http://192.168.1.9:5000/api"
    );
  }
  return [...new Set(list.filter(Boolean))];
};

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
  return `${getActiveServerHost()}/${img.replace(/^\//, "")}`;
};

export default function EventsHub({ navigation, route }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isCalendarModalVisible, setIsCalendarModalVisible] = useState(
    Boolean(route?.params?.openCalendar)
  );
  const [calendarCurrentDate, setCalendarCurrentDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);

  useEffect(() => {
    if (route?.params?.openCalendar) {
      setIsCalendarModalVisible(true);
    }
  }, [route?.params?.openCalendar]);

  const calYear = calendarCurrentDate.getFullYear();
  const calMonth = calendarCurrentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const weekDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  const firstDayIndex = (new Date(calYear, calMonth, 1).getDay() + 6) % 7;
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

  const getDayEvents = (item) => {
    if (!item.isCurrentMonth) return [];
    return events.filter((ev) => {
      if (!ev.date) return false;
      const ed = new Date(ev.date);
      return (
        ed.getFullYear() === calYear &&
        ed.getMonth() === calMonth &&
        ed.getDate() === item.day
      );
    });
  };

  const visibleCalendarEvents = selectedCalendarDate
    ? events.filter((ev) => {
        if (!ev.date) return false;
        const ed = new Date(ev.date);
        return (
          ed.getFullYear() === calYear &&
          ed.getMonth() === calMonth &&
          ed.getDate() === selectedCalendarDate
        );
      })
    : events.filter((ev) => {
        if (!ev.date) return false;
        const ed = new Date(ev.date);
        return ed.getFullYear() === calYear && ed.getMonth() === calMonth;
      });

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

  const fetchEvents = useCallback(async () => {
    let loaded = false;
    for (const base of getEventApiCandidates()) {
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
    const statusLower = String(item.status || "").toLowerCase();
    const isPastDate = item.date && new Date(item.date) < new Date(new Date().setHours(0, 0, 0, 0)) && statusLower !== "ongoing";
    const totalPasses = (item.ticketTiers || []).reduce((acc, tier) => {
      const qty = Number(tier.quantity) || 0;
      const sold = Number(tier.sold) || 0;
      const res = Number(tier.reserved) || 0;
      return acc + Math.max(0, qty - sold - res);
    }, 0);
    const isSoldOut = (item.ticketTiers && item.ticketTiers.length > 0) && totalPasses === 0;
    const isCompleted = statusLower === "completed" || statusLower === "concluded" || statusLower === "ended";
    const isClosed = isCompleted || ["closed", "cancelled"].includes(statusLower) || item.bookingClosed === true || isPastDate || isSoldOut;
    const isLive = statusLower === "ongoing";

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
              isClosed && styles.badgeCompleted,
            ]}
          >
            <Text
              style={[
                styles.badgePhaseText,
                isLive && { color: "#4cd964" },
                isClosed && { color: "#bbb" },
              ]}
            >
              {isLive ? "● LIVE NOW" : isSoldOut ? "SOLD OUT" : isCompleted ? "COMPLETED" : isClosed ? "CLOSED" : "UPCOMING"}
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
              <View style={[styles.pill, styles.hostPill]}>
                <Image source={SOMMELIER_CREST} style={styles.hostPillCrest} />
                <Text style={styles.hostPillText} numberOfLines={1}>Host: {item.hostName}</Text>
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
              style={[styles.bookBtn, isClosed && { backgroundColor: "rgba(255, 255, 255, 0.08)", borderColor: "rgba(255, 255, 255, 0.15)" }]}
              onPress={() => navigation.navigate("EventDetails", { eventId: item._id, event: item })}
              activeOpacity={0.85}
            >
              <Text style={[styles.bookBtnText, isClosed && { color: "#888" }]}>
                {isCompleted ? "View Recap →" : isClosed ? (isSoldOut ? "Sold Out →" : "Closed →") : "Book Experience →"}
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

        <View style={styles.headerActionsRow}>
          <TouchableOpacity
            style={styles.calendarTriggerPill}
            onPress={() => setIsCalendarModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.calendarTriggerIcon}>📅</Text>
            <Text style={styles.calendarTriggerText}>Calendar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.myTicketsPill}
            onPress={() => navigation.navigate("EventTicketPass")}
            activeOpacity={0.8}
          >
            <Text style={styles.myTicketsIcon}>🎟️</Text>
            <Text style={styles.myTicketsText}>My Passes</Text>
          </TouchableOpacity>
        </View>
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
              <Image source={SOMMELIER_CREST} style={styles.emptyCrest} resizeMode="contain" />
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

      {/* Luxury Interactive Tasting Calendar Modal */}
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
                  <Text style={styles.modalTitle}>Tasting Calendar</Text>
                  <Text style={styles.calendarModalSubtitle}>
                    Masterclasses, dinners & cellar tastings
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
                    const dayEvs = getDayEvents(item);
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

                        {/* Event Dot Indicators */}
                        <View style={styles.calendarDotsRow}>
                          {dayEvs.slice(0, 3).map((_, dotIdx) => (
                            <View
                              key={dotIdx}
                              style={[
                                styles.calendarDot,
                                { backgroundColor: "#c99742" },
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

            {/* Selected Date Agenda Header */}
            <View style={styles.agendaHeaderRow}>
              <Text style={styles.agendaTitleText}>
                {selectedCalendarDate
                  ? `${monthNames[calMonth]} ${selectedCalendarDate} Tastings`
                  : `All ${monthNames[calMonth]} Tastings (${visibleCalendarEvents.length})`}
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
              style={{ maxHeight: 180 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 6 }}
            >
              {visibleCalendarEvents.length > 0 ? (
                visibleCalendarEvents.map((ev) => {
                  const startingPrice = getStartingPrice(ev.ticketTiers);
                  const isClosed =
                    ev.status === "closed" ||
                    (ev.soldTickets >= ev.totalCapacity && ev.totalCapacity > 0);
                  return (
                    <TouchableOpacity
                      key={ev._id}
                      style={styles.calEventCard}
                      onPress={() => {
                        setIsCalendarModalVisible(false);
                        navigation.navigate("EventDetails", { eventId: ev._id });
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.calEventCardTopRow}>
                        <View
                          style={[
                            styles.calEventTypeBadge,
                            isClosed && { borderColor: "#ef4444" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.calEventTypeText,
                              isClosed && { color: "#ef4444" },
                            ]}
                          >
                            {isClosed ? "CLOSED" : (ev.type || "TASTING").toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.calEventDateText}>
                          {ev.date
                            ? new Date(ev.date).toLocaleDateString("en-ZA", {
                                day: "numeric",
                                month: "short",
                              })
                            : ""}{" "}
                          • {ev.time || ev.startTime || ""}
                        </Text>
                      </View>

                      <Text style={styles.calEventTitle} numberOfLines={1}>
                        {ev.title}
                      </Text>
                      <Text style={styles.calEventLocation} numberOfLines={1}>
                        📍 {ev.location?.venueName || ev.location || ev.format || "Private Cellar"}
                      </Text>

                      <View style={styles.calEventBottomRow}>
                        <Text style={styles.calEventPrice}>
                          {startingPrice != null
                            ? `From R ${startingPrice.toLocaleString()}`
                            : "Private Invitation"}
                        </Text>
                        <Text style={styles.calEventAction}>View Experience →</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.noActivitiesBox}>
                  <Text style={styles.noActivitiesEmoji}>🍷</Text>
                  <Text style={styles.noActivitiesTitle}>No Tastings Scheduled</Text>
                  <Text style={styles.noActivitiesSub}>
                    {selectedCalendarDate
                      ? "Select another date or explore all monthly cellar experiences."
                      : "No tastings scheduled for this month."}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  hostPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(201, 151, 66, 0.12)",
    borderColor: "rgba(201, 151, 66, 0.35)",
  },
  hostPillCrest: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 5,
  },
  hostPillText: {
    color: "#f5c242",
    fontSize: 10,
    fontWeight: "700",
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
  emptyCrest: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: "rgba(201, 151, 66, 0.4)",
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
  headerActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  calendarTriggerPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(201, 151, 66, 0.15)",
    borderColor: "rgba(201, 151, 66, 0.4)",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginRight: 6,
  },
  calendarTriggerIcon: {
    fontSize: 13,
    marginRight: 4,
  },
  calendarTriggerText: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#16130f",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.35)",
    width: "100%",
    maxWidth: 420,
    overflow: "hidden",
  },
  calendarModalContent: {
    maxHeight: "92%",
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    paddingBottom: 10,
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  calendarModalSubtitle: {
    color: "#8a7e72",
    fontSize: 10.5,
    marginTop: 1,
  },
  calendarCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: {
    color: "#e5e5e5",
    fontSize: 14,
    fontWeight: "700",
  },
  calendarControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0d0b09",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.2)",
    marginBottom: 8,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(201, 151, 66, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  monthNavText: {
    color: "#f5c242",
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 20,
  },
  monthTitleWrap: {
    flex: 1,
    alignItems: "center",
  },
  monthTitleText: {
    color: "#f5c242",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },
  todayPillBtn: {
    backgroundColor: "rgba(201, 151, 66, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.4)",
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
  calEventCard: {
    backgroundColor: "#0d0b09",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.2)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  calEventCardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  calEventTypeBadge: {
    backgroundColor: "rgba(201, 151, 66, 0.12)",
    borderWidth: 0.8,
    borderColor: "#c99742",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  calEventTypeText: {
    color: "#f5c242",
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  calEventDateText: {
    color: "#9ca3af",
    fontSize: 10,
    fontWeight: "600",
  },
  calEventTitle: {
    color: "#ffffff",
    fontSize: 12.5,
    fontWeight: "800",
    marginBottom: 2,
  },
  calEventLocation: {
    color: "#8a7e72",
    fontSize: 10,
    marginBottom: 6,
  },
  calEventBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
    paddingTop: 5,
  },
  calEventPrice: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "800",
  },
  calEventAction: {
    color: "#c99742",
    fontSize: 10,
    fontWeight: "800",
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
});
