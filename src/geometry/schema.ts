import * as z from 'zod/mini';

export const vec4Schema = z.readonly(z.tuple([z.number(), z.number(), z.number(), z.number()]));

const faceSchema = z.readonly(z.array(z.int().check(z.nonnegative())).check(z.minLength(3)));

export const polytopeSourceSchema = z
  .object({
    vertices: z.readonly(z.array(vec4Schema)),
    faces: z.readonly(z.array(faceSchema)),
  })
  .check(
    z.superRefine((data, ctx) => {
      data.faces.forEach((face, faceIndex) => {
        face.forEach((vertexIndex, position) => {
          if (vertexIndex >= data.vertices.length) {
            ctx.addIssue({
              code: 'custom',
              path: ['faces', faceIndex, position],
              message: `vertex index ${String(vertexIndex)} is outside 0..${String(data.vertices.length - 1)}`,
            });
          }
        });
      });
    }),
  );

export const polytopeGraphDataSchema = z.extend(polytopeSourceSchema, {
  name: z.string().check(z.minLength(1)),
});

export const graphsFileSchema = z.record(z.string(), polytopeGraphDataSchema);

export type Vec4 = z.infer<typeof vec4Schema>;
export type PolytopeSource = z.infer<typeof polytopeSourceSchema>;
export type PolytopeGraphData = z.infer<typeof polytopeGraphDataSchema>;
export type GraphsFile = z.infer<typeof graphsFileSchema>;
