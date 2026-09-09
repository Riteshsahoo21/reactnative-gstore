/* eslint-disable prettier/prettier */
import React, { useState, useMemo } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  Image,
} from 'react-native';
import { PHONE_COUNTRIES } from '../helpers/phoneNumbers';

// Generate Unicode flag emoji from ISO 2-letter country code
export function getCountryFlag(iso) {
  if (!iso || iso.length !== 2) return '🌐';
  try {
    const codePoints = iso
      .toUpperCase()
      .split('')
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch (e) {
    return '🌐';
  }
}

// Universal Flag Component: renders FlagCDN image with emoji fallback
export function CountryFlagImage({ iso, size = 18, style }) {
  const [imgError, setImgError] = useState(false);
  const code = String(iso || '').trim().toLowerCase();

  if (!code || code.length !== 2 || imgError) {
    return (
      <Text style={[{ fontSize: size }, style]}>
        {getCountryFlag(iso)}
      </Text>
    );
  }

  return (
    <Image
      source={{ uri: `https://flagcdn.com/w40/${code}.png` }}
      style={[
        {
          width: Math.round(size * 1.35),
          height: Math.round(size * 0.95),
          borderRadius: 2,
          backgroundColor: '#262626',
        },
        style,
      ]}
      resizeMode="cover"
      onError={() => setImgError(true)}
    />
  );
}

// Popular / Recommended countries prioritized
const POPULAR_ISO_CODES = ['ZA', 'US', 'GB', 'IN', 'AU', 'AE', 'DE', 'FR', 'CA', 'NG', 'KE'];

export default function CountryCodePickerModal({
  visible,
  selectedCode = '+27',
  onSelect,
  onClose,
}) {
  const [search, setSearch] = useState('');

  // Normalize all countries with flags
  const allCountries = useMemo(() => {
    return PHONE_COUNTRIES.map((c) => ({
      ...c,
      flag: getCountryFlag(c.country),
    }));
  }, []);

  // Filtered countries based on search query
  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allCountries;

    const cleanQ = q.startsWith('+') ? q.slice(1) : q;

    return allCountries.filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(q);
      const isoMatch = c.country.toLowerCase().includes(q);
      const dialMatch =
        c.dialCode.toLowerCase().includes(q) ||
        c.dialCode.replace('+', '').includes(cleanQ);
      return nameMatch || isoMatch || dialMatch;
    });
  }, [allCountries, search]);

  // Recommended popular countries
  const popularCountries = useMemo(() => {
    return POPULAR_ISO_CODES.map((iso) =>
      allCountries.find((c) => c.country === iso)
    ).filter(Boolean);
  }, [allCountries]);

  const handleChoose = (item) => {
    if (onSelect) {
      onSelect(item);
    }
    setSearch('');
    if (onClose) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close country selector"
        />
        <SafeAreaView style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Select Country Code</Text>
              <Text style={styles.headerSubtitle}>
                Choose your country for SMS OTP verification
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search country, ISO, or dial code (+27, +91)..."
              placeholderTextColor="#666"
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearch('')}
                style={styles.clearBtn}
              >
                <Text style={styles.clearBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* List */}
          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.country}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            maxToRenderPerBatch={30}
            windowSize={10}
            ListHeaderComponent={
              !search ? (
                <View style={styles.popularSection}>
                  <Text style={styles.sectionLabel}>⭐ POPULAR & RECOMMENDED</Text>
                  <View style={styles.popularGrid}>
                    {popularCountries.map((item) => {
                      const isSelected =
                        item.dialCode === selectedCode ||
                        item.country === selectedCode;
                      return (
                        <TouchableOpacity
                          key={`pop-${item.country}`}
                          style={[
                            styles.popularChip,
                            isSelected && styles.popularChipActive,
                          ]}
                          onPress={() => handleChoose(item)}
                        >
                          <CountryFlagImage iso={item.country} size={15} style={{ marginRight: 6 }} />
                          <Text
                            style={[
                              styles.chipText,
                              isSelected && styles.chipTextActive,
                            ]}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          <Text style={styles.chipCode}>{item.dialCode}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
                    ALL COUNTRIES ({allCountries.length})
                  </Text>
                </View>
              ) : (
                <Text style={styles.sectionLabel}>
                  MATCHING COUNTRIES ({filteredCountries.length})
                </Text>
              )
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No countries matching "{search}"
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isSelected =
                item.dialCode === selectedCode || item.country === selectedCode;
              return (
                <TouchableOpacity
                  style={[styles.itemRow, isSelected && styles.itemRowActive]}
                  onPress={() => handleChoose(item)}
                >
                  <CountryFlagImage iso={item.country} size={20} style={{ marginRight: 12 }} />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemIso}>({item.country})</Text>
                  </View>
                  <View style={styles.itemRight}>
                    <Text
                      style={[
                        styles.itemDialCode,
                        isSelected && styles.itemDialCodeActive,
                      ]}
                    >
                      {item.dialCode}
                    </Text>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '82%',
    backgroundColor: '#0c0c0c',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(201, 163, 91, 0.25)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1f1f1f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#262626',
  },
  searchIcon: {
    fontSize: 13,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    paddingVertical: 10,
  },
  clearBtn: {
    padding: 6,
  },
  clearBtnText: {
    color: '#777',
    fontSize: 12,
  },
  popularSection: {
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  sectionLabel: {
    color: '#c9a35b',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  popularChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    width: '48%',
  },
  popularChipActive: {
    borderColor: '#c9a35b',
    backgroundColor: 'rgba(201, 163, 91, 0.12)',
  },
  chipFlag: {
    fontSize: 16,
    marginRight: 6,
  },
  chipText: {
    flex: 1,
    color: '#ccc',
    fontSize: 11,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  chipCode: {
    color: '#c9a35b',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginLeft: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#161616',
  },
  itemRowActive: {
    backgroundColor: 'rgba(201, 163, 91, 0.1)',
  },
  itemFlag: {
    fontSize: 20,
    marginRight: 14,
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemName: {
    color: '#eee',
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
  itemIso: {
    color: '#666',
    fontSize: 11,
    fontWeight: '600',
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemDialCode: {
    color: '#c9a35b',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  itemDialCodeActive: {
    color: '#e5c07b',
  },
  checkmark: {
    color: '#c9a35b',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#777',
    fontSize: 13,
  },
});
