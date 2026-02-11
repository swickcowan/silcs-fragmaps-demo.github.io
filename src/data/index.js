/**
 * FragMap Data Index
 * Generated on 2026-02-10T20:13:40.856Z
 */

import { spheres as hydrophobicSpheres, gridInfo as hydrophobicGridInfo, sphereCount as hydrophobicCount } from './hydrophobic.js';
import { spheres as hbondDonorSpheres, gridInfo as hbondDonorGridInfo, sphereCount as hbondDonorCount } from './hbond-donor.js';
import { spheres as hbondAcceptorSpheres, gridInfo as hbondAcceptorGridInfo, sphereCount as hbondAcceptorCount } from './hbond-acceptor.js';
import { spheres as positiveSpheres, gridInfo as positiveGridInfo, sphereCount as positiveCount } from './positive.js';
import { spheres as negativeSpheres, gridInfo as negativeGridInfo, sphereCount as negativeCount } from './negative.js';
import { spheres as aromaticSpheres, gridInfo as aromaticGridInfo, sphereCount as aromaticCount } from './aromatic.js';

export const fragMaps = {
  hydrophobic: { spheres: hydrophobicSpheres, gridInfo: hydrophobicGridInfo, count: hydrophobicCount },
  'hbond-donor': { spheres: hbondDonorSpheres, gridInfo: hbondDonorGridInfo, count: hbondDonorCount },
  'hbond-acceptor': { spheres: hbondAcceptorSpheres, gridInfo: hbondAcceptorGridInfo, count: hbondAcceptorCount },
  positive: { spheres: positiveSpheres, gridInfo: positiveGridInfo, count: positiveCount },
  negative: { spheres: negativeSpheres, gridInfo: negativeGridInfo, count: negativeCount },
  aromatic: { spheres: aromaticSpheres, gridInfo: aromaticGridInfo, count: aromaticCount }
};

export const fragMapIds = ['hydrophobic', 'hbond-donor', 'hbond-acceptor', 'positive', 'negative', 'aromatic'];

export function getPrecomputedSpheres(fragMapId, isovalue = -0.5) {
  const fragMap = fragMaps[fragMapId];
  if (!fragMap) return null;
  return fragMap.spheres;
}

export function getFragMapInfo(fragMapId) {
  const fragMap = fragMaps[fragMapId];
  if (!fragMap) return null;
  return fragMap.gridInfo;
}

export function isFragMapAvailable(fragMapId) {
  return !!fragMaps[fragMapId];
}

export default fragMaps;
