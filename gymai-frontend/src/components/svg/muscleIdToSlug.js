// Simple mapping from the old schematic MUSCLES ids to the detailed SVG slugs
const MAP = {
  neck: 'neck',
  lshoulder: 'deltoids',
  rshoulder: 'deltoids',
  chest: 'chest',
  larm: 'biceps',
  rarm: 'biceps',
  lcore: 'abs',
  rcore: 'abs',
  lquad: 'quadriceps',
  rquad: 'quadriceps',
  lcalf: 'calves',
  rcalf: 'calves',
  larmfore: 'forearm',
  rarmfore: 'forearm',
  hands: 'hands',
  gluteal: 'gluteal',
  adductors: 'adductors',
  hamstring: 'hamstring',
  knees: 'knees',
  ankles: 'ankles',
  feet: 'feet',
}

export function mapIdsToSlugs(ids = []) {
  const out = new Set()
  ids.forEach(id => {
    const s = MAP[id] || id
    out.add(s)
  })
  return Array.from(out)
}

export default mapIdsToSlugs
