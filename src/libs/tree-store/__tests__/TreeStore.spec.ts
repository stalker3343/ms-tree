import { describe, expect, it } from 'vitest'
import { TreeStore, type TreeItem } from '../TreeStore'

interface Item extends TreeItem {
  label: string
}

function sampleItems(): Item[] {
  return [
    { id: 1, parent: null, label: '1' },
    { id: '2', parent: 1, label: '2' },
    { id: 3, parent: 1, label: '3' },
    { id: 4, parent: '2', label: '4' },
    { id: 5, parent: '2', label: '5' },
    { id: 6, parent: 4, label: '6' },
  ]
}

describe('TreeStore', () => {
  it('finds items and traverses the tree in the specified order', () => {
    const items = sampleItems()
    const store = new TreeStore(items)
    expect(store.getAll()).toEqual(items)
    expect(store.getItem('2')).toEqual(items[1])
    expect(store.getItem(2)).toBeUndefined()
    expect(store.getChildren(1).map((item) => item.id)).toEqual(['2', 3])
    expect(store.getAllChildren(1).map((item) => item.id)).toEqual(['2', 4, 6, 5, 3])
    expect(store.getAllParents(6).map((item) => item.id)).toEqual([6, 4, '2', 1])
    expect(store.getAllParents(1).map((item) => item.id)).toEqual([1])
    expect(store.getChildren(999)).toEqual([])
    expect(store.getAllChildren(999)).toEqual([])
    expect(store.getAllParents(999)).toEqual([])
  })

  it('replaces all data and keeps returned arrays independent', () => {
    const store = new TreeStore(sampleItems())
    store.getAll().pop()
    store.getChildren(1).pop()
    expect(store.getAll()).toHaveLength(6)
    expect(store.getChildren(1)).toHaveLength(2)
    const replacement: Item[] = [{ id: 'new', parent: null, label: 'new' }]
    store.setItems(replacement)
    expect(store.getAll()).toEqual(replacement)
    expect(store.getItem(1)).toBeUndefined()
    expect(store.getChildren(1)).toEqual([])
  })

  it('adds, replaces and moves items with their descendants', () => {
    const store = new TreeStore(sampleItems())
    store.addItem({ id: 7, parent: 3, label: '7' })
    store.updateItem({ id: '2', parent: 3, label: 'updated' })
    expect(store.getChildren(1).map((item) => item.id)).toEqual([3])
    expect(store.getChildren(3).map((item) => item.id)).toEqual([7, '2'])
    expect(store.getAllParents(6).map((item) => item.id)).toEqual([6, 4, '2', 3, 1])
    expect(store.getItem('2')?.label).toBe('updated')
    store.updateItem({ id: 7, parent: 3, label: 'changed' })
    expect(store.getChildren(3)[0]?.label).toBe('changed')
    store.updateItem({ id: 999, parent: null, label: 'missing' })
    expect(store.getItem(999)).toBeUndefined()
  })

  it('removes an entire subtree and leaves other branches intact', () => {
    const store = new TreeStore(sampleItems())
    store.removeItem('2')
    expect(store.getAll().map((item) => item.id)).toEqual([1, 3])
    expect(store.getChildren(1).map((item) => item.id)).toEqual([3])
    expect(store.getChildren(4)).toEqual([])
    store.removeItem(999)
    store.removeItem(1)
    expect(store.getAll()).toEqual([])
  })

  it('updates parent indexes when the stored object was mutated before updateItem', () => {
    const store = new TreeStore(sampleItems())
    const item = store.getItem('2')!
    item.parent = 3
    store.updateItem(item)

    expect(store.getChildren(1).map((child) => child.id)).toEqual([3])
    expect(store.getChildren(3).map((child) => child.id)).toEqual(['2'])
    expect(store.getAllParents(6).map((parent) => parent.id)).toEqual([6, 4, '2', 3, 1])
    store.removeItem('2')
    expect(store.getChildren(3)).toEqual([])
    expect(store.getAll().map((remaining) => remaining.id)).toEqual([1, 3])
  })

  it('handles a deep tree without recursive calls', () => {
    const items: Item[] = Array.from({ length: 10000 }, (_, id) => ({
      id,
      parent: id === 0 ? null : id - 1,
      label: String(id),
    }))
    const store = new TreeStore(items)
    expect(store.getAllChildren(0)).toHaveLength(9999)
    expect(store.getAllParents(9999)).toHaveLength(10000)
    store.removeItem(0)
    expect(store.getAll()).toEqual([])
  })
})
