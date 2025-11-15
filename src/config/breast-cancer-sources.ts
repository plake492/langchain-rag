import { SourceConfig } from '../types';

export const breastCancerSources: SourceConfig[] = [
  // National Cancer Institute (NCI) - Government Research
  {
    url: 'https://www.cancer.gov/types/breast',
    metadata: {
      organization: 'National Cancer Institute (NCI)',
      category: 'Government/Research',
      credibility: 'high',
      lastVerified: '2025-11-13',
    },
  },
  {
    url: 'https://www.cancer.gov/types/breast/patient/breast-treatment-pdq',
    metadata: {
      organization: 'National Cancer Institute (NCI)',
      category: 'Government/Research',
      credibility: 'high',
      lastVerified: '2025-11-13',
    },
  },

  // American Cancer Society (ACS) - Non-Profit Patient Education
  {
    url: 'https://www.cancer.org/cancer/types/breast-cancer.html',
    metadata: {
      organization: 'American Cancer Society (ACS)',
      category: 'Non-Profit Advocacy',
      credibility: 'high',
      lastVerified: '2025-11-13',
    },
  },
  {
    url: 'https://www.cancer.org/cancer/types/breast-cancer/screening-and-early-detection.html',
    metadata: {
      organization: 'American Cancer Society (ACS)',
      category: 'Non-Profit Advocacy',
      credibility: 'high',
      lastVerified: '2025-11-13',
    },
  },

  // Cancer.Net (American Society of Clinical Oncology - ASCO)
  {
    url: 'https://www.cancer.net/cancer-types/breast-cancer/overview',
    metadata: {
      organization: 'Cancer.Net (ASCO)',
      category: 'Professional Medical Society',
      credibility: 'high',
      lastVerified: '2025-11-13',
    },
  },

  // National Comprehensive Cancer Network (NCCN) - Guidelines for Patients
  // Note: NCCN provides patient-friendly versions of clinical guidelines.
  {
    url: 'https://www.nccn.org/patientresources/patient-resources/guidelines-for-patients/breast-cancer-resources',
    metadata: {
      organization: 'NCCN',
      category: 'Clinical Guidelines',
      credibility: 'high',
      lastVerified: '2025-11-13',
    },
  },

  // Breastcancer.org - Specialized Non-Profit
  {
    url: 'https://www.breastcancer.org/about-breast-cancer',
    metadata: {
      organization: 'Breastcancer.org',
      category: 'Non-Profit Advocacy',
      credibility: 'high',
      lastVerified: '2025-11-13',
    },
  },
  {
    url: 'https://www.breastcancer.org/treatment',
    metadata: {
      organization: 'Breastcancer.org',
      category: 'Non-Profit Advocacy',
      credibility: 'high',
      lastVerified: '2025-11-13',
    },
  },

  // Centers for Disease Control and Prevention (CDC) - Government Public Health
  {
    url: 'https://www.cdc.gov/breast-cancer/index.html',
    metadata: {
      organization: 'CDC',
      category: 'Government',
      credibility: 'high',
      lastVerified: '2025-11-13',
    },
  },

  // MedlinePlus/NIH - Government Health Information
  {
    url: 'https://medlineplus.gov/breastcancer.html',
    metadata: {
      organization: 'MedlinePlus/NIH',
      category: 'Government',
      credibility: 'high',
      lastVerified: '2025-11-13',
    },
  },
];
