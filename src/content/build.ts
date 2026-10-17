// A small builder so the content files read like the drives they describe.
//
// A tree is an object whose keys are names on screen:
//   'name/'  a folder, its value is another tree
//   'name*'  a tool, its value is the one-line help (the verb is the name) or a ToolData
//   'name'   a file, its value is its lines, or a FileData ({ lines, facts, light })
//
// In a file line, `{text|command}` is a clickable value: `rows={5|set rows 20}`.

import type { DeviceData, FactData, FileData, Node, PlaceData, ThingData, ToolData } from '../model/world';

export type Tree = { [name: string]: Tree | string[] | FileData | ToolData | string };

export class Builder {
  nodes: Record<string, Node> = {};

  add(n: Node): Node {
    if (this.nodes[n.id]) throw new Error(`duplicate node id ${n.id}`);
    this.nodes[n.id] = n;
    if (n.parent) (this.nodes[n.parent].children ??= []).push(n.id);
    return n;
  }

  /** fill `parentId` (a folder or device) with a tree; ids are "<prefix><path>" */
  tree(parentId: string, prefix: string, t: Tree): void {
    for (const [key, val] of Object.entries(t)) {
      if (key.endsWith('/')) {
        const name = key.slice(0, -1);
        const id = prefix + name;
        this.add({ id, kind: 'folder', name, parent: parentId, children: [] });
        this.tree(id, id + '/', val as Tree);
      } else if (key.endsWith('*')) {
        const name = key.slice(0, -1);
        const tool: ToolData = typeof val === 'string' ? { verb: name, help: val } : (val as ToolData);
        this.add({ id: prefix + name, kind: 'tool', name, parent: parentId, tool });
      } else {
        const lines: FileData = Array.isArray(val) ? { lines: val } : (val as FileData);
        this.add({ id: prefix + key, kind: 'file', name: key, parent: parentId, lines });
      }
    }
  }

  /** a device and its drive; the drive's nodes are "<id>/<path>" */
  drive(id: string, device: DeviceData, t: Tree): void {
    this.add({ id, kind: 'device', name: id, device, children: [] });
    this.tree(id, id + '/', t);
  }

  /** a place on the plain; its node id is "@<name>" */
  place(name: string, place: PlaceData): void {
    this.add({ id: '@' + name, kind: 'place', name, place });
  }

  /** a `?` in a frame; its node id is "?<name>" */
  thing(name: string, thing: ThingData): void {
    this.add({ id: '?' + name, kind: 'thing', name, thing });
  }

  /** a packet fact; its node id is "!<name>" */
  fact(name: string, fact: FactData): void {
    this.add({ id: '!' + name, kind: 'fact', name, fact });
  }
}
