'use client';

import { useState } from 'react';
import { JOB_IDS, type JobId } from '@/lib/job/catalog';
import { JobEstimator } from './JobEstimator';
import { JobPicker } from './JobPicker';

export function JobFlow({ mode, initialJobId = JOB_IDS[0] }: { mode: 'estimate' | 'quote'; initialJobId?: JobId }) {
  const [jobId, setJobId] = useState<JobId>(initialJobId);
  return (
    <>
      <JobPicker activeJobId={jobId} onSelect={setJobId} />
      <JobEstimator jobId={jobId} mode={mode} key={`${mode}-${jobId}`} />
    </>
  );
}
