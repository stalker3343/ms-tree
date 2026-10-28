import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import TreeTable from '../TreeTable.vue'

const gridStub = defineComponent({
  name: 'AgGridVue',
  props: ['rowData', 'loading'],
  template: '<div />',
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('TreeTable', () => {
  it('shows loading until two seconds have passed, then displays the fetched tree', async () => {
    vi.useFakeTimers()
    const items = [
      { id: 1, parent: null, label: 'Корень' },
      { id: '1', parent: 1, label: 'Дочерний' },
    ]
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => items })
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = mount(TreeTable, { global: { stubs: { AgGridVue: gridStub } } })
    const grid = wrapper.getComponent(gridStub)

    expect(fetchMock).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}items.json`)
    expect(grid.props('loading')).toBe(true)
    expect(grid.props('rowData')).toEqual([])
    await vi.advanceTimersByTimeAsync(1999)
    expect(grid.props('loading')).toBe(true)
    await vi.advanceTimersByTimeAsync(1)
    await flushPromises()

    expect(grid.props('loading')).toBe(false)
    expect(grid.props('rowData')).toEqual([
      { ...items[0], rowId: 'number:1', parentRowId: null, category: 'Группа' },
      { ...items[1], rowId: 'string:1', parentRowId: 'number:1', category: 'Элемент' },
    ])
    wrapper.unmount()
  })

  it('shows an error when the request fails', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    const wrapper = mount(TreeTable, { global: { stubs: { AgGridVue: gridStub } } })

    await vi.advanceTimersByTimeAsync(2000)
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('Не удалось загрузить данные.')
    expect(wrapper.findComponent(gridStub).exists()).toBe(false)
    wrapper.unmount()
  })
})
