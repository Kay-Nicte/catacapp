import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Icon } from '../components/ui/Icon';
import { AnimatedPressable } from '../components/ui/AnimatedPressable';
import { useTheme } from '../theme/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { shadows } from '../theme/tokens';
import {
  usePremium,
  PREMIUM_FEATURES,
  PREMIUM_PRICES,
  PremiumPlan,
} from '../app/state/PremiumContext';
import { useTranslation } from 'react-i18next';
import i18n, { getLocale } from '../i18n';

export default function PremiumScreen() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isPremium, status, subscribe, redeemCode, restore } = usePremium();

  const [selectedPlan, setSelectedPlan] = useState<PremiumPlan>('yearly');
  const [isLoading, setIsLoading] = useState(false);
  const [redeemInput, setRedeemInput] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  const handleSubscribe = async () => {
    if (isLoading) return;

    setIsLoading(true);
    const result = await subscribe(selectedPlan);
    setIsLoading(false);

    if (result.success) {
      Alert.alert(
        tr('premium.welcomeTitle'),
        tr('premium.welcomeMsg'),
        [{ text: tr('premium.great'), onPress: () => navigation.goBack() }]
      );
    } else {
      Alert.alert(tr('common.error'), result.error || tr('premium.purchaseError'));
    }
  };

  const handleRedeem = async () => {
    if (isRedeeming || !redeemInput.trim()) return;

    setIsRedeeming(true);
    const result = await redeemCode(redeemInput);
    setIsRedeeming(false);

    if (result.success) {
      Alert.alert(
        tr('premium.welcomeTitle'),
        tr('premium.welcomeMsg'),
        [{ text: tr('premium.great'), onPress: () => navigation.goBack() }]
      );
    } else {
      Alert.alert(tr('common.error'), result.error || tr('premium.invalidCode'));
    }
  };

  const handleRestore = async () => {
    setIsLoading(true);
    const result = await restore();
    setIsLoading(false);

    if (result.success) {
      Alert.alert(tr('premium.restored'), tr('premium.restoredMsg'));
    } else {
      Alert.alert(tr('premium.noPurchases'), result.error || tr('premium.noPurchasesMsg'));
    }
  };

  if (isPremium) {
    return (
      <View style={[styles.container, { backgroundColor: t.bg, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <AnimatedPressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Icon name="close" size={28} color={t.text} />
          </AnimatedPressable>
        </View>

        <View style={styles.premiumActiveSection}>
          <View style={[styles.premiumBadge, { backgroundColor: t.accent }, shadows.lg]}>
            <Icon name="diamond" size={48} color="#fff" />
          </View>
          <Text style={[styles.premiumTitle, { color: t.text }]}>{tr('premium.youArePremium')}</Text>
          <Text style={[styles.premiumSubtitle, { color: t.textMuted }]}>
            {tr('premium.enjoyAll')}
          </Text>

          <View style={[styles.planInfo, { backgroundColor: t.card, borderColor: t.border }, shadows.md]}>
            <Text style={[styles.planInfoLabel, { color: t.textMuted }]}>{tr('premium.yourPlan')}</Text>
            <Text style={[styles.planInfoValue, { color: t.text }]}>
              {status.plan === 'monthly' && tr('premium.planMonthly')}
              {status.plan === 'yearly' && tr('premium.planYearly')}
              {status.plan === 'lifetime' && tr('premium.planLifetime')}
            </Text>
            {status.expiresAt && (
              <>
                <Text style={[styles.planInfoLabel, { color: t.textMuted, marginTop: 12 }]}>
                  {tr('premium.validUntil')}
                </Text>
                <Text style={[styles.planInfoValue, { color: t.text }]}>
                  {new Date(status.expiresAt).toLocaleDateString(getLocale(), {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top, paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <AnimatedPressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Icon name="close" size={28} color={t.text} />
          </AnimatedPressable>
        </View>

        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={[styles.heroBadge, { backgroundColor: t.accent }, shadows.lg]}>
            <Icon name="diamond" size={40} color="#fff" />
          </View>
          <Text style={[styles.heroTitle, { color: t.text }]}>{tr('premium.title')}</Text>
          <Text style={[styles.heroSubtitle, { color: t.textMuted }]}>
            {tr('premium.subtitle')}
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          {PREMIUM_FEATURES.map((feature) => (
            <View
              key={feature.id}
              style={[styles.featureRow, { backgroundColor: t.card, borderColor: t.border }, shadows.sm]}
            >
              <View style={[styles.featureIcon, { backgroundColor: t.accentSoft }]}>
                <Icon name={feature.icon as any} size={22} color={t.accent} />
              </View>
              <View style={styles.featureContent}>
                <Text style={[styles.featureName, { color: t.text }]}>{tr(`premium.features.${feature.id}.name`)}</Text>
                <Text style={[styles.featureDesc, { color: t.textMuted }]}>
                  {tr(`premium.features.${feature.id}.desc`)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Plans */}
        <Text style={[styles.plansTitle, { color: t.text }]}>{tr('premium.choosePlan')}</Text>

        <AnimatedPressable
          onPress={() => setSelectedPlan('yearly')}
          style={[
            styles.planCard,
            {
              backgroundColor: t.card,
              borderColor: selectedPlan === 'yearly' ? t.accent : t.border,
              borderWidth: selectedPlan === 'yearly' ? 2 : 1,
            },
            selectedPlan === 'yearly' ? shadows.md : shadows.sm,
          ]}
        >
          {PREMIUM_PRICES.yearly.savings && (
            <View style={[styles.savingsBadge, { backgroundColor: t.accent }]}>
              <Text style={styles.savingsText}>{tr('premium.save', { amount: PREMIUM_PRICES.yearly.savings })}</Text>
            </View>
          )}
          <View style={styles.planHeader}>
            <View style={styles.planRadio}>
              <View
                style={[
                  styles.radioOuter,
                  { borderColor: selectedPlan === 'yearly' ? t.accent : t.border },
                ]}
              >
                {selectedPlan === 'yearly' && (
                  <View style={[styles.radioInner, { backgroundColor: t.accent }]} />
                )}
              </View>
            </View>
            <View style={styles.planDetails}>
              <Text style={[styles.planName, { color: t.text }]}>{tr('premium.planYearly')}</Text>
              <Text style={[styles.planPeriod, { color: t.textMuted }]}>
                {tr('premium.billedYearly')}
              </Text>
            </View>
            <View style={styles.planPricing}>
              <Text style={[styles.planPrice, { color: t.text }]}>
                {PREMIUM_PRICES.yearly.price}€
              </Text>
              <Text style={[styles.planPriceUnit, { color: t.textMuted }]}>{tr('premium.perYear')}</Text>
            </View>
          </View>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={() => setSelectedPlan('monthly')}
          style={[
            styles.planCard,
            {
              backgroundColor: t.card,
              borderColor: selectedPlan === 'monthly' ? t.accent : t.border,
              borderWidth: selectedPlan === 'monthly' ? 2 : 1,
            },
            selectedPlan === 'monthly' ? shadows.md : shadows.sm,
          ]}
        >
          <View style={styles.planHeader}>
            <View style={styles.planRadio}>
              <View
                style={[
                  styles.radioOuter,
                  { borderColor: selectedPlan === 'monthly' ? t.accent : t.border },
                ]}
              >
                {selectedPlan === 'monthly' && (
                  <View style={[styles.radioInner, { backgroundColor: t.accent }]} />
                )}
              </View>
            </View>
            <View style={styles.planDetails}>
              <Text style={[styles.planName, { color: t.text }]}>{tr('premium.planMonthly')}</Text>
              <Text style={[styles.planPeriod, { color: t.textMuted }]}>
                {tr('premium.cancelAnytime')}
              </Text>
            </View>
            <View style={styles.planPricing}>
              <Text style={[styles.planPrice, { color: t.text }]}>
                {PREMIUM_PRICES.monthly.price}€
              </Text>
              <Text style={[styles.planPriceUnit, { color: t.textMuted }]}>{tr('premium.perMonth')}</Text>
            </View>
          </View>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={() => setSelectedPlan('lifetime')}
          style={[
            styles.planCard,
            {
              backgroundColor: t.card,
              borderColor: selectedPlan === 'lifetime' ? t.accent : t.border,
              borderWidth: selectedPlan === 'lifetime' ? 2 : 1,
            },
            selectedPlan === 'lifetime' ? shadows.md : shadows.sm,
          ]}
        >
          <View style={styles.planHeader}>
            <View style={styles.planRadio}>
              <View
                style={[
                  styles.radioOuter,
                  { borderColor: selectedPlan === 'lifetime' ? t.accent : t.border },
                ]}
              >
                {selectedPlan === 'lifetime' && (
                  <View style={[styles.radioInner, { backgroundColor: t.accent }]} />
                )}
              </View>
            </View>
            <View style={styles.planDetails}>
              <Text style={[styles.planName, { color: t.text }]}>{tr('premium.planLifetime')}</Text>
              <Text style={[styles.planPeriod, { color: t.textMuted }]}>
                {tr('premium.oneTimePayment')}
              </Text>
            </View>
            <View style={styles.planPricing}>
              <Text style={[styles.planPrice, { color: t.text }]}>
                {PREMIUM_PRICES.lifetime.price}€
              </Text>
            </View>
          </View>
        </AnimatedPressable>

        {/* Subscribe Button */}
        <AnimatedPressable
          onPress={handleSubscribe}
          disabled={isLoading}
          style={[styles.subscribeButton, { backgroundColor: t.accent, opacity: isLoading ? 0.7 : 1 }, shadows.md]}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.subscribeButtonText}>{tr('premium.subscribe')}</Text>
          )}
        </AnimatedPressable>

        {/* Redeem Code */}
        <View style={[styles.redeemSection, { borderColor: t.border }]}>
          <Text style={[styles.redeemTitle, { color: t.text }]}>{tr('premium.redeemTitle')}</Text>
          <View style={styles.redeemRow}>
            <TextInput
              value={redeemInput}
              onChangeText={setRedeemInput}
              placeholder={tr('premium.redeemPlaceholder')}
              placeholderTextColor={t.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              style={[styles.redeemInput, { color: t.text, borderColor: t.border, backgroundColor: t.card }]}
            />
            <AnimatedPressable
              onPress={handleRedeem}
              disabled={isRedeeming || !redeemInput.trim()}
              style={[styles.redeemButton, { backgroundColor: t.accent, opacity: isRedeeming || !redeemInput.trim() ? 0.5 : 1 }]}
            >
              {isRedeeming ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.redeemButtonText}>{tr('premium.redeemButton')}</Text>
              )}
            </AnimatedPressable>
          </View>
        </View>

        {/* Restore */}
        <AnimatedPressable onPress={handleRestore} style={styles.restoreButton}>
          <Text style={[styles.restoreText, { color: t.textMuted }]}>
            {tr('premium.restore')}
          </Text>
        </AnimatedPressable>

        {/* Terms */}
        <Text style={[styles.terms, { color: t.textMuted }]}>
          {tr('premium.terms')}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 16,
  },

  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heroBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },

  featuresSection: {
    gap: 10,
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: { flex: 1, gap: 2 },
  featureName: { fontSize: 15, fontWeight: '700' },
  featureDesc: { fontSize: 13, fontWeight: '500' },

  plansTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },

  planCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  savingsBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomLeftRadius: 12,
  },
  savingsText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planRadio: {
    marginRight: 14,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  planDetails: { flex: 1, gap: 2 },
  planName: { fontSize: 17, fontWeight: '700' },
  planPeriod: { fontSize: 13, fontWeight: '500' },
  planPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: { fontSize: 24, fontWeight: '800' },
  planPriceUnit: { fontSize: 14, fontWeight: '600', marginLeft: 2 },

  subscribeButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },

  redeemSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  redeemTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  redeemRow: {
    flexDirection: 'row',
    gap: 10,
  },
  redeemInput: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  redeemButton: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redeemButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },

  restoreButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '600',
  },

  terms: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },

  premiumActiveSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  premiumBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  premiumTitle: {
    fontSize: 28,
    fontWeight: '800',
  },
  premiumSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
  planInfo: {
    marginTop: 32,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
  },
  planInfoLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  planInfoValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
});
