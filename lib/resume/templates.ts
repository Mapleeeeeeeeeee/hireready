/**
 * Resume templates for users who don't have their own resume
 */

import type { ResumeContent } from './types';

export interface ResumeTemplate {
  id: string;
  nameKey: string; // i18n key
  descriptionKey: string; // i18n key
  content: ResumeContent;
}

export const RESUME_TEMPLATES: ResumeTemplate[] = [
  {
    id: 'software-engineer',
    nameKey: 'templates.softwareEngineer.name',
    descriptionKey: 'templates.softwareEngineer.description',
    content: {
      name: 'Alex Chen',
      summary: 'Full-stack software engineer with 5 years of experience...',
      skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker'],
      experience: [
        {
          company: 'Tech Corp',
          title: 'Senior Software Engineer',
          duration: '2021 - Present',
          description: 'Led development of microservices architecture...',
        },
        {
          company: 'Startup Inc',
          title: 'Software Engineer',
          duration: '2019 - 2021',
          description: 'Built React applications...',
        },
      ],
      education: [
        {
          school: 'National Taiwan University',
          degree: 'B.S. Computer Science',
          year: '2019',
        },
      ],
    },
  },
  {
    id: 'product-manager',
    nameKey: 'templates.productManager.name',
    descriptionKey: 'templates.productManager.description',
    content: {
      name: 'Jamie Lin',
      summary: 'Product manager with 4 years of experience in B2B SaaS...',
      skills: ['Product Strategy', 'User Research', 'A/B Testing', 'SQL', 'Figma', 'Jira'],
      experience: [
        {
          company: 'SaaS Company',
          title: 'Senior Product Manager',
          duration: '2022 - Present',
          description: 'Own product roadmap for enterprise features...',
        },
      ],
      education: [
        {
          school: 'National Chengchi University',
          degree: 'MBA',
          year: '2020',
        },
      ],
    },
  },
  {
    id: 'general',
    nameKey: 'templates.general.name',
    descriptionKey: 'templates.general.description',
    content: {
      name: 'Sam Wang',
      summary: 'Motivated professional with diverse experience...',
      skills: ['Communication', 'Problem Solving', 'Team Collaboration', 'Project Management'],
      experience: [
        {
          company: 'Previous Company',
          title: 'Team Lead',
          duration: '2020 - Present',
        },
      ],
      education: [
        {
          school: 'University',
          degree: 'Bachelor Degree',
          year: '2018',
        },
      ],
    },
  },
];

export function getTemplateById(id: string): ResumeTemplate | undefined {
  return RESUME_TEMPLATES.find((t) => t.id === id);
}
