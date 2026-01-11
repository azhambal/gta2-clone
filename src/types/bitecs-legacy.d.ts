declare module 'bitecs/legacy' {
  export type IWorld = any;
  export type eid = number;

  export function createWorld(): IWorld;
  export function resetWorld(world: IWorld): void;

  export function addEntity(world: IWorld): eid;
  export function addComponent(world: IWorld, component: any, eid: eid): void;

  export function defineComponent(schema: Record<string, any>): any;
  export function defineQuery(components: any[]): any;
  export function defineSystem(fn: (world: IWorld, dt: number) => IWorld): any;

  export const Types: {
    f32: any;
    ui8: any;
    ui16: any;
    ui32: any;
    eid: any;
  };
}
