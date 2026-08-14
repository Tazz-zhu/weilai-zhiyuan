/* 我的模拟人生路 · 网格寻路：让居民沿道路行走，不穿墙 */
(function () {
  'use strict';

  const CELL = 40;
  const ROADS = [
    { axis: 'h', pos: 244 }, { axis: 'h', pos: 486 }, { axis: 'h', pos: 736 },
    { axis: 'v', pos: 342 }, { axis: 'v', pos: 672 }, { axis: 'v', pos: 942 }, { axis: 'v', pos: 1242 }
  ];

  class TownPath {
    constructor(world, buildings) {
      this.world = world;
      this.cell = CELL;
      this.cols = Math.ceil(world.w / CELL);
      this.rows = Math.ceil(world.h / CELL);
      this.buildings = buildings;
      this.doors = {};
      this.blocked = new Uint8Array(this.cols * this.rows);
      this.buildGrid();
    }

    buildGrid() {
      const { cols, rows, cell } = this;
      // 地图边界
      for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) {
        const cx = x * cell + cell / 2, cy = y * cell + cell / 2;
        if (cx < 10 || cy < 10 || cx > this.world.w - 10 || cy > this.world.h - 10) this.blocked[y * cols + x] = 1;
      }
      // 建筑占位
      this.buildings.forEach(b => {
        for (let x = Math.floor(b.x / cell); x < Math.ceil((b.x + b.w) / cell); x++) {
          for (let y = Math.floor(b.y / cell); y < Math.ceil((b.y + b.h) / cell); y++) {
            if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
            this.blocked[y * cols + x] = 1;
          }
        }
      });
      // 门：选择离道路最近的一边中点，并把门所在格设为可走
      this.buildings.forEach(b => {
        const edge = this.nearestEdge(b);
        this.doors[b.id] = edge;
        const dc = this.cellAt(edge.x, edge.y);
        if (dc) this.blocked[dc.y * cols + dc.x] = 0;
      });
    }

    nearestEdge(b) {
      const candidates = [
        { x: b.x + b.w / 2, y: b.y - 6, d: this.roadDist(b.x + b.w / 2, b.y - 6) },
        { x: b.x + b.w / 2, y: b.y + b.h + 6, d: this.roadDist(b.x + b.w / 2, b.y + b.h + 6) },
        { x: b.x - 6, y: b.y + b.h / 2, d: this.roadDist(b.x - 6, b.y + b.h / 2) },
        { x: b.x + b.w + 6, y: b.y + b.h / 2, d: this.roadDist(b.x + b.w + 6, b.y + b.h / 2) }
      ];
      candidates.sort((a, b) => a.d - b.d);
      return candidates[0];
    }

    roadDist(x, y) {
      let best = Infinity;
      for (const r of ROADS) {
        const d = r.axis === 'h' ? Math.abs(y - r.pos) : Math.abs(x - r.pos);
        if (d < best) best = d;
      }
      return best;
    }

    cellAt(x, y) {
      const cx = Math.floor(x / this.cell), cy = Math.floor(y / this.cell);
      if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return null;
      return { x: cx, y: cy };
    }

    isBlocked(cx, cy) {
      if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return true;
      return this.blocked[cy * this.cols + cx] === 1;
    }

    center(cx, cy) { return { x: cx * this.cell + this.cell / 2, y: cy * this.cell + this.cell / 2 }; }

    /* A* 寻路：返回格心坐标数组（不含起点） */
    findPath(sx, sy, tx, ty) {
      const sc = this.cellAt(sx, sy), tc = this.cellAt(tx, ty);
      if (!sc || !tc) return null;
      if (sc.x === tc.x && sc.y === tc.y) return [];
      const { cols, rows } = this;
      const idx = (x, y) => y * cols + x;
      const open = [sc];
      const g = new Map(); g.set(idx(sc.x, sc.y), 0);
      const came = new Map();
      const seen = new Set(); seen.add(idx(sc.x, sc.y));
      const h = (x, y) => Math.abs(x - tc.x) + Math.abs(y - tc.y);
      const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
      let guard = 0;
      while (open.length && guard++ < 3000) {
        open.sort((a, b) => (g.get(idx(a.x,a.y)) + h(a.x,a.y)) - (g.get(idx(b.x,b.y)) + h(b.x,b.y)));
        const cur = open.shift();
        const ci = idx(cur.x, cur.y);
        if (cur.x === tc.x && cur.y === tc.y) {
          const path = [];
          let node = cur;
          while (node) {
            path.push(this.center(node.x, node.y));
            node = came.get(idx(node.x, node.y));
          }
          path.pop(); // 去掉起点
          return path.reverse();
        }
        for (const [dx, dy] of dirs) {
          const nx = cur.x + dx, ny = cur.y + dy;
          if (this.isBlocked(nx, ny)) continue;
          if (dx !== 0 && dy !== 0) {
            // 斜向：不允许穿角
            if (this.isBlocked(cur.x + dx, cur.y) && this.isBlocked(cur.x, cur.y + dy)) continue;
          }
          const ni = idx(nx, ny);
          const ng = g.get(ci) + (dx !== 0 && dy !== 0 ? 1.414 : 1);
          if (!g.has(ni) || ng < g.get(ni)) {
            g.set(ni, ng);
            came.set(ni, cur);
            if (!seen.has(ni)) { seen.add(ni); open.push({ x: nx, y: ny }); }
          }
        }
      }
      return null;
    }
  }

  window.TownPath = TownPath;
})();

