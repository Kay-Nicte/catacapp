import React, { useCallback, useMemo, forwardRef, useImperativeHandle, useRef } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/useTheme";
import { Icon } from "./Icon";
import { haptics } from "../../utils/haptics";

export interface AppBottomSheetRef {
  open: () => void;
  close: () => void;
  snapToIndex: (index: number) => void;
}

interface AppBottomSheetProps {
  snapPoints?: (string | number)[];
  title?: string;
  subtitle?: string;
  onClose?: () => void;
  children: React.ReactNode;
  scrollable?: boolean;
  showCloseButton?: boolean;
  enablePanDownToClose?: boolean;
}

export const AppBottomSheet = forwardRef<AppBottomSheetRef, AppBottomSheetProps>(
  (
    {
      snapPoints = ["50%"],
      title,
      subtitle,
      onClose,
      children,
      scrollable = false,
      showCloseButton = true,
      enablePanDownToClose = true,
    },
    ref
  ) => {
    const t = useTheme();
    const insets = useSafeAreaInsets();
    const bottomSheetRef = useRef<BottomSheet>(null);

    const memoizedSnapPoints = useMemo(() => snapPoints, [snapPoints]);

    useImperativeHandle(ref, () => ({
      open: () => {
        bottomSheetRef.current?.snapToIndex(0);
      },
      close: () => {
        bottomSheetRef.current?.close();
      },
      snapToIndex: (index: number) => {
        bottomSheetRef.current?.snapToIndex(index);
      },
    }));

    const handleClose = useCallback(() => {
      haptics.light();
      bottomSheetRef.current?.close();
      onClose?.();
    }, [onClose]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
          pressBehavior="close"
        />
      ),
      []
    );

    const handleSheetChanges = useCallback(
      (index: number) => {
        if (index === -1) {
          onClose?.();
        }
      },
      [onClose]
    );

    const ContentWrapper = scrollable ? BottomSheetScrollView : BottomSheetView;

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={memoizedSnapPoints}
        enablePanDownToClose={enablePanDownToClose}
        backdropComponent={renderBackdrop}
        onChange={handleSheetChanges}
        backgroundStyle={[styles.background, { backgroundColor: t.card }]}
        handleIndicatorStyle={[styles.handleIndicator, { backgroundColor: t.border }]}
      >
        <ContentWrapper
          style={styles.contentContainer}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        >
          {(title || showCloseButton) && (
            <View style={styles.header}>
              <View style={styles.headerText}>
                {title && (
                  <Text style={[styles.title, { color: t.text }]}>{title}</Text>
                )}
                {subtitle && (
                  <Text style={[styles.subtitle, { color: t.textMuted }]}>
                    {subtitle}
                  </Text>
                )}
              </View>
              {showCloseButton && (
                <Pressable onPress={handleClose} hitSlop={10}>
                  <Icon name="close" size={24} color={t.textMuted} />
                </Pressable>
              )}
            </View>
          )}
          {children}
        </ContentWrapper>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  background: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
  },
});

export default AppBottomSheet;
