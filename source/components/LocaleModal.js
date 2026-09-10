import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import ModalRN from 'react-native-modal';
import LinearGradient from 'react-native-linear-gradient';
import {
  useCurrency,
  CURRENCY_NAMES,
  CURRENCY_SYMBOLS,
  CURRENCY_TO_COUNTRY,
  getCountryFlagUri,
} from '../context/CurrencyContext';
import { APP_FONT } from '../resources/data/Fonts';

const { height: screenHeight } = Dimensions.get('window');

const FlagImage = ({ countryCode, size = 26 }) => {
  const [hasError, setHasError] = useState(false);
  const uri = getCountryFlagUri(countryCode);

  if (hasError || !countryCode) {
    return (
      <View style={[styles.flagFallback, { width: size * 1.35, height: size }]}>
        <Text style={styles.flagFallbackText}>{String(countryCode || '🌐').slice(0, 2).toUpperCase()}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.flagImage, { width: size * 1.35, height: size }]}
      resizeMode="cover"
      onError={() => setHasError(true)}
    />
  );
};

export default function LocaleModal({ isVisible, onClose, initialTab = 'country' }) {
  const {
    countryCode,
    countryName,
    currency,
    currencySymbol,
    countries,
    availableCurrencies,
    changeCountry,
    changeCurrency,
    formatPrice,
    rates,
  } = useCurrency();

  const [activeTab, setActiveTab] = useState(initialTab); // 'country' | 'currency'
  const [searchQuery, setSearchQuery] = useState('');

  // Sync tab when opened
  React.useEffect(() => {
    if (isVisible) {
      setActiveTab(initialTab || 'country');
      setSearchQuery('');
    }
  }, [isVisible, initialTab]);

  // Filter countries
  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.currency && c.currency.toLowerCase().includes(q))
    );
  }, [countries, searchQuery]);

  // Filter currencies
  const filteredCurrencies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = availableCurrencies.map((code) => ({
      code,
      name: CURRENCY_NAMES[code] || code,
      symbol: CURRENCY_SYMBOLS[code] || code,
      flagCountry: CURRENCY_TO_COUNTRY[code] || code.slice(0, 2),
    }));

    if (!q) return list;
    return list.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }, [availableCurrencies, searchQuery]);

  const handleSelectCountry = (country) => {
    changeCountry(country.code, country.name);
    // Switch to currency tab so user can check their currency, or close if satisfied
    setActiveTab('currency');
    setSearchQuery('');
  };

  const handleSelectCurrency = (currCode) => {
    changeCurrency(currCode);
    onClose();
  };

  return (
    <ModalRN
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropOpacity={0.75}
      style={styles.modal}
      avoidKeyboard
      useNativeDriver={Platform.OS === 'android'}
    >
      <View style={styles.container}>
        {/* Top Drag Indicator */}
        <View style={styles.dragPillWrap}>
          <View style={styles.dragPill} />
        </View>

        {/* Modal Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerEyebrow}>SHOPPING PREFERENCES</Text>
            <Text style={styles.headerTitle}>Country & Currency</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Active Selection Summary Bar */}
        <LinearGradient
          colors={['#251d14', '#15110c']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryBar}
        >
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>DESTINATION</Text>
            <View style={styles.summaryValueRow}>
              <FlagImage countryCode={countryCode} size={15} />
              <Text style={styles.summaryValue} numberOfLines={1}>
                {countryName} ({countryCode})
              </Text>
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>DISPLAY CURRENCY</Text>
            <View style={styles.summaryValueRow}>
              <FlagImage countryCode={CURRENCY_TO_COUNTRY[currency]} size={15} />
              <Text style={styles.summaryCurrencyBadge}>{currencySymbol}</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>
                {currency}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Segmented Tab Switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'country' && styles.tabButtonActive]}
            onPress={() => {
              setActiveTab('country');
              setSearchQuery('');
            }}
            activeOpacity={0.8}
          >
            {activeTab === 'country' ? (
              <LinearGradient
                colors={['#ffd700', '#d4af37']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.activeTabGradient}
              >
                <FlagImage countryCode={countryCode} size={16} />
                <Text style={styles.tabTextActive}>Country / Region</Text>
              </LinearGradient>
            ) : (
              <View style={styles.inactiveTabContent}>
                <FlagImage countryCode={countryCode} size={16} />
                <Text style={styles.tabTextInactive}>Country / Region</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'currency' && styles.tabButtonActive]}
            onPress={() => {
              setActiveTab('currency');
              setSearchQuery('');
            }}
            activeOpacity={0.8}
          >
            {activeTab === 'currency' ? (
              <LinearGradient
                colors={['#ffd700', '#d4af37']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.activeTabGradient}
              >
                <FlagImage countryCode={CURRENCY_TO_COUNTRY[currency]} size={16} />
                <Text style={styles.tabSymbolBadgeActive}>{currencySymbol}</Text>
                <Text style={styles.tabTextActive}>Currency ({currency})</Text>
              </LinearGradient>
            ) : (
              <View style={styles.inactiveTabContent}>
                <FlagImage countryCode={CURRENCY_TO_COUNTRY[currency]} size={16} />
                <Text style={styles.tabSymbolBadgeInactive}>{currencySymbol}</Text>
                <Text style={styles.tabTextInactive}>Currency ({currency})</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={
              activeTab === 'country'
                ? 'Search countries (e.g. South Africa, US, France)...'
                : 'Search currencies (e.g. ZAR, USD, EUR, Rand)...'
            }
            placeholderTextColor="#776f62"
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
              <Text style={styles.searchClearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* List Content */}
        {activeTab === 'country' ? (
          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => {
              const isSelected = item.code === countryCode;
              return (
                <TouchableOpacity
                  style={[styles.listItem, isSelected && styles.listItemSelected]}
                  onPress={() => handleSelectCountry(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.listItemLeft}>
                    <FlagImage countryCode={item.code} size={22} />
                    <View style={styles.listItemMeta}>
                      <Text style={[styles.listItemTitle, isSelected && styles.listItemTitleActive]}>
                        {item.name}
                      </Text>
                      <Text style={styles.listItemSubtitle}>
                        {item.code} {item.currency ? `• Default Currency: ${item.currency}` : ''}
                      </Text>
                    </View>
                  </View>
                  {isSelected ? (
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkBadgeText}>✓</Text>
                    </View>
                  ) : (
                    <Text style={styles.chevron}>›</Text>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        ) : (
          <FlatList
            data={filteredCurrencies}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => {
              const isSelected = item.code === currency;
              // Sample conversion for context
              const sampleZar = 1000;
              const convertedPreview = formatPrice(sampleZar, item.code);

              return (
                <TouchableOpacity
                  style={[styles.listItem, isSelected && styles.listItemSelected]}
                  onPress={() => handleSelectCurrency(item.code)}
                  activeOpacity={0.7}
                >
                  <View style={styles.listItemLeft}>
                    <FlagImage countryCode={item.flagCountry} size={22} />
                    <View style={[styles.currencyIconWrap, isSelected && styles.currencyIconWrapActive]}>
                      <Text style={[styles.currencyIconText, isSelected && styles.currencyIconTextActive]}>
                        {item.symbol}
                      </Text>
                    </View>
                    <View style={styles.listItemMeta}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.listItemTitle, isSelected && styles.listItemTitleActive]}>
                          {item.code}
                        </Text>
                        <Text style={styles.currencyDot}>•</Text>
                        <Text style={styles.currencyFullName} numberOfLines={1}>
                          {item.name}
                        </Text>
                      </View>
                      <Text style={styles.listItemSubtitle}>
                        R1,000 ≈ {convertedPreview}
                      </Text>
                    </View>
                  </View>
                  {isSelected ? (
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkBadgeText}>✓</Text>
                    </View>
                  ) : (
                    <Text style={styles.chevron}>›</Text>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* Footer Done Action */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#ffd700', '#d4af37', '#aa8024']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.doneGradient}
            >
              <Text style={styles.doneBtnText}>Confirm Preferences ({countryCode} • {currency})</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </ModalRN>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#100e0b',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(201, 163, 91, 0.35)',
    maxHeight: screenHeight * 0.85,
    minHeight: screenHeight * 0.65,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  dragPillWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  dragPill: {
    width: 44,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerEyebrow: {
    fontSize: 9,
    fontFamily: APP_FONT,
    color: '#c9a35b',
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: APP_FONT,
    color: '#ffffff',
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#d4af37',
    fontSize: 14,
    fontWeight: '700',
  },
  summaryBar: {
    marginHorizontal: 18,
    marginBottom: 14,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  summaryItem: {
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginHorizontal: 12,
  },
  summaryLabel: {
    fontSize: 8.5,
    fontFamily: APP_FONT,
    color: '#a39783',
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryValue: {
    fontSize: 12,
    fontFamily: APP_FONT,
    color: '#f5d77f',
    fontWeight: '700',
    flexShrink: 1,
  },
  summaryCurrencyBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffd700',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    gap: 10,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: '#16130e',
  },
  tabButtonActive: {
    borderColor: '#ffd700',
  },
  activeTabGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },
  inactiveTabContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },
  tabTextActive: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.3,
  },
  tabTextInactive: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d4c7b2',
  },
  tabSymbolBadgeActive: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
  },
  tabSymbolBadgeInactive: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffd700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginBottom: 12,
    backgroundColor: '#191510',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(201, 163, 91, 0.25)',
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 13,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    fontFamily: APP_FONT,
    paddingVertical: 0,
  },
  searchClearBtn: {
    padding: 4,
  },
  searchClearText: {
    color: '#a39783',
    fontSize: 12,
  },
  listContainer: {
    paddingHorizontal: 18,
    paddingBottom: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#17130f',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  listItemSelected: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderColor: 'rgba(212, 175, 55, 0.5)',
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  flagImage: {
    borderRadius: 3,
  },
  flagFallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagFallbackText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#d4af37',
  },
  listItemMeta: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 14,
    fontFamily: APP_FONT,
    fontWeight: '700',
    color: '#f0ece1',
  },
  listItemTitleActive: {
    color: '#ffd700',
  },
  listItemSubtitle: {
    fontSize: 11,
    fontFamily: APP_FONT,
    color: '#8c806e',
    marginTop: 2,
  },
  currencyIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#241e17',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  currencyIconWrapActive: {
    backgroundColor: '#ffd700',
    borderColor: '#ffd700',
  },
  currencyIconText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffd700',
  },
  currencyIconTextActive: {
    color: '#000000',
  },
  currencyDot: {
    color: '#666',
    fontSize: 12,
  },
  currencyFullName: {
    fontSize: 12,
    color: '#a39783',
    flexShrink: 1,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffd700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
  },
  chevron: {
    fontSize: 18,
    color: '#554f44',
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  doneBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  doneGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
    fontFamily: APP_FONT,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
