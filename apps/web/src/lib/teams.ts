import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

export interface Team {
  id?: string;
  name: string;
  description: string;
  walletAddress: string;
  agentIds: string[];
  createdAt: Timestamp | Date;
}

export interface Task {
  id?: string;
  teamId: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedTo: string | null;
  createdBy: 'user' | string;
  priority: 'low' | 'medium' | 'high';
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

const TEAMS_COLLECTION = 'teams';
const TASKS_COLLECTION = 'tasks';

// --- Team CRUD ---

export async function getTeamsByWallet(walletAddress: string): Promise<Team[]> {
  const q = query(
    collection(db, TEAMS_COLLECTION),
    where('walletAddress', '==', walletAddress.toLowerCase()),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Team));
}

export async function getTeamById(teamId: string): Promise<Team | null> {
  const snap = await getDoc(doc(db, TEAMS_COLLECTION, teamId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Team;
}

export async function addTeam(team: Omit<Team, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, TEAMS_COLLECTION), {
    ...team,
    walletAddress: team.walletAddress.toLowerCase(),
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateTeam(teamId: string, updates: Partial<Team>): Promise<void> {
  await updateDoc(doc(db, TEAMS_COLLECTION, teamId), updates);
}

export async function deleteTeam(teamId: string): Promise<void> {
  await deleteDoc(doc(db, TEAMS_COLLECTION, teamId));
}

// --- Task CRUD ---

export async function getTasksByTeam(teamId: string): Promise<Task[]> {
  const q = query(
    collection(db, TASKS_COLLECTION),
    where('teamId', '==', teamId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task));
}

export async function addTask(task: Omit<Task, 'id'>): Promise<string> {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, TASKS_COLLECTION), {
    ...task,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
  await updateDoc(doc(db, TASKS_COLLECTION, taskId), {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteTask(taskId: string): Promise<void> {
  await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
}
