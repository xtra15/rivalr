import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  increment,
  type FieldValue,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";
import type { PublicUser, CustomTaunt } from "@rivalr/shared";

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
  adminCheck: {
    async isAdmin(email: string) {
      if (!email) return false;
      try {
        const snap = await getDoc(doc(db, "admins", email.toLowerCase()));
        return snap.exists();
      } catch {
        return false;
      }
    },
  },

  users: {
    async get(googleId: string) {
      const q = query(collection(db, "users"), where("google_id", "==", googleId));
      const snap = await getDocs(q);
      return snap.empty ? null : { id: snap.docs[0]!.id, ...toPlain(snap.docs[0]!.data()) };
    },
    async getPublic(userId: string) {
      const snap = await getDoc(doc(db, "users", userId));
      if (!snap.exists()) return null;
      const data = snap.data() as Record<string, unknown>;
      const { google_id, email, ...pub } = data;
      return { id: snap.id, ...pub } as unknown as PublicUser;
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
    async updateStatus(userId: string, status: string) {
      const ref = doc(db, "users", userId);
      await updateDoc(ref, { status });
    },
    async updateAvatar(userId: string, avatarUrl: string | null) {
      const ref = doc(db, "users", userId);
      await updateDoc(ref, { avatar_url: avatarUrl });
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
    async create(data: {
      name: string;
      invite_code: string;
      created_by: string;
      description?: string;
      icon?: string;
    }) {
      const ref = doc(collection(db, "guilds"));
      await setDoc(ref, { ...data, created_at: new Date().toISOString() });
      return { id: ref.id, ...data };
    },
    async update(guildId: string, data: FsWriteData) {
      const ref = doc(db, "guilds", guildId);
      await updateDoc(ref, data);
    },
    async delete(guildId: string) {
      const ref = doc(db, "guilds", guildId);
      await deleteDoc(ref);
    },
async getByIds(ids: string[]) {
      const results: (Record<string, unknown> & { id: string })[] = [];
      for (const id of ids) {
        const snap = await getDoc(doc(db, "guilds", id));
        if (snap.exists()) results.push({ id: snap.id, ...toPlain(snap.data()) });
      }
      return results;
    },
    async getAll() {
      const snap = await getDocs(collection(db, "guilds"));
      return snap.docs.map((d) => ({ id: d.id, ...toPlain(d.data()) }));
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
    async remove(guildId: string, userId: string) {
      const ref = doc(db, "guild_members", `${guildId}_${userId}`);
      await deleteDoc(ref);
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
    async getAll() {
      const snap = await getDocs(collection(db, "users"));
      return snap.docs.map((d) => ({ id: d.id, ...toPlain(d.data()) }));
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
      const q = query(collection(db, "quiz_attempts"), where("guild_id", "==", guildId));
      const snap = await getDocs(q);
      return snap.docs
        .map((d) => ({ id: d.id, ...toPlain(d.data()) }))
        .sort((a, b) => {
          const at = String((a as { completed_at?: string }).completed_at ?? "");
          const bt = String((b as { completed_at?: string }).completed_at ?? "");
          return at < bt ? 1 : at > bt ? -1 : 0;
        });
    },
    async getAll() {
      const snap = await getDocs(collection(db, "quiz_attempts"));
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
    async upsert(
      userId: string,
      uid: string,
      subject: string,
      data: { correct: number; total: number; streak: number; xp: number },
    ) {
      const ref = doc(db, "user_subject_stats", `${userId}_${subject}`);
      const existing = (await getDoc(ref)).data() as Record<string, number | undefined> | undefined;
      await setDoc(
        ref,
        {
          user_id: userId,
          uid,
          subject,
          quizzes_completed: (existing?.quizzes_completed ?? 0) + 1,
          correct_answers: (existing?.correct_answers ?? 0) + data.correct,
          total_questions: (existing?.total_questions ?? 0) + data.total,
          best_streak: Math.max(existing?.best_streak ?? 0, data.streak),
          xp_earned: (existing?.xp_earned ?? 0) + data.xp,
        },
        { merge: true },
      );
    },
  },

  userChapterStats: {
    async getAll() {
      const snap = await getDocs(collection(db, "user_chapter_stats"));
      return snap.docs.map((d) => toPlain(d.data() as Record<string, unknown>));
    },
    async upsert(
      userId: string,
      uid: string,
      subject: string,
      chapterNumber: number,
      chapterName: string,
      difficulty: string,
      data: { correct: number; total: number; time: number; xp: number },
    ) {
      const key = `${userId}_${subject}_${chapterNumber}`;
      const ref = doc(db, "user_chapter_stats", key);
      const existing = (await getDoc(ref)).data() as Record<string, number | null | undefined> | undefined;
      await setDoc(
        ref,
        {
          user_id: userId,
          uid,
          subject,
          chapter_number: chapterNumber,
          chapter_name: chapterName,
          difficulty,
          attempts: (existing?.attempts ?? 0) + 1,
          correct_answers: (existing?.correct_answers ?? 0) + data.correct,
          total_questions: (existing?.total_questions ?? 0) + data.total,
          best_score: Math.max(existing?.best_score ?? 0, data.correct),
          best_time_seconds:
            existing?.best_time_seconds === undefined || existing?.best_time_seconds === null
              ? data.time
              : Math.min(existing?.best_time_seconds, data.time),
          xp_earned: (existing?.xp_earned ?? 0) + data.xp,
        },
        { merge: true },
      );
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
    async setCustomColor(userId: string, hex: string) {
      const ref = doc(db, "user_inventory", `${userId}_frame_custom`);
      await updateDoc(ref, { custom_color: hex });
    },
    async getForUsers(userIds: string[]) {
      const results: (Record<string, unknown> & { id: string })[] = [];
      for (const id of userIds) {
        const q = query(collection(db, "user_inventory"), where("user_id", "==", id));
        const snap = await getDocs(q);
        for (const d of snap.docs) results.push({ id: d.id, ...toPlain(d.data() as Record<string, unknown>) });
      }
      return results;
    },
  },

  customTaunts: {
    async get(userId: string) {
      const snap = await getDoc(doc(db, "user_custom_taunts", userId));
      return snap.exists()
        ? ({ user_id: userId, ...toPlain(snap.data()) } as unknown as CustomTaunt)
        : null;
    },
    async set(userId: string, data: { asset_key: string; sha256: string }) {
      const ref = doc(db, "user_custom_taunts", userId);
      await setDoc(
        ref,
        { user_id: userId, ...data, is_equipped: true, created_at: new Date().toISOString() },
        { merge: true },
      );
    },
    async remove(userId: string) {
      const ref = doc(db, "user_custom_taunts", userId);
      await deleteDoc(ref);
    },
  },
};
