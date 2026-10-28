<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import {
  CellStyleModule,
  ClientSideRowModelModule,
  LocaleModule,
  ModuleRegistry,
  RenderApiModule,
  RowStyleModule,
  themeQuartz,
  type ColDef,
  type GetRowIdParams,
  type RowGroupOpenedEvent,
} from 'ag-grid-community'
import { TreeDataModule } from 'ag-grid-enterprise'
import { TreeStore, type TreeId } from '../libs/tree-store/TreeStore'
import { treeTableNodesSchema, type TreeTableNode } from './treeTableSchema'

ModuleRegistry.registerModules([
  CellStyleModule,
  ClientSideRowModelModule,
  LocaleModule,
  RenderApiModule,
  RowStyleModule,
  TreeDataModule,
])

interface GridItem extends Pick<TreeTableNode, 'id' | 'parent' | 'label'> {
  rowId: RowId
  parentRowId: RowId | null
  category: string
}

function rowId(id: TreeId) {
  return `${typeof id}:${id}` as const
}

type RowId = ReturnType<typeof rowId>

const store = reactive(new TreeStore<TreeTableNode>([]))
const loading = ref(true)
const error = ref(false)
const rows = computed<GridItem[]>(() =>
  store.getAll().map((item) => ({
    ...item,
    rowId: rowId(item.id),
    parentRowId: item.parent === null ? null : rowId(item.parent),
    category: store.getChildren(item.id).length > 0 ? 'Группа' : 'Элемент',
  })),
)

const columns: ColDef<GridItem>[] = [
  {
    headerName: '№ п\\п',
    colId: 'rowNumber',
    width: 110,
    cellClass: 'row-number',
    valueGetter: ({ node }) => (node?.rowIndex == null ? '' : node.rowIndex + 1),
  },
  {
    headerName: 'Категория',
    field: 'category',
    showRowGroup: true,
    cellRenderer: 'agGroupCellRenderer',
    cellRendererParams: { suppressCount: true },
    flex: 1,
    minWidth: 220,
  },
  { headerName: 'Наименование', field: 'label', flex: 2, minWidth: 220 },
]

const theme = themeQuartz.withParams({
  fontFamily: 'Arial, sans-serif',
  fontSize: 16,
  foregroundColor: '#464646',
  headerBackgroundColor: '#ffffff',
  headerFontWeight: 700,
  rowBorder: { color: '#c4c4c4' },
  headerRowBorder: { color: '#c4c4c4' },
  spacing: 8,
})

function getRowId(params: GetRowIdParams<GridItem>) {
  return params.data.rowId
}

function refreshRowNumbers(event: RowGroupOpenedEvent<GridItem>) {
  // После сворачивания AgGrid меняет rowIndex, но не пересчитывает уже показанные номера.
  requestAnimationFrame(() => event.api.refreshCells({ columns: ['rowNumber'], force: true }))
}

onMounted(async () => {
  try {
    const [response] = await Promise.all([
      fetch(`${import.meta.env.BASE_URL}items.json`),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ])
    if (!response.ok) throw new Error('Failed to load items')
    store.setItems(treeTableNodesSchema.parse(await response.json()))
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <p v-if="error" role="alert">Не удалось загрузить данные.</p>
  <AgGridVue
    v-else
    class="tree-grid"
    :theme="theme"
    :column-defs="columns"
    :default-col-def="{ sortable: false, resizable: false }"
    :row-data="rows"
    :row-class-rules="{ 'group-row': (params) => params.data?.category === 'Группа' }"
    :loading="loading"
    :locale-text="{ loadingOoo: 'Загрузка...' }"
    :tree-data="true"
    tree-data-parent-id-field="parentRowId"
    tree-data-display-type="custom"
    :get-row-id="getRowId"
    :grid-options="{ onRowGroupOpened: refreshRowNumbers }"
    :group-default-expanded="-1"
    :row-height="80"
    :header-height="80"
    dom-layout="autoHeight"
  />
</template>
