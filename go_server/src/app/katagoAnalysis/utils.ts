// utils.ts
import * as path from 'path';
import * as fs from 'fs';

// TypeScript中的泛型类型
type T = any;

// 将一维数组转换为二维网格格式
function varToGrid<T>(arrayVar: T[], size: [number, number]): T[][] {
    let ix = 0;
    const grid: T[][] = Array(size[1]);
    for (let y = size[1] - 1; y >= 0; y--) {
        grid[y] = arrayVar.slice(ix, ix + size[0]);
        ix += size[0];
    }
    return grid;
}

// 根据失去的点数和阈值确定评估等级
function evaluationClass(pointsLost: number, evalThresholds: number[]): number {
    let i = 0;
    while (i < evalThresholds.length - 1 && pointsLost < evalThresholds[i]) {
        i++;
    }
    return i;
}

// 打包浮点数数组
function packFloats(floatList: number[] | null): ArrayBuffer {
    if (floatList === null) {
        return new ArrayBuffer(0);
    }

    const buffer = new ArrayBuffer(floatList.length * 4); // Float32 uses 4 bytes
    const view = new DataView(buffer);
    for (let i = 0; i < floatList.length; i++) {
        view.setFloat32(i * 4, floatList[i], true); // little endian
    }
    return buffer;
}

// 解包浮点数数组
function unpackFloats(buffer: ArrayBuffer, num: number): number[] | null {
    if (buffer.byteLength === 0) {
        return null;
    }

    const view = new DataView(buffer);
    const result: number[] = [];
    for (let i = 0; i < num; i++) {
        result.push(view.getFloat32(i * 4, true)); // little endian
    }
    return result;
}

// 格式化访问次数
function formatVisits(n: number): string {
    if (n < 1000) {
        return n.toString();
    }
    if (n < 1e5) {
        return `${(n / 1000).toFixed(1)}k`;
    }
    if (n < 1e6) {
        return `${Math.round(n / 1000)}k`;
    }
    return `${Math.round(n / 1e6)}M`;
}

// 截断JSON中的大数组
function jsonTruncateArrays(data: any, lim: number = 20): any {
    if (Array.isArray(data)) {
        if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null && !Array.isArray(data[0])) {
            return data.map(d => jsonTruncateArrays(d));
        }
        if (data.length > lim) {
            return [`${data.length} x ${data.length > 0 ? typeof data[0] : 'unknown'}`];
        }
        return data;
    } else if (typeof data === 'object' && data !== null) {
        const result: { [key: string]: any } = {};
        for (const [k, v] of Object.entries(data)) {
            result[k] = jsonTruncateArrays(v);
        }
        return result;
    } else {
        return data;
    }
}

// 带权重的无放回选择
function weightedSelectionWithoutReplacement(items: [number, ...T][], pickN: number): [number, ...T][] {
    // 对每个项目计算权重（使用对数技巧）
    const elt: [number, T][] = items.map(item => [
        Math.log(Math.random()) / (item[0] + 1e-18),
        item
    ]);

    // 按权重排序并选择前pickN个
    elt.sort((a, b) => b[0] - a[0]);
    return elt.slice(0, Math.min(pickN, elt.length)).map(e => e[1]);
}

// 导出所有函数
export {
    varToGrid,
    evaluationClass,
    packFloats,
    unpackFloats,
    formatVisits,
    jsonTruncateArrays,
    weightedSelectionWithoutReplacement
};