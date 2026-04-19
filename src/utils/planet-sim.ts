import { type Vec3, normalize, add, scale, cross, dot, midpoint, sub } from './vector3';

export interface Cell {
  id: number;
  center: Vec3;     // The original vertex from the triangle mesh
  vertices: Vec3[]; // The polygon corners (centroids of adjacent triangles)
  plateId: number;
  height: number;
  type: 'ocean' | 'land' | 'mountain' | 'coast';
  neighbors: number[]; // Indices of adjacent cells (vertices connected in triangle mesh)
}

export interface PlanetState {
  cells: Cell[];
  plates: Plate[];
}

interface Plate {
  id: number;
  center: Vec3;
  axis: Vec3; 
  speed: number;
  type: 'ocean' | 'continent';
  color: string;
}

const PHI = (1 + Math.sqrt(5)) / 2;

const BASE_VERTICES: Vec3[] = (
  [
    [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
    [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
    [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]
  ] as Vec3[]
).map((v) => normalize(v));

const BASE_FACES = [
  [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
  [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
  [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
  [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
];

const random = (seed: number) => {
  let x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

export function generatePlanet(seed: number = 1, subdivisionLevel: number = 2): PlanetState {
  let vertices = [...BASE_VERTICES];
  let faces = [...BASE_FACES];

  const midPointCache = new Map<string, number>();
  
  const getMidPoint = (v1Idx: number, v2Idx: number): number => {
    const key = v1Idx < v2Idx ? `${v1Idx}-${v2Idx}` : `${v2Idx}-${v1Idx}`;
    if (midPointCache.has(key)) return midPointCache.get(key)!;
    
    const mid = normalize(midpoint(vertices[v1Idx], vertices[v2Idx]));
    const newIdx = vertices.length;
    vertices.push(mid);
    midPointCache.set(key, newIdx);
    return newIdx;
  };

  // Subdivide (Geodesic Sphere)
  for (let i = 0; i < subdivisionLevel; i++) {
    const newFaces: number[][] = [];
    for (const face of faces) {
      const v0 = face[0];
      const v1 = face[1];
      const v2 = face[2];

      const a = getMidPoint(v0, v1);
      const b = getMidPoint(v1, v2);
      const c = getMidPoint(v2, v0);

      newFaces.push([v0, a, c]);
      newFaces.push([v1, b, a]);
      newFaces.push([v2, c, b]);
      newFaces.push([a, b, c]);
    }
    faces = newFaces;
  }

  // --- Convert to Dual Mesh (Polygons) ---
  
  // 1. Map each vertex to the faces that touch it
  const vertToFaces = new Map<number, number[]>(); // vertexIdx -> [faceIdx...]
  const faceCentroids: Vec3[] = [];

  faces.forEach((face, fIdx) => {
    // Calculate centroid for this face (will be a corner of the dual cell)
    const v0 = vertices[face[0]];
    const v1 = vertices[face[1]];
    const v2 = vertices[face[2]];
    const centroid = normalize(scale(add(add(v0, v1), v2), 1/3));
    faceCentroids.push(centroid);

    // Register face to its vertices
    face.forEach(vIdx => {
      if (!vertToFaces.has(vIdx)) vertToFaces.set(vIdx, []);
      vertToFaces.get(vIdx)!.push(fIdx);
    });
  });

  // 2. Build Cells
  const cells: Cell[] = vertices.map((vertex, vIdx) => {
    const adjacentFacesIndices = vertToFaces.get(vIdx) || [];
    
    // Sort faces to form a loop
    // We need to find the order. 
    // Pick first face. Find next face that shares an edge connected to vIdx.
    
    const sortedFaceIndices: number[] = [];
    if (adjacentFacesIndices.length > 0) {
        const currentFaces = [...adjacentFacesIndices];
        let currentFaceIdx = currentFaces.pop()!;
        sortedFaceIndices.push(currentFaceIdx);

        // Find a vertex shared between current face and vIdx that is NOT vIdx
        // Actually, a face has 3 vertices. One is vIdx. Two others are A, B.
        // The next face must share vIdx and B (or A).
        
        // Let's track the "next" vertex on the rim.
        const f = faces[currentFaceIdx];
        // Find which index is vIdx
        const pivotPos = f.indexOf(vIdx);
        // The other two are (pivotPos+1)%3 and (pivotPos+2)%3
        let nextVertexInRim = f[(pivotPos + 1) % 3];

        while (currentFaces.length > 0) {
            // Find a face in currentFaces that has nextVertexInRim
            const nextFaceIdxIndex = currentFaces.findIndex(idx => faces[idx].includes(nextVertexInRim));
            
            if (nextFaceIdxIndex === -1) {
                // Should not happen in a closed mesh, but safety break
                break;
            }
            
            const nextFaceIdx = currentFaces.splice(nextFaceIdxIndex, 1)[0];
            sortedFaceIndices.push(nextFaceIdx);
            
            // Update nextVertexInRim
            const nextFace = faces[nextFaceIdx];
            const vPos = nextFace.indexOf(vIdx);
            const r1 = nextFace[(vPos + 1) % 3];
            const r2 = nextFace[(vPos + 2) % 3];
            
            // One of these is the old nextVertexInRim. The other is the new one.
            nextVertexInRim = (r1 === nextVertexInRim) ? r2 : r1;
        }
    }

    const polyVertices = sortedFaceIndices.map(idx => faceCentroids[idx]);
    
    // Neighbors in the dual mesh are the vertices connected to this vertex in the triangle mesh
    // Which are exactly the 'rim' vertices we just traversed?
    // Yes, actually. But let's extract them cleanly.
    // Or just use the fact that if faces share an edge, the cell centers (original vertices) are neighbors.
    
    // Let's rebuild neighbors: 
    // The vertices connected to vIdx in the triangle mesh.
    const neighbors = new Set<number>();
    adjacentFacesIndices.forEach(fIdx => {
        const f = faces[fIdx];
        f.forEach(v => {
            if (v !== vIdx) neighbors.add(v);
        });
    });

    return {
      id: vIdx,
      center: vertex,
      vertices: polyVertices,
      plateId: -1,
      height: 0,
      type: 'ocean',
      neighbors: Array.from(neighbors)
    };
  });


  // --- Tectonics on Cells ---

  // 1. Create Plates
  const numPlates = 8 + Math.floor(random(seed) * 10);
  const plates: Plate[] = [];
  const seeds: number[] = [];
  
  for (let i = 0; i < numPlates; i++) {
    const cellIdx = Math.floor(random(seed + i) * cells.length);
    seeds.push(cellIdx);
    plates.push({
      id: i,
      center: cells[cellIdx].center,
      axis: normalize([random(seed+i*10)-0.5, random(seed+i*11)-0.5, random(seed+i*12)-0.5]),
      speed: (random(seed+i*13) * 0.5 + 0.1) * (random(seed+i*14) > 0.5 ? 1 : -1),
      type: random(seed+i*15) > 0.5 ? 'ocean' : 'continent',
      color: `hsl(${Math.floor(random(seed+i)*360)}, 70%, 50%)`
    });
  }

  // 2. Assign plates (BFS)
  const queue = seeds.map((s, i) => ({cellIdx: s, plateId: i}));
  const assigned = new Set<number>();
  seeds.forEach(s => {
      assigned.add(s);
      cells[s].plateId = plates.findIndex(p => p.center === cells[s].center); // Dirty fix for index
      // Actually let's just use 'i' from the loop above
  });
  // Fix plate assignment for seeds
  seeds.forEach((s, i) => cells[s].plateId = i);

  let head = 0;
  while(head < queue.length) {
    const {cellIdx, plateId} = queue[head++];
    // Randomize neighbors for organic look
    const neighbors = cells[cellIdx].neighbors; // .sort(() => Math.random() - 0.5);
    
    for (const nIdx of neighbors) {
      if (!assigned.has(nIdx)) {
        cells[nIdx].plateId = plateId;
        assigned.add(nIdx);
        queue.push({cellIdx: nIdx, plateId});
      }
    }
  }

  // 3. Calculate Height
  cells.forEach(cell => {
    const plate = plates[cell.plateId];
    let height = plate.type === 'continent' ? 0.3 : -0.5;
    
    // Simplex-ish noise
    const noise = Math.sin(cell.center[0]*8 + seed) * Math.cos(cell.center[1]*8) * Math.sin(cell.center[2]*8);
    height += noise * 0.1;

    let stress = 0;
    let isBoundary = false;

    for (const nIdx of cell.neighbors) {
      const neighbor = cells[nIdx];
      if (neighbor.plateId !== cell.plateId) {
        isBoundary = true;
        const otherPlate = plates[neighbor.plateId];

        const v1 = scale(cross(plate.axis, cell.center), plate.speed);
        const v2 = scale(cross(otherPlate.axis, neighbor.center), otherPlate.speed);
        const relV = sub(v1, v2);
        const boundaryDir = normalize(sub(cell.center, neighbor.center));
        const convergence = -dot(relV, boundaryDir); 

        if (convergence > 0.01) stress += convergence * 8;
        else if (convergence < -0.01) stress += convergence * 3;
      }
    }

    if (isBoundary) height += stress;
    
    cell.height = height;
    if (cell.height > 0.5) cell.type = 'mountain';
    else if (cell.height > 0) cell.type = 'land';
    else cell.type = 'ocean';
  });

  return { cells, plates };
}
