import React from 'react';
import ServicePageLayout from '../../src/components/ServicePageLayout';
import { useTranslation } from 'react-i18next';

export default function MarriageMatching() {
  const { t } = useTranslation('common');
  return (
    <ServicePageLayout
      title={t('services.marriageMatching.title', 'Marriage Matching')}
      description={t('services.marriageMatching.description', 'Upload horoscopes and get marriage compatibility analysis from our expert astrologers.')}
      serviceType="marriageMatching"
      dualUpload={true}
      dualUploadLabels={[t('common.bride'), t('common.groom')]}
      multipleUploads={true}
    />
  );
} 