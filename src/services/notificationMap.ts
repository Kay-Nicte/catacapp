import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIF_MAP_KEY = '@catacapp_notif_map';

function getKey(userId: string): string {
  return `${NOTIF_MAP_KEY}_${userId}`;
}

async function loadMap(userId: string): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(getKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveMap(userId: string, map: Record<string, string>): Promise<void> {
  await AsyncStorage.setItem(getKey(userId), JSON.stringify(map));
}

export async function getNotificationId(userId: string, entityId: string): Promise<string | null> {
  const map = await loadMap(userId);
  return map[entityId] ?? null;
}

export async function setNotificationId(userId: string, entityId: string, notifId: string): Promise<void> {
  const map = await loadMap(userId);
  map[entityId] = notifId;
  await saveMap(userId, map);
}

export async function removeNotificationId(userId: string, entityId: string): Promise<void> {
  const map = await loadMap(userId);
  delete map[entityId];
  await saveMap(userId, map);
}

export async function getAllNotificationIds(userId: string): Promise<Record<string, string>> {
  return loadMap(userId);
}

export async function bulkSetNotificationIds(
  userId: string,
  entries: Record<string, string>
): Promise<void> {
  const map = await loadMap(userId);
  Object.assign(map, entries);
  await saveMap(userId, map);
}
