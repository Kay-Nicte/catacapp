import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Clipboard,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../theme/useTheme";
import { shadows } from "../theme/tokens";
import { useAuth } from "../app/state/AuthContext";
import { useHousehold } from "../app/state/HouseholdContext";
import { usePremium } from "../app/state/PremiumContext";
import { Icon } from "../components/ui/Icon";
import { AnimatedPressable } from "../components/ui/AnimatedPressable";
import ScreenContainer from "../components/layout/ScreenContainer";

export default function HouseholdScreen() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const {
    household,
    members,
    isOwner,
    loading,
    generateInviteCode,
    joinHousehold,
    leaveHousehold,
    removeMember,
  } = useHousehold();

  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);

  const isInHousehold = (household?.memberIds?.length ?? 0) > 1;

  const handleGenerateCode = async () => {
    if (!isPremium) {
      (navigation as any).navigate("Premium");
      return;
    }

    setIsGenerating(true);
    try {
      const code = await generateInviteCode();
      setInviteCode(code);
    } catch (error) {
      Alert.alert(tr("common.error"), tr("household.generateError"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = () => {
    if (inviteCode) {
      Clipboard.setString(inviteCode);
      Alert.alert(tr("household.codeCopied"), tr("household.codeCopiedMsg"));
    }
  };

  const handleJoinHousehold = async () => {
    if (!joinCode.trim()) return;

    // Ask merge or start fresh
    Alert.alert(
      tr("household.mergePets"),
      tr("household.mergeDescription"),
      [
        {
          text: tr("household.mergeNo"),
          onPress: () => doJoin(false),
        },
        {
          text: tr("household.mergeYes"),
          onPress: () => doJoin(true),
        },
        {
          text: tr("common.cancel"),
          style: "cancel",
        },
      ]
    );
  };

  const doJoin = async (merge: boolean) => {
    setIsJoining(true);
    try {
      const result = await joinHousehold(joinCode.trim(), merge);

      if (result.success) {
        setShowJoinInput(false);
        setJoinCode("");
        Alert.alert(tr("household.joinSuccess"), tr("household.joinSuccessMsg"));
      } else {
        const errorKey = result.error || "invalidCode";
        Alert.alert(tr("common.error"), tr(`household.${errorKey}`));
      }
    } catch (error) {
      Alert.alert(tr("common.error"), tr("household.joinError"));
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveHousehold = () => {
    Alert.alert(
      tr("household.confirmLeave"),
      tr("household.confirmLeaveMsg"),
      [
        { text: tr("common.cancel"), style: "cancel" },
        {
          text: tr("household.leave"),
          style: "destructive",
          onPress: async () => {
            try {
              await leaveHousehold();
              Alert.alert(tr("household.leftSuccess"), tr("household.leftSuccessMsg"));
            } catch (error) {
              Alert.alert(tr("common.error"), tr("household.leaveError"));
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = (memberId: string, memberEmail: string) => {
    Alert.alert(
      tr("household.confirmRemove"),
      tr("household.confirmRemoveMsg", { name: memberEmail }),
      [
        { text: tr("common.cancel"), style: "cancel" },
        {
          text: tr("household.remove"),
          style: "destructive",
          onPress: async () => {
            try {
              await removeMember(memberId);
            } catch (error) {
              Alert.alert(tr("common.error"), tr("household.removeError"));
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator size="large" color={t.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <ScreenContainer>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header info */}
        <View style={[styles.infoCard, { backgroundColor: t.card, borderColor: t.border, ...shadows.sm }]}>
          <View style={[styles.iconCircle, { backgroundColor: t.accentSoft }]}>
            <Icon name="home" size={28} color={t.accent} />
          </View>
          <Text style={[styles.infoTitle, { color: t.text }]}>
            {tr("household.title")}
          </Text>
          <Text style={[styles.infoSubtitle, { color: t.textMuted }]}>
            {tr("household.description")}
          </Text>
        </View>

        {/* Members section */}
        <Text style={[styles.sectionTitle, { color: t.textMuted }]}>
          {tr("household.members")}
        </Text>
        <View style={[styles.sectionCard, { backgroundColor: t.card, borderColor: t.border, ...shadows.sm }]}>
          {members.map((member, index) => (
            <React.Fragment key={member.id}>
              {index > 0 && (
                <View style={[styles.divider, { backgroundColor: t.border }]} />
              )}
              <View style={styles.memberRow}>
                <View style={[styles.memberAvatar, { backgroundColor: t.accentSoft }]}>
                  <Icon name="person" size={20} color={t.accent} />
                </View>
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberEmail, { color: t.text }]}>
                    {member.email}
                  </Text>
                  {household?.ownerId === member.id && (
                    <Text style={[styles.ownerBadge, { color: t.accent }]}>
                      {tr("household.owner")}
                    </Text>
                  )}
                  {member.id === user?.id && (
                    <Text style={[styles.youBadge, { color: t.textMuted }]}>
                      ({tr("household.you")})
                    </Text>
                  )}
                </View>
                {isOwner && member.id !== user?.id && (
                  <AnimatedPressable
                    onPress={() => handleRemoveMember(member.id, member.email)}
                    haptic="light"
                  >
                    <Icon name="close-circle" size={24} color={t.danger} />
                  </AnimatedPressable>
                )}
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Actions */}
        {!isInHousehold && (
          <>
            <Text style={[styles.sectionTitle, { color: t.textMuted }]}>
              {tr("household.actions")}
            </Text>

            {/* Generate invite code */}
            <AnimatedPressable
              onPress={handleGenerateCode}
              style={[
                styles.actionButton,
                { backgroundColor: t.accent, ...shadows.accent },
              ]}
              haptic="medium"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="link" size={22} color="#fff" />
                  <Text style={styles.actionButtonText}>
                    {tr("household.generateCode")}
                  </Text>
                </>
              )}
            </AnimatedPressable>

            {/* Display generated code */}
            {inviteCode && (
              <AnimatedPressable
                onPress={handleCopyCode}
                style={[styles.codeCard, { backgroundColor: t.card, borderColor: t.accent, ...shadows.sm }]}
                haptic="light"
              >
                <Text style={[styles.codeLabel, { color: t.textMuted }]}>
                  {tr("household.inviteCode")}
                </Text>
                <Text style={[styles.codeText, { color: t.accent }]}>
                  {inviteCode}
                </Text>
                <Text style={[styles.codeHint, { color: t.textMuted }]}>
                  {tr("household.tapToCopy")}
                </Text>
                <Text style={[styles.codeExpiry, { color: t.textMuted }]}>
                  {tr("household.codeExpires")}
                </Text>
              </AnimatedPressable>
            )}

            {/* Join with code */}
            {!showJoinInput ? (
              <AnimatedPressable
                onPress={() => setShowJoinInput(true)}
                style={[
                  styles.actionButtonOutline,
                  { borderColor: t.accent },
                ]}
                haptic="light"
              >
                <Icon name="enter" size={22} color={t.accent} />
                <Text style={[styles.actionButtonOutlineText, { color: t.accent }]}>
                  {tr("household.joinWithCode")}
                </Text>
              </AnimatedPressable>
            ) : (
              <View style={[styles.joinCard, { backgroundColor: t.card, borderColor: t.border, ...shadows.sm }]}>
                <Text style={[styles.joinLabel, { color: t.text }]}>
                  {tr("household.enterCode")}
                </Text>
                <TextInput
                  style={[styles.joinInput, { color: t.text, borderColor: t.border, backgroundColor: t.bg }]}
                  value={joinCode}
                  onChangeText={setJoinCode}
                  placeholder="ABC123"
                  placeholderTextColor={t.textMuted}
                  autoCapitalize="characters"
                  maxLength={6}
                />
                <View style={styles.joinActions}>
                  <AnimatedPressable
                    onPress={() => {
                      setShowJoinInput(false);
                      setJoinCode("");
                    }}
                    style={[styles.joinCancelBtn, { borderColor: t.border }]}
                    haptic="light"
                  >
                    <Text style={[styles.joinCancelText, { color: t.textMuted }]}>
                      {tr("common.cancel")}
                    </Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    onPress={handleJoinHousehold}
                    style={[styles.joinSubmitBtn, { backgroundColor: t.accent }]}
                    haptic="medium"
                    disabled={isJoining || joinCode.length < 6}
                  >
                    {isJoining ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.joinSubmitText}>
                        {tr("household.join")}
                      </Text>
                    )}
                  </AnimatedPressable>
                </View>
              </View>
            )}

            {/* Premium requirement note */}
            {!isPremium && (
              <View style={[styles.noteCard, { backgroundColor: t.accentSoft }]}>
                <Icon name="information-circle" size={20} color={t.accent} />
                <Text style={[styles.noteText, { color: t.accent }]}>
                  {tr("household.premiumRequired")}
                </Text>
              </View>
            )}
          </>
        )}

        {/* Leave household (if in a shared household) */}
        {isInHousehold && (
          <>
            <Text style={[styles.sectionTitle, { color: t.textMuted }]}>
              {tr("household.actions")}
            </Text>

            {/* Generate new invite (owner only, max 2 members) */}
            {isOwner && members.length < 2 && (
              <AnimatedPressable
                onPress={handleGenerateCode}
                style={[
                  styles.actionButton,
                  { backgroundColor: t.accent, ...shadows.accent },
                ]}
                haptic="medium"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Icon name="link" size={22} color="#fff" />
                    <Text style={styles.actionButtonText}>
                      {tr("household.generateCode")}
                    </Text>
                  </>
                )}
              </AnimatedPressable>
            )}

            {inviteCode && (
              <AnimatedPressable
                onPress={handleCopyCode}
                style={[styles.codeCard, { backgroundColor: t.card, borderColor: t.accent, ...shadows.sm }]}
                haptic="light"
              >
                <Text style={[styles.codeLabel, { color: t.textMuted }]}>
                  {tr("household.inviteCode")}
                </Text>
                <Text style={[styles.codeText, { color: t.accent }]}>
                  {inviteCode}
                </Text>
                <Text style={[styles.codeHint, { color: t.textMuted }]}>
                  {tr("household.tapToCopy")}
                </Text>
              </AnimatedPressable>
            )}

            <AnimatedPressable
              onPress={handleLeaveHousehold}
              style={[
                styles.actionButtonOutline,
                { borderColor: t.danger },
              ]}
              haptic="medium"
            >
              <Icon name="log-out" size={22} color={t.danger} />
              <Text style={[styles.actionButtonOutlineText, { color: t.danger }]}>
                {tr("household.leave")}
              </Text>
            </AnimatedPressable>
          </>
        )}

        {/* Max members info */}
        <Text style={[styles.footerNote, { color: t.textMuted }]}>
          {tr("household.maxMembers")}
        </Text>
      </ScrollView>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },

  infoCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  infoTitle: { fontSize: 22, fontWeight: "800" },
  infoSubtitle: { fontSize: 14, fontWeight: "500", textAlign: "center", lineHeight: 20 },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 10,
    marginLeft: 4,
  },

  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },

  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  memberInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  memberEmail: { fontSize: 15, fontWeight: "600" },
  ownerBadge: { fontSize: 12, fontWeight: "800" },
  youBadge: { fontSize: 12, fontWeight: "500" },

  divider: { height: 1, marginLeft: 66, opacity: 0.5 },

  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  actionButtonOutline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginTop: 10,
  },
  actionButtonOutlineText: {
    fontSize: 16,
    fontWeight: "700",
  },

  codeCard: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 20,
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  codeLabel: { fontSize: 12, fontWeight: "600" },
  codeText: { fontSize: 32, fontWeight: "900", letterSpacing: 6 },
  codeHint: { fontSize: 12, fontWeight: "500" },
  codeExpiry: { fontSize: 11, fontWeight: "500", marginTop: 4 },

  joinCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginTop: 10,
  },
  joinLabel: { fontSize: 15, fontWeight: "700" },
  joinInput: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 4,
    textAlign: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  joinActions: {
    flexDirection: "row",
    gap: 10,
  },
  joinCancelBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  joinCancelText: { fontSize: 15, fontWeight: "600" },
  joinSubmitBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
  },
  joinSubmitText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  noteCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  noteText: { flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 18 },

  footerNote: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 24,
  },
});
