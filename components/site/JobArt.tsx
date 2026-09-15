const JOB_ART = {
  'kitchen-remodel': 'kitchen',
  'bathroom-remodel': 'bathroom',
  'hvac-replacement': 'hvac',
  'water-heater-replacement': 'water-heater',
  'heat-pump-replacement': 'heat-pump',
  'deck-build': 'deck',
  all: 'toolbox',
} as const;

export function JobArt({ kind }: { kind: keyof typeof JOB_ART }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="category-art job-art"
      src={`/job/${JOB_ART[kind]}.svg`}
      alt=""
      width={240}
      height={240}
      decoding="async"
      aria-hidden="true"
      draggable={false}
    />
  );
}
