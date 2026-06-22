"use client";
// =====================================================================
//  Acceso a Firestore: hooks en tiempo real + operaciones de escritura
// =====================================================================
import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import {
  DEFAULT_PAIR_COLORS,
  DEFAULT_SPORTS,
  PLAYER_NAMES,
} from "./constants";
import { emptyKnockout, roundRobin } from "./tournament";
import type { AppUser, Pair, Player, Sport } from "./types";

// ---------------------------------------------------------------------
//  Hooks de lectura en tiempo real
// ---------------------------------------------------------------------

function useCollection<T>(
  name: string,
  orderField?: string
): { data: T[]; loading: boolean } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const ref = orderField
      ? query(collection(db, name), orderBy(orderField))
      : collection(db, name);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T));
        setLoading(false);
      },
      (err) => {
        console.error(`onSnapshot ${name}`, err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [name, orderField]);

  return { data, loading };
}

export const usePlayers = () => useCollection<Player>("players", "order");
export const usePairs = () => useCollection<Pair>("pairs", "order");
export const useSports = () => useCollection<Sport>("sports", "order");
export const useUsers = () => useCollection<AppUser & { id: string }>("users");

// ---------------------------------------------------------------------
//  Inicialización del torneo
// ---------------------------------------------------------------------

/** Crea los 10 jugadores y 5 parejas por defecto (si no existen). */
export async function seedPlayersAndPairs(): Promise<void> {
  const batch = writeBatch(db);

  const playerIds: string[] = [];
  PLAYER_NAMES.forEach((name, i) => {
    const ref = doc(collection(db, "players"));
    playerIds.push(ref.id);
    batch.set(ref, { name, order: i });
  });

  // 5 parejas: (1,2)(3,4)(5,6)(7,8)(9,10)
  for (let p = 0; p < 5; p++) {
    const ref = doc(collection(db, "pairs"));
    const p1 = playerIds[p * 2];
    const p2 = playerIds[p * 2 + 1];
    batch.set(ref, {
      name: `Pareja ${p + 1}`,
      player1Id: p1,
      player2Id: p2,
      color: DEFAULT_PAIR_COLORS[p] ?? "emerald",
      order: p,
    });
  }

  await batch.commit();
}

/** Crea los deportes por defecto con su fase de grupos ya generada. */
export async function seedSports(pairIds: string[]): Promise<void> {
  const batch = writeBatch(db);
  DEFAULT_SPORTS.forEach((s, i) => {
    const ref = doc(collection(db, "sports"));
    batch.set(ref, {
      name: s.name,
      emoji: s.emoji,
      order: i,
      createdAt: Date.now(),
      group: { matches: pairIds.length >= 2 ? roundRobin(pairIds) : [] },
      knockout: emptyKnockout(),
    });
  });
  await batch.commit();
}

// ---------------------------------------------------------------------
//  Jugadores
// ---------------------------------------------------------------------

export async function updatePlayerName(id: string, name: string) {
  await updateDoc(doc(db, "players", id), { name });
}

// ---------------------------------------------------------------------
//  Parejas
// ---------------------------------------------------------------------

export async function savePair(
  id: string | null,
  data: Omit<Pair, "id">
): Promise<void> {
  if (id) {
    await updateDoc(doc(db, "pairs", id), { ...data });
  } else {
    await addDoc(collection(db, "pairs"), data);
  }
}

export async function deletePair(id: string) {
  await deleteDoc(doc(db, "pairs", id));
}

// ---------------------------------------------------------------------
//  Deportes
// ---------------------------------------------------------------------

export async function addSport(
  name: string,
  emoji: string,
  order: number,
  pairIds: string[]
) {
  await addDoc(collection(db, "sports"), {
    name,
    emoji,
    order,
    createdAt: Date.now(),
    group: { matches: pairIds.length >= 2 ? roundRobin(pairIds) : [] },
    knockout: emptyKnockout(),
  });
}

export async function updateSportMeta(
  id: string,
  data: { name?: string; emoji?: string; order?: number }
) {
  await updateDoc(doc(db, "sports", id), data);
}

export async function deleteSport(id: string) {
  await deleteDoc(doc(db, "sports", id));
}

/** Regenera la fase de grupos (todos contra todos) y resetea eliminatorias. */
export async function regenerateGroup(sportId: string, pairIds: string[]) {
  await updateDoc(doc(db, "sports", sportId), {
    "group.matches": roundRobin(pairIds),
    knockout: emptyKnockout(),
  });
}

/** Guarda (o limpia) el resultado de un partido de grupos. */
export async function setGroupResult(
  sport: Sport,
  matchId: string,
  homeScore: number | null,
  awayScore: number | null
) {
  const matches = (sport.group?.matches ?? []).map((m) =>
    m.id === matchId
      ? {
          ...m,
          homeScore,
          awayScore,
          played: homeScore !== null && awayScore !== null,
        }
      : m
  );
  await updateDoc(doc(db, "sports", sport.id), { "group.matches": matches });
}

/** Guarda (o limpia) el resultado de un partido de eliminatoria. */
export async function setKnockoutResult(
  sportId: string,
  key: "sf1" | "sf2" | "final" | "third",
  homeScore: number | null,
  awayScore: number | null,
  winnerSide: "home" | "away" | null = null
) {
  await updateDoc(doc(db, "sports", sportId), {
    [`knockout.${key}`]: {
      homeScore,
      awayScore,
      played: homeScore !== null && awayScore !== null,
      winnerSide,
    },
  });
}

// ---------------------------------------------------------------------
//  Usuarios (admin)
// ---------------------------------------------------------------------

export async function setUserRole(uid: string, role: "admin" | "member") {
  await updateDoc(doc(db, "users", uid), { role });
}

export async function setUserPlayer(uid: string, playerId: string | null) {
  await updateDoc(doc(db, "users", uid), { playerId });
}

/** El propio usuario vincula su jugador (onboarding). */
export async function linkOwnPlayer(uid: string, playerId: string) {
  await setDoc(doc(db, "users", uid), { playerId }, { merge: true });
}
