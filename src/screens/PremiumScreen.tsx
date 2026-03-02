import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { PACKAGE_TYPE, PurchasesPackage } from 'react-native-purchases';
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
} from '../app/state/PremiumContext';
import ScreenContainer from '../components/layout/ScreenContainer';
import { useTranslation } from 'react-i18next';
import { getLocale } from '../i18n';

import { fonts } from '../theme/fonts';
type PlanKey = 'monthly' | 'yearly' | 'lifetime';

interface DisplayPlan {
  key: PlanKey;
  pkg: PurchasesPackage | null;
  priceString: string;
  savings?: string;
}

function getPackagePlanKey(pkg: PurchasesPackage): PlanKey | null {
  switch (pkg.packageType) {
    case PACKAGE_TYPE.MONTHLY:
      return 'monthly';
    case PACKAGE_TYPE.ANNUAL:
      return 'yearly';
    case PACKAGE_TYPE.LIFETIME:
      return 'lifetime';
    default:
      if (pkg.identifier.includes('monthly')) return 'monthly';
      if (pkg.identifier.includes('yearly') || pkg.identifier.includes('annual')) return 'yearly';
      if (pkg.identifier.includes('lifetime')) return 'lifetime';
      return null;
  }
}

export default function PremiumScreen() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isPremium, status, subscribe, redeemCode, restore, packages } = usePremium();

  const [selectedPlanKey, setSelectedPlanKey] = useState<PlanKey>('yearly');
  const [isLoading, setIsLoading] = useState(false);
  const [redeemInput, setRedeemInput] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Build display plans from RevenueCat packages or fallback to static prices
  const displayPlans: DisplayPlan[] = useMemo(() => {
    const plans: DisplayPlan[] = [];
    const foundKeys = new Set<PlanKey>();

    // Map RevenueCat packages to display plans
    for (const pkg of packages) {
      const key = getPackagePlanKey(pkg);
      if (key && !foundKeys.has(key)) {
        foundKeys.add(key);
        plans.push({
          key,
          pkg,
          priceString: pkg.product.priceString,
          savings: key === 'yearly' ? PREMIUM_PRICES.yearly.savings : undefined,
        });
      }
    }

    // Fallback: if any plan is missing, use static prices
    if (!foundKeys.has('yearly')) {
      plans.push({
        key: 'yearly',
        pkg: null,
        priceString: `${PREMIUM_PRICES.yearly.price}€`,
        savings: PREMIUM_PRICES.yearly.savings,
      });
    }
    if (!foundKeys.has('monthly')) {
      plans.push({
        key: 'monthly',
        pkg: null,
        priceString: `${PREMIUM_PRICES.monthly.price}€`,
      });
    }
    if (!foundKeys.has('lifetime')) {
      plans.push({
        key: 'lifetime',
        pkg: null,
        priceString: `${PREMIUM_PRICES.lifetime.price}€`,
      });
    }

    // Sort: yearly first, then monthly, then lifetime
    const order: PlanKey[] = ['yearly', 'monthly', 'lifetime'];
    plans.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));

    return plans;
  }, [packages]);

  const selectedPlan = displayPlans.find((p) => p.key === selectedPlanKey);

  const handleSubscribe = async () => {
    if (isLoading || !selectedPlan) return;

    if (!selectedPlan.pkg) {
      // No RevenueCat package available — offerings didn't load
      Alert.alert(
        tr('common.error'),
        `${tr('premium.purchaseError')}\n\n[offerings_empty] No se pudieron cargar los productos de Google Play. Packages: ${packages.length}`
      );
      return;
    }

    setIsLoading(true);
    const result = await subscribe(selectedPlan.pkg);
    setIsLoading(false);

    if (result.error === 'cancelled') return;

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
        <ScreenContainer>
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
        </ScreenContainer>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <ScreenContainer>
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

        {displayPlans.map((plan) => (
          <AnimatedPressable
            key={plan.key}
            onPress={() => setSelectedPlanKey(plan.key)}
            style={[
              styles.planCard,
              {
                backgroundColor: t.card,
                borderColor: selectedPlanKey === plan.key ? t.accent : t.border,
                borderWidth: selectedPlanKey === plan.key ? 2 : 1,
              },
              selectedPlanKey === plan.key ? shadows.md : shadows.sm,
            ]}
          >
            {plan.savings && (
              <View style={[styles.savingsBadge, { backgroundColor: t.accent }]}>
                <Text style={styles.savingsText}>{tr('premium.save', { amount: plan.savings })}</Text>
              </View>
            )}
            <View style={styles.planHeader}>
              <View style={styles.planRadio}>
                <View
                  style={[
                    styles.radioOuter,
                    { borderColor: selectedPlanKey === plan.key ? t.accent : t.border },
                  ]}
                >
                  {selectedPlanKey === plan.key && (
                    <View style={[styles.radioInner, { backgroundColor: t.accent }]} />
                  )}
                </View>
              </View>
              <View style={styles.planDetails}>
                <Text style={[styles.planName, { color: t.text }]}>
                  {plan.key === 'yearly' && tr('premium.planYearly')}
                  {plan.key === 'monthly' && tr('premium.planMonthly')}
                  {plan.key === 'lifetime' && tr('premium.planLifetime')}
                </Text>
                <Text style={[styles.planPeriod, { color: t.textMuted }]}>
                  {plan.key === 'yearly' && tr('premium.billedYearly')}
                  {plan.key === 'monthly' && tr('premium.cancelAnytime')}
                  {plan.key === 'lifetime' && tr('premium.oneTimePayment')}
                </Text>
              </View>
              <View style={styles.planPricing}>
                <Text style={[styles.planPrice, { color: t.text }]}>
                  {plan.priceString}
                </Text>
                {plan.key !== 'lifetime' && (
                  <Text style={[styles.planPriceUnit, { color: t.textMuted }]}>
                    {plan.key === 'yearly' ? tr('premium.perYear') : tr('premium.perMonth')}
                  </Text>
                )}
              </View>
            </View>
          </AnimatedPressable>
        ))}

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
      </ScreenContainer>
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
    fontFamily: fonts.extraBold,
  },
  heroSubtitle: {
    fontSize: 15,
    fontFamily: fonts.medium,
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
  featureName: { fontSize: 15, fontFamily: fonts.bold },
  featureDesc: { fontSize: 13, fontFamily: fonts.medium },

  plansTitle: {
    fontSize: 20,
    fontFamily: fonts.extraBold,
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
    fontFamily: fonts.extraBold,
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
  planName: { fontSize: 17, fontFamily: fonts.bold },
  planPeriod: { fontSize: 13, fontFamily: fonts.medium },
  planPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: { fontSize: 24, fontFamily: fonts.extraBold },
  planPriceUnit: { fontSize: 14, fontFamily: fonts.semiBold, marginLeft: 2 },

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
    fontFamily: fonts.extraBold,
  },

  redeemSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  redeemTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
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
    fontFamily: fonts.bold,
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
    fontFamily: fonts.extraBold,
  },

  restoreButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  restoreText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
  },

  terms: {
    fontSize: 12,
    fontFamily: fonts.medium,
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
    fontFamily: fonts.extraBold,
  },
  premiumSubtitle: {
    fontSize: 16,
    fontFamily: fonts.medium,
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
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
  planInfoValue: {
    fontSize: 18,
    fontFamily: fonts.extraBold,
    marginTop: 4,
  },
});
