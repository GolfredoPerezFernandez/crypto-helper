export type Vec3 = [number, number, number];

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
export const scale = (v: Vec3, s: number): Vec3 => [v[0]*s, v[1]*s, v[2]*s];
export const normalize = (v: Vec3): Vec3 => {
  const len = Math.sqrt(v[0]**2 + v[1]**2 + v[2]**2);
  return len === 0 ? [0,0,0] : [v[0]/len, v[1]/len, v[2]/len];
};
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1]*b[2] - a[2]*b[1],
  a[2]*b[0] - a[0]*b[2],
  a[0]*b[1] - a[1]*b[0]
];
export const dot = (a: Vec3, b: Vec3): number => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
export const distance = (a: Vec3, b: Vec3): number => {
  const dx = a[0]-b[0], dy = a[1]-b[1], dz = a[2]-b[2];
  return Math.sqrt(dx*dx + dy*dy + dz*dz);
};
export const midpoint = (a: Vec3, b: Vec3): Vec3 => scale(add(a, b), 0.5);
