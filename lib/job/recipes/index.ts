import { JOB_IDS, type JobId } from '../catalog';
import { validateRecipe } from '../recipe-validate';
import type { JobRecipe } from '../types';
import { bathroomRemodel } from './bathroom-remodel';
import { concreteDriveway } from './concrete-driveway';
import { deckBuild } from './deck-build';
import { drywallInstall } from './drywall-install';
import { electricalPanelUpgrade } from './electrical-panel-upgrade';
import { exteriorDoorReplacement } from './exterior-door-replacement';
import { fenceInstall } from './fence-install';
import { heatPumpReplacement } from './heat-pump-replacement';
import { hvacReplacement } from './hvac-replacement';
import { interiorPainting } from './interior-painting';
import { sidingReplacement } from './siding-replacement';
import { treeRemoval } from './tree-removal';
import { waterHeaterReplacement } from './water-heater-replacement';
import { windowReplacement } from './window-replacement';

const recipes: Record<JobId, JobRecipe> = {
  'hvac-replacement': hvacReplacement,
  'water-heater-replacement': waterHeaterReplacement,
  'electrical-panel-upgrade': electricalPanelUpgrade,
  'tree-removal': treeRemoval,
  'deck-build': deckBuild,
  'fence-install': fenceInstall,
  'concrete-driveway': concreteDriveway,
  'interior-painting': interiorPainting,
  'bathroom-remodel': bathroomRemodel,
  'heat-pump-replacement': heatPumpReplacement,
  'window-replacement': windowReplacement,
  'exterior-door-replacement': exteriorDoorReplacement,
  'siding-replacement': sidingReplacement,
  'drywall-install': drywallInstall,
};

for (const jobId of JOB_IDS) validateRecipe(recipes[jobId]);

export function getRecipe(jobId: JobId): JobRecipe {
  return recipes[jobId];
}

export function listRecipes(): JobRecipe[] {
  return JOB_IDS.map((jobId) => recipes[jobId]);
}
