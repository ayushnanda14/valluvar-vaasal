import { createPaymentRecords } from '../src/services/createPaymentRecords';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(),
  collection: jest.fn(),
  serverTimestamp: jest.fn(() => 'mock-timestamp'),
}));
jest.mock('../src/firebase/firebaseConfig', () => ({
  db: {},
}));

describe('createPaymentRecords', () => {
  it('creates a payment record for each astrologer', async () => {
    const selectedAstrologers = [
      { id: 'astro1', displayName: 'Astro One', serviceCharges: { testService: 1000 } },
      { id: 'astro2', displayName: 'Astro Two', serviceCharges: { testService: 2000 } },
    ];
    const currentUser = { uid: 'client1', displayName: 'Client One' };
    const serviceType = 'testService';
    const paymentResponse = {
      razorpay_payment_id: 'pay_123',
      razorpay_order_id: 'order_123',
      razorpay_signature: 'sig_123',
    };
    const serviceRequestRef = { id: 'req_123' };

    await createPaymentRecords({
      selectedAstrologers,
      currentUser,
      serviceType,
      paymentResponse,
      serviceRequestRef,
    });

    expect(addDoc).toHaveBeenCalledTimes(2);
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        astrologerId: 'astro1',
        clientId: 'client1',
        amount: 1000 + Math.round(1000 * 0.18),
        razorpay_payment_id: 'pay_123',
        serviceRequestId: 'req_123',
        timestamp: 'mock-timestamp',
      })
    );
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        astrologerId: 'astro2',
        amount: 2000 + Math.round(2000 * 0.18),
      })
    );
  });
}); 