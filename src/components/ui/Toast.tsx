import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../../theme/fonts';
import { Icon } from './Icon';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  title: string;
  message?: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (title: string, message?: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

function ToastItem({ toast, onDone }: { toast: ToastMessage; onDone: (id: number) => void }) {
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-20);

  const colors = {
    success: { bg: '#1a3a2a', border: '#2d6a4f', icon: '#52b788', iconName: 'checkmark-circle' },
    error: { bg: '#3a1a1a', border: '#6a2d2d', icon: '#e57373', iconName: 'close-circle' },
    info: { bg: '#1a2a3a', border: '#2d4f6a', icon: '#64b5f6', iconName: 'information-circle' },
  };

  const c = colors[toast.type];

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 250 });
    translateY.value = withTiming(0, { duration: 250 });

    // Auto dismiss
    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(-20, { duration: 200 }, () => {
        runOnJS(onDone)(toast.id);
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: c.bg, borderColor: c.border, top: insets.top + 10 },
        animatedStyle,
      ]}
    >
      <Icon name={c.iconName} size={20} color={c.icon} />
      <Animated.View style={styles.toastContent}>
        <Text style={[styles.toastTitle, { color: '#fff' }]} numberOfLines={1}>{toast.title}</Text>
        {toast.message ? (
          <Text style={[styles.toastMessage, { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={2}>
            {toast.message}
          </Text>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((title: string, message?: string, type: ToastType = 'info') => {
    const id = ++idRef.current;
    setToasts(prev => [...prev.slice(-2), { id, title, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.map((toast, index) => (
        <ToastItem key={toast.id} toast={toast} onDone={removeToast} />
      ))}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  toastContent: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  toastMessage: {
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
});
