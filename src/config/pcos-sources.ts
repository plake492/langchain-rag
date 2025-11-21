import { SourceConfig } from '../types';

export const pcosSources: SourceConfig[] = [
  // =====================================================================
  // 1. MAJOR GUIDELINES: The 2023 International Evidence-based Guideline (The Gold Standard)
  // This guideline is a collaboration between ESHRE, ASRM, Endocrine Society, and many others.
  // The full publication links are often hosted by the collaborating journals/societies.
  // =====================================================================
  // European Society of Human Reproduction and Embryology (ESHRE) - Guideline Host
  {
    url: 'https://www.eshre.eu/Guidelines-and-Legal/Guidelines/Polycystic-Ovary-Syndrome',
    metadata: {
      organization: 'ESHRE',
      category: 'Major Guidelines/Prof. Society',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },
  // American Society for Reproductive Medicine (ASRM) - Guideline Co-Host/Publisher
  {
    url: 'https://www.asrm.org/practice-guidance/practice-committee-documents/recommendations-from-the-2023-international-evidence-based-guideline-for-the-assessment-and-management-of-polycystic-ovary-syndrome/',
    metadata: {
      organization: 'ASRM',
      category: 'Major Guidelines/Prof. Society',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },
  // PubMed Abstract - The Journal of Clinical Endocrinology & Metabolism (JCEM) Co-publication
  {
    url: 'https://pubmed.ncbi.nlm.nih.gov/37580314/',
    metadata: {
      organization: 'NIH/Endocrine Society',
      category: 'Published Study/Guideline',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },
  // European Society of Endocrinology (ESE) - Guideline Partner
  {
    url: 'https://www.ese-hormones.org/publications/directory/partner-guideline-international-evidence-based-guideline-for-the-assessment-and-management-of-polycystic-ovary-syndrome-2023/',
    metadata: {
      organization: 'ESE',
      category: 'Major Guidelines/Prof. Society',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },
  // Royal College of Obstetricians and Gynaecologists (RCOG) - Guideline Partner
  {
    url: 'https://www.rcog.org.uk/guidance/browse-all-guidance/other-guidelines-and-reports/international-evidence-based-guideline-on-polycystic-ovary-syndrome/',
    metadata: {
      organization: 'RCOG',
      category: 'Major Guidelines/Prof. Society',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },
  // Monash University (PCOS Centre of Excellence) - Guideline Lead
  {
    url: 'https://www.monash.edu/medicine/mchri/pcos/guideline',
    metadata: {
      organization: 'Monash University (MCHRI)',
      category: 'Academic/Guideline Host',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },

  // =====================================================================
  // 2. PROFESSIONAL MEDICAL SOCIETIES (Primary Sources for Clinical Protocols)
  // =====================================================================
  // American College of Obstetricians and Gynecologists (ACOG)
  {
    url: 'https://www.acog.org/womens-health/faqs/polycystic-ovary-syndrome-pcos',
    metadata: {
      organization: 'ACOG',
      category: 'Professional Medical Society',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },
  // The Endocrine Society
  {
    url: 'https://www.endocrine.org/patient-engagement/endocrine-library/pcos',
    metadata: {
      organization: 'The Endocrine Society',
      category: 'Professional Medical Society',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },
  // American Society for Reproductive Medicine (ASRM) - Patient Education
  {
    url: 'https://www.reproductivefacts.org/news-and-publications/fact-sheets-and-infographics/polycystic-ovary-syndrome-pcos/',
    metadata: {
      organization: 'ASRM',
      category: 'Professional Medical Society',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },
  // American Association of Family Physicians (AAFP)
  {
    url: 'https://www.aafp.org/pubs/afp/issues/2024/1100/practice-guidelines-polycystic-ovary-syndrome.html',
    metadata: {
      organization: 'AAFP',
      category: 'Professional Medical Society',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },
  // Androgen Excess and PCOS Society (AE-PCOS Society)
  {
    url: 'http://www.androgenexcess.org/pcos-treatment-and-management.html',
    metadata: {
      organization: 'AE-PCOS Society',
      category: 'Professional Medical Society',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },
  // American Diabetes Association (ADA) - PCOS/Metabolic link
  {
    url: 'https://diabetes.org/health-wellness/weight-loss/pcos',
    metadata: {
      organization: 'ADA',
      category: 'Professional Medical Society',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },
  // American Heart Association (AHA) - PCOS/Cardiovascular link
  {
    url: 'https://www.ahajournals.org/doi/10.1161/JAHA.123.033572',
    metadata: {
      organization: 'AHA',
      category: 'Published Study/Prof. Society',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },

  // =====================================================================
  // 3. GOVERNMENT / PUBLIC HEALTH AGENCIES
  // =====================================================================
  // National Institutes of Health (NIH) - NICHD
  {
    url: 'https://www.nichd.nih.gov/health/topics/pcos',
    metadata: {
      organization: 'NICHD/NIH',
      category: 'Government/Public Health',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },
  // MedlinePlus (National Library of Medicine / NIH)
  {
    url: 'https://medlineplus.gov/polycysticovarysyndrome.html',
    metadata: {
      organization: 'MedlinePlus/NIH',
      category: 'Government/Public Health',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },
  // U.S. Office on Women's Health (HHS)
  {
    url: 'https://womenshealth.gov/a-z-topics/polycystic-ovary-syndrome',
    metadata: {
      organization: "U.S. Office on Women's Health",
      category: 'Government/Public Health',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },
  // World Health Organization (WHO)
  {
    url: 'https://www.who.int/news-room/fact-sheets/detail/polycystic-ovary-syndrome',
    metadata: {
      organization: 'World Health Organization (WHO)',
      category: 'Government/Public Health',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },
  // Centers for Disease Control and Prevention (CDC) - PCOS/Infertility/Risk
  {
    url: 'https://www.cdc.gov/reproductivehealth/infertility/index.htm',
    metadata: {
      organization: 'CDC',
      category: 'Government/Public Health',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },

  // =====================================================================
  // 4. ACADEMIC MEDICAL CENTERS & CONSUMER GUIDES (High Credibility)
  // =====================================================================
  // Mayo Clinic
  {
    url: 'https://www.mayoclinic.org/diseases-conditions/pcos/diagnosis-treatment/drc-20353443',
    metadata: {
      organization: 'Mayo Clinic',
      category: 'Academic Medical Center',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },
  // Johns Hopkins Medicine
  {
    url: 'https://www.hopkinsmedicine.org/health/conditions-and-diseases/polycystic-ovary-syndrome-pcos',
    metadata: {
      organization: 'Johns Hopkins Medicine',
      category: 'Academic Medical Center',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },
  // Cleveland Clinic
  {
    url: 'https://my.clevelandclinic.org/health/diseases/8316-polycystic-ovary-syndrome-pcos',
    metadata: {
      organization: 'Cleveland Clinic',
      category: 'Academic Medical Center',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },
  // AskPCOS (Monash University App/Resource)
  {
    url: 'https://www.askpcos.org/',
    metadata: {
      organization: 'Monash University (MCHRI)',
      category: 'Academic/Patient Resource',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },
  // PCOS Challenge: The National Polycystic Ovary Syndrome Association (Patient Advocacy/Education)
  {
    url: 'https://pcoschallenge.org/about-pcos/',
    metadata: {
      organization: 'PCOS Challenge',
      category: 'Patient Advocacy/Education',
      credibility: 'medium',
      lastVerified: '2025-11-21',
    },
  },
];

// Additional URLs to scrape (can be added as needed for a total of 30+)
export const additionalSources: SourceConfig[] = [
  // PubMed Search for High-Impact Reviews (Example Search URL)
  {
    url: 'https://pubmed.ncbi.nlm.nih.gov/?term=polycystic+ovary+syndrome+review&filter=years.2023-2025&sort=relevance',
    metadata: {
      organization: 'PubMed/NLM/NIH',
      category: 'Research Literature',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },
  // StatPearls (Clinician Review Articles)
  {
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK459495/',
    metadata: {
      organization: 'NCBI Bookshelf/NIH',
      category: 'Clinician Review',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },
  // European Journal of Endocrinology (PCOS Guideline Publication)
  {
    url: 'https://www.eje.org/view/journals/eje/189/2/article-G43.xml',
    metadata: {
      organization: 'European Journal of Endocrinology (ESE)',
      category: 'Published Study/Guideline',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },
  // The Lancet (Example of a major medical journal for high-impact studies)
  {
    url: 'https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(21)02307-2/fulltext',
    metadata: {
      organization: 'The Lancet',
      category: 'Published Study/Review',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },
  // PCOS Awareness Association (PCOSAA)
  {
    url: 'https://pcosaa.org/about-pcos',
    metadata: {
      organization: 'PCOS Awareness Association',
      category: 'Patient Advocacy/Education',
      credibility: 'medium',
      lastVerified: '2025-11-21',
    },
  },
  // RESOLVE: The National Infertility Association (PCOS/Infertility)
  {
    url: 'https://resolve.org/infertility-101/infertility-diseases-conditions/polycystic-ovarian-syndrome-pcos/',
    metadata: {
      organization: 'RESOLVE',
      category: 'Patient Advocacy/Infertility',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },
  // Harvard Medical School / Harvard Health
  {
    url: 'https://www.health.harvard.edu/a_to_z/polycystic-ovary-syndrome-pcos-a-to-z',
    metadata: {
      organization: 'Harvard Health Publishing',
      category: 'Academic Medical Center',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },
  // The BMJ (British Medical Journal - Major International Journal)
  {
    url: 'https://www.bmj.com/content/379/bmj-2021-069411',
    metadata: {
      organization: 'The BMJ',
      category: 'Published Study/Review',
      credibility: 'high',
      lastVerified: '2025-11-21',
    },
  },
];
