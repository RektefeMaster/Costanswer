import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HowMuchUSA',
    short_name: 'HowMuchUSA',
    description: 'Clear answers for everyday decisions in the USA.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f1e8',
    theme_color: '#102a2a',
  };
}

