// ========== Spatial Hash Grid ==========

export class SpatialGrid {
  constructor(cellSize = 40) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  clear() {
    this.cells.clear();
  }

  _key(x, y) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return (cx << 16) ^ cy;
  }

  insert(entity) {
    const key = this._key(entity.x, entity.y);
    let bucket = this.cells.get(key);
    if (!bucket) {
      bucket = [];
      this.cells.set(key, bucket);
    }
    bucket.push(entity);
  }

  query(cx, cy, radius) {
    const results = [];
    const r2 = radius * radius;
    const minCX = Math.floor((cx - radius) / this.cellSize);
    const maxCX = Math.floor((cx + radius) / this.cellSize);
    const minCY = Math.floor((cy - radius) / this.cellSize);
    const maxCY = Math.floor((cy + radius) / this.cellSize);

    for (let gx = minCX; gx <= maxCX; gx++) {
      for (let gy = minCY; gy <= maxCY; gy++) {
        const key = (gx << 16) ^ gy;
        const bucket = this.cells.get(key);
        if (!bucket) continue;
        for (const entity of bucket) {
          const dx = entity.x - cx;
          const dy = entity.y - cy;
          if (dx * dx + dy * dy <= r2) {
            results.push(entity);
          }
        }
      }
    }
    return results;
  }
}
