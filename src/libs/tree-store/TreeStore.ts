export type TreeId = string | number

export interface TreeItem {
  id: TreeId
  parent: TreeId | null
}

/** Хранит корректное дерево с уникальными id; объекты элементов передаются по ссылке. */
export class TreeStore<T extends TreeItem = TreeItem> {
  private items = new Map<TreeId, T>()
  private children = new Map<TreeId | null, Map<TreeId, T>>()
  private parents = new Map<TreeId, TreeId | null>()

  /** Создаёт хранилище из массива элементов. */
  constructor(items: readonly T[]) {
    this.setItems(items)
  }

  /** Возвращает все элементы в порядке добавления. */
  getAll(): T[] {
    return Array.from(this.items.values())
  }

  /** Возвращает элемент по id или undefined, если он не найден. */
  getItem(id: TreeId): T | undefined {
    return this.items.get(id)
  }

  /** Возвращает непосредственных потомков в порядке добавления. */
  getChildren(id: TreeId): T[] {
    return Array.from(this.children.get(id)?.values() ?? [])
  }

  /** Возвращает всех потомков в порядке обхода дерева в глубину. */
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

  /** Возвращает путь от самого элемента до корня включительно. */
  getAllParents(id: TreeId): T[] {
    const result: T[] = []
    let item = this.items.get(id)

    while (item) {
      result.push(item)
      item = item.parent === null ? undefined : this.items.get(item.parent)
    }

    return result
  }

  /** Полностью заменяет содержимое хранилища. */
  setItems(items: readonly T[]): void {
    this.items.clear()
    this.children.clear()
    this.parents.clear()
    for (const item of items) {
      this.addItem(item)
    }
  }

  /** Добавляет элемент с уникальным id. */
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

  /** Удаляет элемент и всех его потомков; отсутствующий id игнорируется. */
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

  /** Заменяет существующий элемент; при изменении parent перемещает его ветку. */
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
