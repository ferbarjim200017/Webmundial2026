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
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type WriteBatch,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import {
  DEFAULT_PAIR_COLORS,
  DEFAULT_SPORTS,
  PLAYER_NAMES,
} from "./constants";
import { emptyKnockout, roundRobin } from "./tournament";
import type { AppUser, GrandFinal, Pair, Player, Sport } from "./types";

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

/** Documento único de la Gran Final (config/grandFinal). */
export function useGrandFinal(): { data: GrandFinal | null; loading: boolean } {
  const [data, setData] = useState<GrandFinal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      doc(db, "config", "grandFinal"),
      (snap) => {
        setData(snap.exists() ? (snap.data() as GrandFinal) : null);
        setLoading(false);
      },
      (err) => {
        console.error("onSnapshot grandFinal", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return { data, loading };
}

// ---------------------------------------------------------------------
//  Inicialización del torneo
// ---------------------------------------------------------------------

/** Crea los 10 jugadores (si no existen). */
export async function seedPlayers(): Promise<void> {
  const batch = writeBatch(db);
  PLAYER_NAMES.forEach((name, i) => {
    const ref = doc(collection(db, "players"));
    batch.set(ref, { name, order: i });
  });
  await batch.commit();
}

/**
 * Añade a un lote un deporte con sus 5 parejas por defecto
 * ((1,2)(3,4)(5,6)(7,8)(9,10)) y la fase de grupos generada.
 */
function buildSport(
  batch: WriteBatch,
  meta: { name: string; emoji: string },
  order: number,
  playerIds: string[]
): void {
  const sportRef = doc(collection(db, "sports"));
  const pairIds: string[] = [];

  for (let p = 0; p < 5; p++) {
    const pairRef = doc(collection(db, "pairs"));
    pairIds.push(pairRef.id);
    batch.set(pairRef, {
      sportId: sportRef.id,
      name: `Pareja ${p + 1}`,
      player1Id: playerIds[p * 2] ?? "",
      player2Id: playerIds[p * 2 + 1] ?? "",
      color: DEFAULT_PAIR_COLORS[p] ?? "emerald",
      order: p,
    });
  }

  batch.set(sportRef, {
    name: meta.name,
    emoji: meta.emoji,
    order,
    createdAt: Date.now(),
    group: { matches: pairIds.length >= 2 ? roundRobin(pairIds) : [] },
    knockout: emptyKnockout(),
  });
}

/** Crea los deportes por defecto, cada uno con sus 5 parejas y su liga. */
export async function seedSports(playerIds: string[]): Promise<void> {
  const batch = writeBatch(db);
  DEFAULT_SPORTS.forEach((s, i) => buildSport(batch, s, i, playerIds));
  await batch.commit();
}

// ---------------------------------------------------------------------
//  Jugadores
// ---------------------------------------------------------------------

export async function updatePlayerName(id: string, name: string) {
  await updateDoc(doc(db, "players", id), { name });
}

// ---------------------------------------------------------------------
//  Parejas (por deporte)
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

/** Guarda la foto de perfil de una pareja (data URL). */
export async function setPairPhoto(id: string, photo: string) {
  await updateDoc(doc(db, "pairs", id), { photo });
}

/** Quita la foto de perfil de una pareja. */
export async function removePairPhoto(id: string) {
  await updateDoc(doc(db, "pairs", id), { photo: null });
}

// ---------------------------------------------------------------------
//  Deportes
// ---------------------------------------------------------------------

export async function addSport(
  name: string,
  emoji: string,
  order: number,
  playerIds: string[]
) {
  const batch = writeBatch(db);
  buildSport(batch, { name, emoji }, order, playerIds);
  await batch.commit();
}

export async function updateSportMeta(
  id: string,
  data: { name?: string; emoji?: string; order?: number }
) {
  await updateDoc(doc(db, "sports", id), data);
}

/** Borra un deporte y todas sus parejas. */
export async function deleteSport(id: string) {
  const pairsSnap = await getDocs(query(collection(db, "pairs"), where("sportId", "==", id)));
  const batch = writeBatch(db);
  pairsSnap.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, "sports", id));
  await batch.commit();
}

// ---------------------------------------------------------------------
//  Gran Final (config/grandFinal)
// ---------------------------------------------------------------------

const grandFinalRef = () => doc(db, "config", "grandFinal");

export async function setGrandFinalKnockoutResult(
  key: "sf1" | "sf2" | "final" | "third",
  homeScore: number | null,
  awayScore: number | null,
  winnerSide: "home" | "away" | null = null
) {
  await setDoc(
    grandFinalRef(),
    {
      knockout: {
        [key]: {
          homeScore,
          awayScore,
          played: homeScore !== null && awayScore !== null,
          winnerSide,
        },
      },
    },
    { merge: true }
  );
}

export async function resetGrandFinal() {
  await setDoc(grandFinalRef(), { knockout: emptyKnockout() });
}

/**
 * Reinicio total: borra TODOS los deportes y TODAS las parejas, y resetea la
 * Gran Final. Conserva los jugadores.
 */
export async function resetTournamentScores() {
  const [sportsSnap, pairsSnap] = await Promise.all([
    getDocs(collection(db, "sports")),
    getDocs(collection(db, "pairs")),
  ]);
  const batch = writeBatch(db);
  sportsSnap.forEach((d) => batch.delete(d.ref));
  pairsSnap.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  await resetGrandFinal();
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
