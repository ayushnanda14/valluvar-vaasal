import React from 'react';
import ServicePageLayout from '../../src/components/ServicePageLayout';
import { useTranslation } from 'react-i18next';

export default function JathakPrediction() {
  const { t } = useTranslation('common');
  return (
    <ServicePageLayout
      title={t('services.jathakPrediction.title', 'Jathak Prediction')}
      description={t('services.jathakPrediction.description', 'Upload your jathak and get detailed predictions from our expert astrologers.')}
      serviceType="jathakPrediction"
      multipleUploads={true}
    />
  );
} 