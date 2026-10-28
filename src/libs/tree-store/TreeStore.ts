export type TreeId = string | number

export interface TreeItem {
  id: TreeId
  parent: TreeId | null
}

export class TreeStore<T extends TreeItem = TreeItem> {
  private items = new Map<TreeId, T>()
  private children = new Map<TreeId | null, Map<TreeId, T>>()
  private parents = new Map<TreeId, TreeId | null>()

  constructor(items: readonly T[]) {
    this.setItems(items)
  }

  getAll(): T[] {
    return Array.from(this.items.values())
  }

  getItem(id: TreeId): T | undefined {
    return this.items.get(id)
  }

  getChildren(id: TreeId): T[] {
    return Array.from(this.children.get(id)?.values() ?? [])
  }

  getAllChildren(id: TreeId): T[] {
    const result: T[] = []
    const stack = this.getChildren(id).reverse()

    while (stack.length > 0) {
      const item = stack.pop()
      if (!item) break
      result.push(item)
      const children = this.getChildren(item.id)
      for (const child of children.reverse()) {
        stack.push(child)
      }
    }

    return result
  }

  getAllParents(id: TreeId): T[] {
    const result: T[] = []
    let item = this.items.get(id)

    while (item) {
      result.push(item)
      item = item.parent === null ? undefined : this.items.get(item.parent)
    }

    return result
  }

  setItems(items: readonly T[]): void {
    this.items.clear()
    this.children.clear()
    this.parents.clear()
    for (const item of items) {
      this.addItem(item)
    }
  }

  addItem(item: T): void {
    this.items.set(item.id, item)
    this.parents.set(item.id, item.parent)
    let siblings = this.children.get(item.parent)
    if (!siblings) {
      siblings = new Map()
      this.children.set(item.parent, siblings)
    }
    siblings.set(item.id, item)
  }

  removeItem(id: TreeId): void {
    const item = this.items.get(id)
    if (!item) return

    const parentId = this.parents.get(id)
    if (parentId !== undefined) this.children.get(parentId)?.delete(id)
    const stack = [id]
    while (stack.length > 0) {
      const currentId = stack.pop()
      if (currentId === undefined) break
      const children = this.children.get(currentId)
      if (children) {
        for (const childId of children.keys()) stack.push(childId)
        this.children.delete(currentId)
      }
      this.items.delete(currentId)
      this.parents.delete(currentId)
    }
  }

  updateItem(item: T): void {
    const previous = this.items.get(item.id)
    if (!previous) return

    const previousParent = this.parents.get(item.id)
    if (previousParent === undefined) throw new Error('Missing parent index')
    if (previousParent !== item.parent) {
      this.children.get(previousParent)?.delete(item.id)
    }
    this.addItem(item)
  }
}
