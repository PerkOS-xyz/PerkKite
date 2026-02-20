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
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export interface DeploymentStep {
  step: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  detail?: string;
  timestamp?: string;
}

export type LaunchStatus =
  | 'configuring'
  | 'provisioning'
  | 'installing'
  | 'configuring_agent'
  | 'starting'
  | 'active'
  | 'failed'
  | 'stopped';

export interface LaunchedAgent {
  id?: string;
  name: string;
  templateId: string;
  walletAddress: string;
  clientId: string;
  uniswapApiKey?: string;
  awsRegion: string;
  instanceId?: string;
  instanceIp?: string;
  sshKeyFingerprint: string;
  status: LaunchStatus;
  deploymentLog: DeploymentStep[];
  openclawConfig: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

const COLLECTION = 'launched_agents';

export async function getLaunchedAgentsByWallet(walletAddress: string): Promise<LaunchedAgent[]> {
  const q = query(
    collection(db, COLLECTION),
    where('walletAddress', '==', walletAddress.toLowerCase()),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LaunchedAgent));
}

export async function getLaunchedAgentById(id: string): Promise<LaunchedAgent | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as LaunchedAgent;
}

export async function addLaunchedAgent(agent: Omit<LaunchedAgent, 'id'>): Promise<string> {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...agent,
    walletAddress: agent.walletAddress.toLowerCase(),
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateLaunchedAgent(id: string, updates: Partial<LaunchedAgent>): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteLaunchedAgent(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
