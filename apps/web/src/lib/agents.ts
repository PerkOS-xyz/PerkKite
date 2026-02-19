import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';

export interface Agent {
  id?: string;
  name: string;
  clientId: string;
  mcpUrl: string;
  walletAddress: string;
  knowledge: string[];
  createdAt: Timestamp | Date;
}

const AGENTS_COLLECTION = 'agents';

export async function getAgentsByWallet(walletAddress: string): Promise<Agent[]> {
  const q = query(
    collection(db, AGENTS_COLLECTION),
    where('walletAddress', '==', walletAddress.toLowerCase()),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Agent));
}

export async function addAgent(agent: Omit<Agent, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, AGENTS_COLLECTION), {
    ...agent,
    walletAddress: agent.walletAddress.toLowerCase(),
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function deleteAgent(agentId: string): Promise<void> {
  await deleteDoc(doc(db, AGENTS_COLLECTION, agentId));
}

export async function addKnowledgeToAgent(agentId: string, knowledgeId: string): Promise<void> {
  // For now, we'll handle this client-side
  // In production, use updateDoc with arrayUnion
}
