import React from 'react';
import ServicePageLayout from '../../src/components/ServicePageLayout';

export default function JathakWriting() {
  return (
    <ServicePageLayout
      title="Jathak Writing"
      description="Upload your birth details and get a professionally written jathak from our expert astrologers."
      serviceType="jathakWriting"
      multipleUploads={true}
    />
  );
} 