import { z } from 'zod'

export const confessionSchema = z.object({
  content: z
    .string()
    .min(1, 'Confession cannot be empty')
    .max(300, 'Confession must be 300 characters or less'),
})

export type ConfessionInput = z.infer<typeof confessionSchema>
