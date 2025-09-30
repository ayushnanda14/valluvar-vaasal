import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../src/components/ProtectedRoute';
import { Box, Container, Typography, Paper, Grid, Button, TextField, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { db } from '../../src/firebase/firebaseConfig';
import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { useAuth } from '../../src/context/AuthContext';

const SERVICE_OPTIONS = [
  { value: 'marriageMatching', label: 'Marriage Matching' },
  { value: 'jathakPrediction', label: 'Jathak Prediction' },
  { value: 'jathakWriting', label: 'Jathak Writing' },
];

export default function PartnerDashboard() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refsList, setRefsList] = useState([]);
  const [form, setForm] = useState({ customerName: '', phone: '', serviceType: 'marriageMatching', notes: '' });

  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, 'partnerReferences'),
          where('partnerId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        const rows = [];
        snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
        setRefsList(rows);
      } catch (e) {
        console.error('Failed to load partner references', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser]);

  const handleAddReference = async () => {
    if (!currentUser) return;
    const name = form.customerName.trim();
    const phone = form.phone.trim();
    if (!name || !phone) return;
    try {
      await addDoc(collection(db, 'partnerReferences'), {
        partnerId: currentUser.uid,
        partnerEmail: currentUser.email || null,
        customerName: name,
        phone,
        serviceType: form.serviceType,
        status: 'pending',
        createdAt: serverTimestamp(),
        notes: form.notes || ''
      });
      setForm({ customerName: '', phone: '', serviceType: 'marriageMatching', notes: '' });
      // Refresh
      const q = query(
        collection(db, 'partnerReferences'),
        where('partnerId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const rows = [];
      snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
      setRefsList(rows);
    } catch (e) {
      console.error('Failed to add reference', e);
    }
  };

  return (
    <ProtectedRoute requiredRoles={["partner"]}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>Partner Dashboard</Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Add Reference</Typography>
              <TextField
                label="Customer Name"
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                fullWidth
                size="small"
                sx={{ mb: 1.5 }}
              />
              <TextField
                label="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                fullWidth
                size="small"
                sx={{ mb: 1.5 }}
              />
              <TextField
                label="Service"
                select
                value={form.serviceType}
                onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
                fullWidth
                size="small"
                sx={{ mb: 1.5 }}
              >
                {SERVICE_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Notes (optional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                fullWidth
                size="small"
                multiline
                minRows={2}
                sx={{ mb: 2 }}
              />
              <Button variant="contained" onClick={handleAddReference} disabled={!form.customerName || !form.phone}>Save</Button>
            </Paper>
          </Grid>

          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Your References</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Customer</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell>Service</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {refsList.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.customerName}</TableCell>
                        <TableCell>{r.phone}</TableCell>
                        <TableCell>{r.serviceType}</TableCell>
                        <TableCell>{r.status}</TableCell>
                        <TableCell>{r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : ''}</TableCell>
                      </TableRow>
                    ))}
                    {refsList.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">No references yet</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </ProtectedRoute>
  );
}


