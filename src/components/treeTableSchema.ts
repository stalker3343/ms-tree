import { z } from 'zod'

const idSchema = z.union([z.string(), z.number()])

const treeNodeSchema = z.looseObject({
  id: idSchema,
  parent: idSchema.nullable(),
  label: z.string(),
})

export const treeTableNodesSchema = z.array(treeNodeSchema)
export type TreeTableNode = z.infer<typeof treeNodeSchema>
