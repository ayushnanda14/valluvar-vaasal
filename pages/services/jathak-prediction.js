import React from 'react';
import ServicePageLayout from '../../src/components/ServicePageLayout';

export default function JathakPrediction() {
  return (
    <ServicePageLayout
      title="Jathak Prediction"
      description="Upload your jathak and get detailed predictions from our expert astrologers."
      serviceType="jathakPrediction"
      multipleUploads={true}
    />
  );
} 