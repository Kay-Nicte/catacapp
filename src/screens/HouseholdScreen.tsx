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
import { useToast } from "../components/ui/Toast";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../theme/useTheme";
import { shadows } from "../theme/tokens";
import { useAuth } from "../app/state/AuthContext";
import { useHousehold } from "../app/state/HouseholdContext";
import { usePremium } from "../app/state/PremiumContext";
import { validateInviteCode } from "../services/firestore";
import { Icon } from "../components/ui/Icon";
import { AnimatedPressable } from "../components/ui/AnimatedPressable";
import ScreenContainer from "../components/layout/ScreenContainer";

import { fonts } from '../theme/fonts';

type PetOption = { id: string; name: string; type: string; avatarKey: string; source: 'mine' | 'target' };

export default function HouseholdScreen() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const {
    household,
    householdId,
    members,
    isOwner,
    loading,
    generateInviteCode,
    joinHousehold,
    leaveHousehold,
    removeMember,
    getPetsForHousehold,
  } = useHousehold();

  const { showToast } = useToast();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [showMergeChoice, setShowMergeChoice] = useState(false);
  const [showPetSelector, setShowPetSelector] = useState(false);
  const [loadingPets, setLoadingPets] = useState(false);
  const [allPets, setAllPets] = useState<PetOption[]>([]);
  const [selectedPetIds, setSelectedPetIds] = useState<Set<string>>(new Set());
  const [validatedTargetHouseholdId, setValidatedTargetHouseholdId] = useState<string | null>(null);

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
      console.error('[HouseholdScreen] Generate code error:', error);
      showToast(tr("common.error"), tr("household.generateError"), 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = () => {
    if (inviteCode) {
      Clipboard.setString(inviteCode);
      showToast(tr("household.codeCopied"), tr("household.codeCopiedMsg"), 'success');
    }
  };

  const handleJoinHousehold = async () => {
    if (!joinCode.trim()) return;
    setShowMergeChoice(true);
  };

  const handleChoosePets = async () => {
    setLoadingPets(true);
    try {
      const validation = await validateInviteCode(joinCode.trim());
      if (!validation.valid || !validation.householdId) {
        showToast(tr("common.error"), tr(`household.${validation.error || 'invalidCode'}`), 'error');
        return;
      }
      setValidatedTargetHouseholdId(validation.householdId);

      const [myPets, targetPets] = await Promise.all([
        getPetsForHousehold(householdId!),
        getPetsForHousehold(validation.householdId),
      ]);

      const pets: PetOption[] = [
        ...myPets.map(p => ({ ...p, source: 'mine' as const })),
        ...targetPets.map(p => ({ ...p, id: `target:${p.id}`, source: 'target' as const })),
      ];
      setAllPets(pets);
      // Select all by default
      setSelectedPetIds(new Set(pets.map(p => p.id)));
      setShowMergeChoice(false);
      setShowPetSelector(true);
    } catch (error) {
      console.error('Error loading pets:', error);
      showToast(tr("common.error"), tr("household.joinError"), 'error');
    } finally {
      setLoadingPets(false);
    }
  };

  const togglePet = (petId: string) => {
    setSelectedPetIds(prev => {
      const next = new Set(prev);
      if (next.has(petId)) next.delete(petId);
      else next.add(petId);
      return next;
    });
  };

  const doJoinWithSelected = async () => {
    setShowPetSelector(false);
    setIsJoining(true);
    try {
      const result = await joinHousehold(joinCode.trim(), false, Array.from(selectedPetIds));
      if (result.success) {
        setShowJoinInput(false);
        setJoinCode("");
        showToast(tr("household.joinSuccess"), tr("household.joinSuccessMsg"), 'success');
      } else {
        const errorKey = result.error || "invalidCode";
        showToast(tr("common.error"), tr(`household.${errorKey}`), 'error');
      }
    } catch (error) {
      console.error('Join error:', error);
      showToast(tr("common.error"), tr("household.joinError"), 'error');
    } finally {
      setIsJoining(false);
    }
  };

  const doJoin = async (merge: boolean) => {
    setShowMergeChoice(false);
    setIsJoining(true);
    try {
      console.log('Joining household with code:', joinCode.trim(), 'merge:', merge);
      const result = await joinHousehold(joinCode.trim(), merge);
      console.log('Join result:', JSON.stringify(result));

      if (result.success) {
        setShowJoinInput(false);
        setJoinCode("");
        showToast(tr("household.joinSuccess"), tr("household.joinSuccessMsg"), 'success');
      } else {
        const errorKey = result.error || "invalidCode";
        showToast(tr("common.error"), tr(`household.${errorKey}`), 'error');
      }
    } catch (error) {
      console.error('Join error:', error);
      showToast(tr("common.error"), tr("household.joinError"), 'error');
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
              showToast(tr("household.leftSuccess"), tr("household.leftSuccessMsg"), 'success');
            } catch (error) {
              showToast(tr("common.error"), tr("household.leaveError"), 'error');
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
              showToast(tr("common.error"), tr("household.removeError"), 'error');
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
                  <Text numberOfLines={1} style={[styles.memberEmail, { color: t.text }]}>
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

                {/* Merge choice */}
                {showMergeChoice && (
                  <View style={[styles.mergeChoiceContainer, { backgroundColor: t.bg, borderColor: t.border }]}>
                    <Text style={[styles.mergeChoiceTitle, { color: t.text }]}>
                      {tr("household.mergePets")}
                    </Text>
                    <Text style={[styles.mergeChoiceDesc, { color: t.textMuted }]}>
                      {tr("household.mergeDescription")}
                    </Text>
                    <AnimatedPressable
                      onPress={() => doJoin(true)}
                      style={[styles.mergeOption, { backgroundColor: t.accentSoft, borderColor: t.accent }]}
                      haptic="medium"
                    >
                      <Icon name="checkmark-circle" size={22} color={t.accent} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.mergeOptionTitle, { color: t.accent }]}>
                          {tr("household.mergeYes")}
                        </Text>
                      </View>
                    </AnimatedPressable>
                    <AnimatedPressable
                      onPress={handleChoosePets}
                      style={[styles.mergeOption, { backgroundColor: t.card, borderColor: t.border }]}
                      haptic="medium"
                      disabled={loadingPets}
                    >
                      {loadingPets ? (
                        <ActivityIndicator size="small" color={t.accent} />
                      ) : (
                        <Icon name="list" size={22} color={t.accent} />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.mergeOptionTitle, { color: t.accent }]}>
                          {tr("household.choosePets")}
                        </Text>
                      </View>
                    </AnimatedPressable>
                    <AnimatedPressable
                      onPress={() => doJoin(false)}
                      style={[styles.mergeOption, { backgroundColor: t.card, borderColor: t.border }]}
                      haptic="medium"
                    >
                      <Icon name="close-circle" size={22} color={t.textMuted} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.mergeOptionTitle, { color: t.text }]}>
                          {tr("household.mergeNo")}
                        </Text>
                      </View>
                    </AnimatedPressable>
                    <AnimatedPressable
                      onPress={() => setShowMergeChoice(false)}
                      haptic="light"
                      style={{ alignSelf: "center", paddingVertical: 8 }}
                    >
                      <Text style={[styles.joinCancelText, { color: t.textMuted }]}>
                        {tr("common.cancel")}
                      </Text>
                    </AnimatedPressable>
                  </View>
                )}

                {/* Pet selector */}
                {showPetSelector && (
                  <View style={[styles.mergeChoiceContainer, { backgroundColor: t.bg, borderColor: t.border }]}>
                    <Text style={[styles.mergeChoiceTitle, { color: t.text }]}>
                      {tr("household.choosePetsTitle")}
                    </Text>
                    <Text style={[styles.mergeChoiceDesc, { color: t.textMuted }]}>
                      {tr("household.choosePetsDesc")}
                    </Text>

                    {allPets.filter(p => p.source === 'mine').length > 0 && (
                      <Text style={[styles.petSectionLabel, { color: t.textMuted }]}>
                        {tr("household.myPets")}
                      </Text>
                    )}
                    {allPets.filter(p => p.source === 'mine').map(pet => (
                      <AnimatedPressable
                        key={pet.id}
                        onPress={() => togglePet(pet.id)}
                        style={[
                          styles.petOption,
                          {
                            backgroundColor: selectedPetIds.has(pet.id) ? t.accentSoft : t.card,
                            borderColor: selectedPetIds.has(pet.id) ? t.accent : t.border,
                          },
                        ]}
                        haptic="light"
                      >
                        <Icon
                          name={selectedPetIds.has(pet.id) ? "checkbox" : "square-outline"}
                          size={22}
                          color={selectedPetIds.has(pet.id) ? t.accent : t.textMuted}
                        />
                        <Text style={[styles.petOptionName, { color: t.text }]}>
                          {pet.name}
                        </Text>
                      </AnimatedPressable>
                    ))}

                    {allPets.filter(p => p.source === 'target').length > 0 && (
                      <Text style={[styles.petSectionLabel, { color: t.textMuted }]}>
                        {tr("household.theirPets")}
                      </Text>
                    )}
                    {allPets.filter(p => p.source === 'target').map(pet => (
                      <AnimatedPressable
                        key={pet.id}
                        onPress={() => togglePet(pet.id)}
                        style={[
                          styles.petOption,
                          {
                            backgroundColor: selectedPetIds.has(pet.id) ? t.accentSoft : t.card,
                            borderColor: selectedPetIds.has(pet.id) ? t.accent : t.border,
                          },
                        ]}
                        haptic="light"
                      >
                        <Icon
                          name={selectedPetIds.has(pet.id) ? "checkbox" : "square-outline"}
                          size={22}
                          color={selectedPetIds.has(pet.id) ? t.accent : t.textMuted}
                        />
                        <Text style={[styles.petOptionName, { color: t.text }]}>
                          {pet.name}
                        </Text>
                      </AnimatedPressable>
                    ))}

                    <AnimatedPressable
                      onPress={doJoinWithSelected}
                      style={[styles.joinSubmitBtn, { backgroundColor: t.accent, marginTop: 8 }]}
                      haptic="medium"
                      disabled={selectedPetIds.size === 0}
                    >
                      <Text style={styles.joinSubmitText}>
                        {tr("household.confirmSelection")}
                      </Text>
                    </AnimatedPressable>
                    <AnimatedPressable
                      onPress={() => { setShowPetSelector(false); setShowMergeChoice(true); }}
                      haptic="light"
                      style={{ alignSelf: "center", paddingVertical: 8 }}
                    >
                      <Text style={[styles.joinCancelText, { color: t.textMuted }]}>
                        {tr("common.cancel")}
                      </Text>
                    </AnimatedPressable>
                  </View>
                )}
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
  infoTitle: { fontSize: 22, fontFamily: fonts.extraBold },
  infoSubtitle: { fontSize: 14, fontFamily: fonts.medium, textAlign: "center", lineHeight: 20 },

  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.black,
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
  memberEmail: { fontSize: 15, fontFamily: fonts.semiBold, flexShrink: 1 },
  ownerBadge: { fontSize: 12, fontFamily: fonts.extraBold },
  youBadge: { fontSize: 12, fontFamily: fonts.medium },

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
    fontFamily: fonts.bold,
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
    fontFamily: fonts.bold,
  },

  codeCard: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 20,
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  codeLabel: { fontSize: 12, fontFamily: fonts.semiBold },
  codeText: { fontSize: 32, fontFamily: fonts.black, letterSpacing: 6 },
  codeHint: { fontSize: 12, fontFamily: fonts.medium },
  codeExpiry: { fontSize: 11, fontFamily: fonts.medium, marginTop: 4 },

  joinCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginTop: 10,
  },
  joinLabel: { fontSize: 15, fontFamily: fonts.bold },
  joinInput: {
    fontSize: 24,
    fontFamily: fonts.extraBold,
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
  joinCancelText: { fontSize: 15, fontFamily: fonts.semiBold },
  joinSubmitBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
  },
  joinSubmitText: { color: "#fff", fontSize: 15, fontFamily: fonts.bold },

  mergeChoiceContainer: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  mergeChoiceTitle: { fontSize: 15, fontFamily: fonts.bold },
  mergeChoiceDesc: { fontSize: 13, fontFamily: fonts.medium, lineHeight: 18 },
  mergeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  mergeOptionTitle: { fontSize: 14, fontFamily: fonts.semiBold },

  petSectionLabel: {
    fontSize: 11,
    fontFamily: fonts.black,
    letterSpacing: 0.6,
    marginTop: 6,
  },
  petOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  petOptionName: { fontSize: 14, fontFamily: fonts.semiBold },

  noteCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  noteText: { flex: 1, fontSize: 13, fontFamily: fonts.semiBold, lineHeight: 18 },

  footerNote: {
    fontSize: 12,
    fontFamily: fonts.medium,
    textAlign: "center",
    marginTop: 24,
  },
});
