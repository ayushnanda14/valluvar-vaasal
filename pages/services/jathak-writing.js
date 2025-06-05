import React from 'react';
import ServicePageLayout from '../../src/components/ServicePageLayout';
import { useTranslation } from 'react-i18next';

export default function JathakWriting() {
  const { t } = useTranslation('common');
  return (
    <ServicePageLayout
      title={t('services.jathakWriting.title', 'Jathak Writing')}
      description={t('services.jathakWriting.description', 'Upload your birth details and get a professionally written jathak from our expert astrologers.')}
      serviceType="jathakWriting"
      multipleUploads={true}
    />
  );
} 