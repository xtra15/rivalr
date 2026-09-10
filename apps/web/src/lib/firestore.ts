import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  increment,
  type FieldValue,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";

type FsWriteData = {
  [key: string]:
    | string
    | number
    | boolean
    | null
    | Date
    | unknown[]
    | { [key: string]: unknown }
    | FieldValue;
};

function toPlain(obj: DocumentData): Record<string, unknown> {
  return { ...obj };
}

export const firestore = {
  users: {
    async get(googleId: string) {
      const q = query(collection(db, "users"), where("google_id", "==", googleId));
      const snap = await getDocs(q);
      return snap.empty ? null : { id: snap.docs[0]!.id, ...toPlain(snap.docs[0]!.data()) };
    },
    async create(data: {
      google_id: string;
      email: string;
      name: string;
      avatar_url: string | null;
    }) {
      const ref = doc(collection(db, "users"));
      await setDoc(ref, { ...data, xp: 0, coins: 0, created_at: new Date().toISOString() });
      return { id: ref.id, ...data, xp: 0, coins: 0 };
    },
    async updateXP(userId: string, amount: number) {
      const ref = doc(db, "users", userId);
      await updateDoc(ref, { xp: increment(amount) });
    },
    async updateCoins(userId: string, amount: number) {
      const ref = doc(db, "users", userId);
      await updateDoc(ref, { coins: increment(amount) });
    },
  },

  guilds: {
    async get(guildId: string) {
      const snap = await getDoc(doc(db, "guilds", guildId));
      return snap.exists() ? { id: snap.id, ...toPlain(snap.data()) } : null;
    },
    async getByCode(code: string) {
      const q = query(collection(db, "guilds"), where("invite_code", "==", code));
      const snap = await getDocs(q);
      return snap.empty ? null : { id: snap.docs[0]!.id, ...toPlain(snap.docs[0]!.data()) };
    },
    async create(data: { name: string; invite_code: string; created_by: string }) {
      const ref = doc(collection(db, "guilds"));
      await setDoc(ref, { ...data, created_at: new Date().toISOString() });
      return { id: ref.id, ...data };
    },
    async getByIds(ids: string[]) {
      const results: (Record<string, unknown> & { id: string })[] = [];
      for (const id of ids) {
        const snap = await getDoc(doc(db, "guilds", id));
        if (snap.exists()) results.push({ id: snap.id, ...toPlain(snap.data()) });
      }
      return results;
    },
  },

  guildMembers: {
    async add(guildId: string, userId: string) {
      const ref = doc(db, "guild_members", `${guildId}_${userId}`);
      await setDoc(ref, { guild_id: guildId, user_id: userId, joined_at: new Date().toISOString() });
    },
    async getByGuild(guildId: string) {
      const q = query(collection(db, "guild_members"), where("guild_id", "==", guildId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => toPlain(d.data() as Record<string, unknown>));
    },
    async getByUser(userId: string) {
      const q = query(collection(db, "guild_members"), where("user_id", "==", userId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => toPlain(d.data() as Record<string, unknown>));
    },
  },

  usersBatch: {
    async getByIds(ids: string[]) {
      if (!ids.length) return [];
      const results: (Record<string, unknown> & { id: string })[] = [];
      for (const id of ids) {
        const snap = await getDoc(doc(db, "users", id));
        if (snap.exists()) results.push({ id: snap.id, ...toPlain(snap.data()) });
      }
      return results;
    },
  },

  quizAttempts: {
    async create(data: Record<string, unknown>) {
      const ref = doc(collection(db, "quiz_attempts"));
      await setDoc(ref, { ...data, completed_at: new Date().toISOString() });
      return { id: ref.id, ...data };
    },
    async get(quizId: string) {
      const snap = await getDoc(doc(db, "quiz_attempts", quizId));
      return snap.exists() ? { id: snap.id, ...toPlain(snap.data() as Record<string, unknown>) } : null;
    },
    async update(quizId: string, data: FsWriteData) {
      const ref = doc(db, "quiz_attempts", quizId);
      await updateDoc(ref, data);
    },
    async getByGuild(guildId: string) {
      const q = query(
        collection(db, "quiz_attempts"),
        where("guild_id", "==", guildId),
        orderBy("completed_at", "desc"),
        limit(50),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...toPlain(d.data()) }));
    },
  },

  userAchievements: {
    async get(userId: string) {
      const q = query(collection(db, "user_achievements"), where("user_id", "==", userId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => toPlain(d.data() as Record<string, unknown>));
    },
    async unlock(userId: string, achievementId: string) {
      const ref = doc(db, "user_achievements", `${userId}_${achievementId}`);
      await setDoc(ref, {
        user_id: userId,
        achievement_id: achievementId,
        unlocked_at: new Date().toISOString(),
      });
    },
  },

  achievements: {
    async getAll() {
      const snap = await getDocs(collection(db, "achievements"));
      return snap.docs.map((d) => ({ id: d.id, ...toPlain(d.data() as Record<string, unknown>) }));
    },
  },

  userSubjectStats: {
    async get(userId: string) {
      const q = query(collection(db, "user_subject_stats"), where("user_id", "==", userId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => toPlain(d.data() as Record<string, unknown>));
    },
    async upsert(userId: string, subject: string, data: FsWriteData) {
      const ref = doc(db, "user_subject_stats", `${userId}_${subject}`);
      const existing = await getDoc(ref);
      if (existing.exists()) {
        await updateDoc(ref, data);
      } else {
        await setDoc(ref, { user_id: userId, subject, ...data });
      }
    },
  },

  userChapterStats: {
    async getAll() {
      const snap = await getDocs(collection(db, "user_chapter_stats"));
      return snap.docs.map((d) => toPlain(d.data() as Record<string, unknown>));
    },
    async upsert(userId: string, key: string, data: FsWriteData) {
      const ref = doc(db, "user_chapter_stats", key);
      const existing = await getDoc(ref);
      if (existing.exists()) {
        await updateDoc(ref, data);
      } else {
        await setDoc(ref, { user_id: userId, ...data });
      }
    },
  },

  shopItems: {
    async getAll() {
      const snap = await getDocs(collection(db, "shop_items"));
      return snap.docs.map((d) => ({ id: d.id, ...toPlain(d.data() as Record<string, unknown>) }));
    },
  },

  userInventory: {
    async get(userId: string) {
      const q = query(collection(db, "user_inventory"), where("user_id", "==", userId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...toPlain(d.data() as Record<string, unknown>) }));
    },
    async add(userId: string, itemId: string) {
      const ref = doc(db, "user_inventory", `${userId}_${itemId}`);
      await setDoc(ref, {
        user_id: userId,
        item_id: itemId,
        purchased_at: new Date().toISOString(),
        is_equipped: false,
      });
    },
    async equip(userId: string, itemId: string, unequipPrevious: string | undefined) {
      if (unequipPrevious) {
        const prevRef = doc(db, "user_inventory", `${userId}_${unequipPrevious}`);
        await updateDoc(prevRef, { is_equipped: false });
      }
      const ref = doc(db, "user_inventory", `${userId}_${itemId}`);
      await updateDoc(ref, { is_equipped: true });
    },
    async unequip(userId: string, itemId: string) {
      const ref = doc(db, "user_inventory", `${userId}_${itemId}`);
      await updateDoc(ref, { is_equipped: false });
    },
  },
};
