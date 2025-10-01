import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../src/components/ProtectedRoute';
import { Box, Container, Typography, Paper, Grid, Button, TextField, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, FormControl, InputLabel, Select, FormHelperText, Alert } from '@mui/material';
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
  const [profile, setProfile] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [commStatusFilter, setCommStatusFilter] = useState('all');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        // Profile
        const profSnap = await getDocs(query(collection(db, 'partnerProfiles'), where('partnerId', '==', currentUser.uid)));
        if (!profSnap.empty) {
          setProfile({ id: profSnap.docs[0].id, ...profSnap.docs[0].data() });
        }
        const q = query(
          collection(db, 'partnerReferences'),
          where('partnerId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        const rows = [];
        snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
        setRefsList(rows);
        // Commissions
        const cq = query(collection(db, 'partnerCommissions'), where('partnerId', '==', currentUser.uid), orderBy('createdAt', 'desc'));
        const csnap = await getDocs(cq);
        const commRows = [];
        csnap.forEach((d) => commRows.push({ id: d.id, ...d.data() }));
        setCommissions(commRows);
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
    let phone = form.phone.trim();
    const newErrors = {};
    if (!name) newErrors.customerName = 'Name is required';
    if (!phone) newErrors.phone = 'Phone is required';
    // Normalize phone to 10-digit or +91XXXXXXXXXX
    phone = phone.replace(/\s+/g, '');
    if (/^0\d{10}$/.test(phone)) phone = `+91${phone.slice(1)}`;
    else if (/^\d{10}$/.test(phone)) phone = `+91${phone}`;
    else if (!/^\+?\d{10,15}$/.test(phone)) newErrors.phone = 'Enter valid phone number';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
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

        {/* Summary & Referral */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Total References</Typography>
              <Typography variant="h5">{refsList.length}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Pending</Typography>
              <Typography variant="h5">{refsList.filter(r => r.status !== 'approved').length}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Commission (Pending)</Typography>
              <Typography variant="h5">₹{commissions.filter(c => c.status !== 'paid').reduce((s, c) => s + (c.calculatedAmount || 0), 0)}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Commission (Paid)</Typography>
              <Typography variant="h5">₹{commissions.filter(c => c.status === 'paid').reduce((s, c) => s + (c.calculatedAmount || 0), 0)}</Typography>
            </Paper>
          </Grid>
        </Grid>

        {profile && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary">Your Referral</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={`Code: ${profile.referralCode}`} />
              <TextField size="small" value={`${typeof window !== 'undefined' ? window.location.origin : ''}${profile.referralLink}`} fullWidth />
              <Button size="small" onClick={() => navigator.clipboard.writeText(`${typeof window !== 'undefined' ? window.location.origin : ''}${profile.referralLink}`)}>Copy Link</Button>
            </Box>
          </Paper>
        )}
        {!profile && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Your partner profile is being prepared. Please contact admin if you cannot see your referral code.
          </Alert>
        )}

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
                error={!!errors.customerName}
                helperText={errors.customerName}
              />
              <TextField
                label="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                fullWidth
                size="small"
                sx={{ mb: 1.5 }}
                error={!!errors.phone}
                helperText={errors.phone}
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

        {/* Commissions */}
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="h6">Your Commissions</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Status</InputLabel>
                    <Select value={commStatusFilter} label="Status" onChange={(e) => setCommStatusFilter(e.target.value)}>
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="paid">Paid</MenuItem>
                    </Select>
                  </FormControl>
                  <Button variant="outlined" size="small" onClick={() => {
                    const rows = commissions.filter(c => commStatusFilter === 'all' ? true : c.status === commStatusFilter);
                    const header = ['Service','Amount','Status','CreatedAt','Notes'];
                    const lines = [header.join(',')];
                    rows.forEach(c => {
                      lines.push([c.serviceType, c.calculatedAmount || 0, c.status || '', c.createdAt?.toDate ? c.createdAt.toDate().toISOString() : '', (c.notes || '').replace(/\n/g,' ')].join(','));
                    });
                    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'commissions.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}>Export CSV</Button>
                </Box>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Service</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {commissions.filter(c => commStatusFilter === 'all' ? true : c.status === commStatusFilter).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.serviceType}</TableCell>
                        <TableCell align="right">₹{c.calculatedAmount || 0}</TableCell>
                        <TableCell>{c.status}</TableCell>
                        <TableCell>{c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString() : ''}</TableCell>
                        <TableCell>{c.notes || ''}</TableCell>
                      </TableRow>
                    ))}
                    {commissions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">No commissions yet</TableCell>
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


