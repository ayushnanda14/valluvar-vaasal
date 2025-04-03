import React from 'react';
import ServicePageLayout from '../../src/components/ServicePageLayout';

export default function MarriageMatching() {
  return (
    <ServicePageLayout
      title="Marriage Matching"
      description="Upload horoscopes and get marriage compatibility analysis from our expert astrologers."
      serviceType="marriageMatching"
      dualUpload={true}
      dualUploadLabels={['Bride', 'Groom']}
      multipleUploads={true}
    />
  );
} 