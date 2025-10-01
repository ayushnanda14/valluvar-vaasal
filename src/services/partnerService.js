import { 
  addDoc, 
  collection, 
  doc, 
  getDocs, 
  orderBy, 
  query, 
  serverTimestamp, 
  updateDoc, 
  where 
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

// Partner-side helpers
export async function createPartnerReference({ partnerId, customerName, phone, serviceType, notes }) {
  if (!partnerId) throw new Error('partnerId required');
  return await addDoc(collection(db, 'partnerReferences'), {
    partnerId,
    customerName,
    phone,
    serviceType,
    status: 'pending',
    notes: notes || '',
    createdAt: serverTimestamp(),
  });
}

export async function listPartnerReferences(partnerId) {
  const q = query(collection(db, 'partnerReferences'), where('partnerId', '==', partnerId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  const rows = [];
  snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
  return rows;
}

export async function listPartnerCommissions(partnerId) {
  const q = query(collection(db, 'partnerCommissions'), where('partnerId', '==', partnerId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  const rows = [];
  snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
  return rows;
}

// Admin-side helpers
export async function approvePartnerReference(referenceId, adminId) {
  await updateDoc(doc(db, 'partnerReferences', referenceId), {
    status: 'approved',
    approvedAt: serverTimestamp(),
    approvedBy: adminId,
  });
}

export async function markPartnerCommissionPaid(commissionId, adminId, notes) {
  await updateDoc(doc(db, 'partnerCommissions', commissionId), {
    status: 'paid',
    notes: notes || '',
    paidAt: serverTimestamp(),
    paidBy: adminId,
    updatedAt: serverTimestamp(),
  });
}


