import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Icon } from '../components/ui/Icon';
import { AnimatedPressable } from '../components/ui/AnimatedPressable';
import { useTheme } from '../theme/useTheme';
import { shadows } from '../theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { usePet } from '../app/state/PetContext';
import { useRecords } from '../app/state/RecordsContext';
import { usePremium } from '../app/state/PremiumContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 40;
const CHART_HEIGHT = 200;

interface DataPoint {
  label: string;
  value: number;
}

function SimpleBarChart({
  data,
  color,
  title,
  unit,
}: {
  data: DataPoint[];
  color: string;
  title: string;
  unit: string;
}) {
  const t = useTheme();
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={[styles.chartCard, { backgroundColor: t.card, borderColor: t.border }, shadows.sm]}>
      <Text style={[styles.chartTitle, { color: t.text }]}>{title}</Text>

      <View style={styles.chartContainer}>
        <View style={styles.barsContainer}>
          {data.map((point, index) => {
            const barHeight = (point.value / maxValue) * (CHART_HEIGHT - 40);
            return (
              <View key={index} style={styles.barColumn}>
                <Text style={[styles.barValue, { color: t.textMuted }]}>
                  {point.value > 0 ? point.value : ''}
                </Text>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(barHeight, 4),
                      backgroundColor: point.value > 0 ? color : t.border,
                    },
                  ]}
                />
                <Text style={[styles.barLabel, { color: t.textMuted }]}>{point.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <Text style={[styles.chartUnit, { color: t.textMuted }]}>{unit}</Text>
    </View>
  );
}

function SimpleLineChart({
  data,
  color,
  title,
  unit,
}: {
  data: DataPoint[];
  color: string;
  title: string;
  unit: string;
}) {
  const t = useTheme();

  if (data.length === 0) {
    return (
      <View style={[styles.chartCard, { backgroundColor: t.card, borderColor: t.border }, shadows.sm]}>
        <Text style={[styles.chartTitle, { color: t.text }]}>{title}</Text>
        <View style={styles.emptyChart}>
          <Icon name="analytics" size={36} color={t.textMuted} />
          <Text style={[styles.emptyChartText, { color: t.textMuted }]}>
            Sin datos de peso registrados
          </Text>
        </View>
        <Text style={[styles.chartUnit, { color: t.textMuted }]}>{unit}</Text>
      </View>
    );
  }

  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;
  const padding = range * 0.1;
  const yMin = minValue - padding;
  const yMax = maxValue + padding;
  const yRange = yMax - yMin;

  const LINE_CHART_HEIGHT = CHART_HEIGHT - 40;
  const LINE_CHART_WIDTH = CHART_WIDTH - 32;
  const pointSpacing = data.length > 1 ? LINE_CHART_WIDTH / (data.length - 1) : 0;

  const points = data.map((d, i) => ({
    x: data.length === 1 ? LINE_CHART_WIDTH / 2 : i * pointSpacing,
    y: LINE_CHART_HEIGHT - ((d.value - yMin) / yRange) * LINE_CHART_HEIGHT,
  }));

  // Build SVG-like path using line segments
  const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    segments.push({
      x1: points[i].x,
      y1: points[i].y,
      x2: points[i + 1].x,
      y2: points[i + 1].y,
    });
  }

  return (
    <View style={[styles.chartCard, { backgroundColor: t.card, borderColor: t.border }, shadows.sm]}>
      <Text style={[styles.chartTitle, { color: t.text }]}>{title}</Text>

      {/* Y-axis labels */}
      <View style={styles.lineChartWrapper}>
        <View style={styles.yAxisLabels}>
          <Text style={[styles.yLabel, { color: t.textMuted }]}>{maxValue.toFixed(1)}</Text>
          <Text style={[styles.yLabel, { color: t.textMuted }]}>
            {((minValue + maxValue) / 2).toFixed(1)}
          </Text>
          <Text style={[styles.yLabel, { color: t.textMuted }]}>{minValue.toFixed(1)}</Text>
        </View>

        <View style={[styles.lineChartContainer, { height: LINE_CHART_HEIGHT }]}>
          {/* Grid lines */}
          {[0, 0.5, 1].map((frac, i) => (
            <View
              key={i}
              style={[
                styles.gridLine,
                { top: frac * LINE_CHART_HEIGHT, backgroundColor: t.border },
              ]}
            />
          ))}

          {/* Line segments */}
          {segments.map((seg, i) => {
            const dx = seg.x2 - seg.x1;
            const dy = seg.y2 - seg.y1;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            return (
              <View
                key={`line-${i}`}
                style={{
                  position: 'absolute',
                  left: seg.x1,
                  top: seg.y1,
                  width: length,
                  height: 2.5,
                  backgroundColor: color,
                  borderRadius: 1.25,
                  transform: [{ rotate: `${angle}deg` }],
                  transformOrigin: 'left center',
                }}
              />
            );
          })}

          {/* Data points */}
          {points.map((p, i) => (
            <View
              key={`point-${i}`}
              style={[styles.dataPoint, {
                left: p.x - 5,
                top: p.y - 5,
                backgroundColor: color,
                borderColor: t.card,
              }]}
            />
          ))}
        </View>
      </View>

      {/* X-axis labels */}
      <View style={[styles.xAxisLabels, { marginLeft: 36 }]}>
        {data.map((d, i) => (
          <Text
            key={i}
            style={[
              styles.xLabel,
              { color: t.textMuted },
              data.length === 1 && { textAlign: 'center', flex: 1 },
            ]}
          >
            {d.label}
          </Text>
        ))}
      </View>

      <Text style={[styles.chartUnit, { color: t.textMuted }]}>{unit}</Text>
    </View>
  );
}

function StatCard({
  icon,
  title,
  value,
  subtitle,
}: {
  icon: string;
  title: string;
  value: string;
  subtitle: string;
}) {
  const t = useTheme();

  return (
    <View style={[styles.statCard, { backgroundColor: t.card, borderColor: t.border }, shadows.sm]}>
      <View style={[styles.statIcon, { backgroundColor: t.accentSoft }]}>
        <Icon name={icon} size={22} color={t.accent} />
      </View>
      <Text style={[styles.statTitle, { color: t.textMuted }]}>{title}</Text>
      <Text style={[styles.statValue, { color: t.text }]}>{value}</Text>
      <Text style={[styles.statSubtitle, { color: t.textMuted }]}>{subtitle}</Text>
    </View>
  );
}

export default function ChartsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { selectedPet, selectedPetId } = usePet();
  const { records } = useRecords();
  const { isPremium } = usePremium();

  // Filtrar registros de los últimos 7 días para la mascota seleccionada
  const last7Days = useMemo(() => {
    const days: string[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  }, []);

  const petRecords = useMemo(
    () => records.filter((r) => r.petId === selectedPetId),
    [records, selectedPetId]
  );

  // Datos de comidas por día
  const foodData: DataPoint[] = useMemo(() => {
    return last7Days.map((day) => {
      const dayRecords = petRecords.filter(
        (r) => r.type === 'FOOD' && r.timestamp.split('T')[0] === day
      );
      return {
        label: new Date(day).toLocaleDateString('es-ES', { weekday: 'short' }).slice(0, 2),
        value: dayRecords.length,
      };
    });
  }, [last7Days, petRecords]);

  // Datos de deposiciones por día
  const poopData: DataPoint[] = useMemo(() => {
    return last7Days.map((day) => {
      const dayRecords = petRecords.filter(
        (r) => r.type === 'POOP' && r.timestamp.split('T')[0] === day
      );
      return {
        label: new Date(day).toLocaleDateString('es-ES', { weekday: 'short' }).slice(0, 2),
        value: dayRecords.length,
      };
    });
  }, [last7Days, petRecords]);

  // Datos de sueño por día (horas totales)
  const sleepData: DataPoint[] = useMemo(() => {
    return last7Days.map((day) => {
      const dayRecords = petRecords.filter(
        (r) => r.type === 'SLEEP' && r.timestamp.split('T')[0] === day
      );
      const totalHours = dayRecords.reduce((acc, r) => {
        const match = r.value.match(/(\d+(?:[.,]\d+)?)/);
        return acc + (match ? parseFloat(match[1].replace(',', '.')) : 0);
      }, 0);
      return {
        label: new Date(day).toLocaleDateString('es-ES', { weekday: 'short' }).slice(0, 2),
        value: Math.round(totalHours * 10) / 10,
      };
    });
  }, [last7Days, petRecords]);

  // Datos de evolución de peso (últimos 10 registros)
  const weightData: DataPoint[] = useMemo(() => {
    return petRecords
      .filter((r) => r.type === 'WEIGHT')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-10)
      .map((r) => {
        const num = parseFloat(r.value.replace(/[^0-9.,]/g, '').replace(',', '.'));
        const date = new Date(r.timestamp);
        return {
          label: `${date.getDate()}/${date.getMonth() + 1}`,
          value: isNaN(num) ? 0 : num,
        };
      })
      .filter((d) => d.value > 0);
  }, [petRecords]);

  // Estadísticas generales
  const stats = useMemo(() => {
    const totalFood = petRecords.filter((r) => r.type === 'FOOD').length;
    const totalPoop = petRecords.filter((r) => r.type === 'POOP').length;
    const totalSleep = petRecords.filter((r) => r.type === 'SLEEP').length;
    const weightRecords = petRecords
      .filter((r) => r.type === 'WEIGHT')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const lastWeight = weightRecords.length > 0 ? weightRecords[0].value : null;

    return { totalFood, totalPoop, totalSleep, lastWeight };
  }, [petRecords]);

  if (!isPremium) {
    return (
      <View style={[styles.lockedContainer, { backgroundColor: t.bg, paddingTop: insets.top }]}>
        <View style={styles.lockedContent}>
          <View style={[styles.lockedIcon, { backgroundColor: t.accentSoft }]}>
            <Icon name="lock-closed" size={48} color={t.accent} />
          </View>
          <Text style={[styles.lockedTitle, { color: t.text }]}>Función Premium</Text>
          <Text style={[styles.lockedDesc, { color: t.textMuted }]}>
            Los gráficos y estadísticas están disponibles para usuarios Premium.
            Desbloquea esta función para ver la evolución de tu mascota.
          </Text>
          <AnimatedPressable
            onPress={() => (navigation as any).navigate('Premium')}
            style={[styles.unlockButton, { backgroundColor: t.accent }]}
          >
            <Icon name="diamond" size={20} color="#fff" />
            <Text style={styles.unlockButtonText}>Ver planes Premium</Text>
          </AnimatedPressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.bg, paddingTop: insets.top + 6 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.logo, { backgroundColor: t.accent }]}>
            <Icon name="paw" size={18} color="#fff" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: t.text }]}>Estadísticas</Text>
            {selectedPet?.name && (
              <Text style={[styles.headerSubtitle, { color: t.textMuted }]}>
                {selectedPet.name}
              </Text>
            )}
          </View>
        </View>
        <View style={[styles.premiumBadge, { backgroundColor: t.accentSoft }]}>
          <Icon name="diamond" size={14} color={t.accent} />
          <Text style={[styles.premiumBadgeText, { color: t.accent }]}>Premium</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="restaurant"
            title="Comidas"
            value={stats.totalFood.toString()}
            subtitle="registros totales"
          />
          <StatCard
            icon="water"
            title="Deposiciones"
            value={stats.totalPoop.toString()}
            subtitle="registros totales"
          />
          <StatCard
            icon="moon"
            title="Sueño"
            value={stats.totalSleep.toString()}
            subtitle="registros totales"
          />
          <StatCard
            icon="fitness"
            title="Peso actual"
            value={stats.lastWeight || "—"}
            subtitle={stats.lastWeight ? "último registro" : "sin registros"}
          />
        </View>

        {/* Charts */}
        <Text style={[styles.sectionTitle, { color: t.textMuted }]}>ÚLTIMOS 7 DÍAS</Text>

        <SimpleBarChart
          data={foodData}
          color={t.accent}
          title="Comidas registradas"
          unit="registros por día"
        />

        <SimpleBarChart
          data={poopData}
          color="#4CAF50"
          title="Deposiciones"
          unit="registros por día"
        />

        <SimpleBarChart
          data={sleepData}
          color="#7C4DFF"
          title="Horas de sueño"
          unit="horas por día"
        />

        {/* Evolución de peso */}
        <Text style={[styles.sectionTitle, { color: t.textMuted, marginTop: 12 }]}>EVOLUCIÓN DE PESO</Text>

        <SimpleLineChart
          data={weightData}
          color="#FF7043"
          title="Peso"
          unit="últimos 10 registros (kg)"
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lockedContainer: { flex: 1 },
  lockedContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  lockedIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  lockedTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
  },
  lockedDesc: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    height: 52,
    borderRadius: 26,
  },
  unlockButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 30, fontWeight: '700' },
  headerSubtitle: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
    marginBottom: 24,
  },
  statCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  statValue: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  statSubtitle: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  chartCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16,
  },
  chartContainer: {
    height: CHART_HEIGHT,
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingBottom: 24,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barValue: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  bar: {
    width: 28,
    borderRadius: 6,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
    textTransform: 'capitalize',
  },
  chartUnit: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },

  lineChartWrapper: {
    flexDirection: 'row',
  },
  yAxisLabels: {
    width: 36,
    justifyContent: 'space-between',
    paddingVertical: 2,
    height: CHART_HEIGHT - 40,
  },
  yLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'right',
    paddingRight: 6,
  },
  lineChartContainer: {
    flex: 1,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.5,
  },
  dataPoint: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  xLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyChart: {
    height: CHART_HEIGHT - 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyChartText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
