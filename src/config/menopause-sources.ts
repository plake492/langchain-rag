import { SourceConfig } from "../types";

export const menopauseSources: SourceConfig[] = [
  // The Menopause Society
  {
    url: "https://www.menopause.org/for-women/menopause-faqs",
    metadata: {
      organization: "The Menopause Society",
      category: "Professional Medical Society",
      credibility: "high",
      lastVerified: "2025-11-10",
    },
  },
  {
    url: "https://www.menopause.org/for-women/sexual-health-menopause-online",
    metadata: {
      organization: "The Menopause Society",
      category: "Professional Medical Society",
      credibility: "high",
      lastVerified: "2025-11-10",
    },
  },

  // ACOG
  {
    url: "https://www.acog.org/womens-health/faqs/the-menopause-years",
    metadata: {
      organization: "ACOG",
      category: "Professional Medical Society",
      credibility: "high",
      lastVerified: "2025-11-10",
    },
  },

  // Government Sources
  {
    url: "https://www.womenshealth.gov/menopause",
    metadata: {
      organization: "U.S. Office on Women's Health",
      category: "Government",
      credibility: "high",
      lastVerified: "2025-11-10",
    },
  },
  {
    url: "https://medlineplus.gov/menopause.html",
    metadata: {
      organization: "MedlinePlus/NIH",
      category: "Government",
      credibility: "high",
      lastVerified: "2025-11-10",
    },
  },
  {
    url: "https://medlineplus.gov/hormonereplacementtherapy.html",
    metadata: {
      organization: "MedlinePlus/NIH",
      category: "Government",
      credibility: "high",
      lastVerified: "2025-11-10",
    },
  },

  // Academic Medical Centers
  {
    url: "https://www.uclahealth.org/obgyn/menopause",
    metadata: {
      organization: "UCLA Health",
      category: "Academic Medical Center",
      credibility: "high",
      lastVerified: "2025-11-10",
    },
  },
];

// Additional URLs to scrape (add as you verify them)
export const additionalSources: SourceConfig[] = [
  // IMS - may require special handling
  {
    url: "https://www.imsociety.org/education/",
    metadata: {
      organization: "International Menopause Society",
      category: "Professional Medical Society",
      credibility: "high",
      lastVerified: "2025-11-10",
    },
  },
  // Add more as needed
];
